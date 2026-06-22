import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRooms, addRoom, updateRoom, deleteRoom } from '../services/roomService';
import { getAllBookings, updateBookingStatus } from '../services/bookingService';
import { getUserProfile } from '../services/authService';
import { uploadRoomImage } from '../services/storageService';
import { getHotelSettings, updateHotelSettings, createSubaccount } from '../services/hotelSettingsService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './DashboardPage.css';

const tabs = [
  { key: 'overview', label: 'Overview', icon: 'fa-chart-pie' },
  { key: 'rooms', label: 'Rooms', icon: 'fa-bed' },
  { key: 'bookings', label: 'Bookings', icon: 'fa-calendar-alt' },
  { key: 'payments', label: 'Payments', icon: 'fa-credit-card' },
  { key: 'settings', label: 'Settings', icon: 'fa-cog' }
];

const categories = ['standard', 'deluxe', 'suite', 'penthouse'];

const initialRoomForm = {
  title: '', description: '', category: 'standard', pricePerNight: '',
  maxGuests: '', images: '', amenities: '', isAvailable: true
};

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    getRooms().then(setRooms);
    getAllBookings().then(setBookings);
    getHotelSettings().then((s) => {
      setHotelSettings(s);
      if (s) setSettingsForm({ ...s });
    });
  }, []);

  useEffect(() => {
    if (user?.id) {
      getUserProfile(user.id).then((p) => {
        if (p && p.role !== profile?.role) setProfile(p);
      });
    }
  }, [user?.id]);

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState(initialRoomForm);
  const [roomFormErrors, setRoomFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef(null);
  const [bookingSearch, setBookingSearch] = useState('');
  const [hotelSettings, setHotelSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [subaccountMessage, setSubaccountMessage] = useState(null);
  const [subaccountLoading, setSubaccountLoading] = useState(false);

  const paidOrConfirmedBookings = useMemo(
    () => (bookings || []).filter((b) => ['paid', 'confirmed', 'checked_in', 'checked_out'].includes(b.status)),
    [bookings]
  );

  const totalRevenue = useMemo(
    () => paidOrConfirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    [paidOrConfirmedBookings]
  );

  const pendingAmount = useMemo(
    () => (bookings || []).filter((b) => b.status === 'pending').reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    [bookings]
  );

  const activeGuests = useMemo(() => {
    const active = (bookings || []).filter(
      (b) => b.status === 'confirmed' || b.status === 'paid' || b.status === 'checked_in'
    );
    const unique = new Set(active.map((b) => b.userId || b.guestEmail));
    return unique.size;
  }, [bookings]);

  const chartData = useMemo(() => {
    const monthly = months.map(() => 0);
    (paidOrConfirmedBookings || []).forEach((b) => {
      const d = b.createdAt?.toDate?.() || new Date(b.createdAt);
      const m = d.getMonth();
      if (m >= 0 && m < 6) monthly[m] += b.totalPrice || 0;
    });
    return monthly;
  }, [paidOrConfirmedBookings]);

  const maxChart = Math.max(...chartData, 1);

  if (!user || !profile || profile.role !== 'admin') {
    return (
      <div className="dashboard-access-denied">
        <h2>Access Denied</h2>
        <p>You do not have permission to access the admin dashboard.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    );
  }

  const handleOpenRoomModal = (room = null) => {
    if (room) {
      setEditingRoom(room);
      setRoomForm({
        title: room.title || '',
        description: room.description || '',
        category: room.category || 'standard',
        pricePerNight: room.pricePerNight?.toString() || '',
        maxGuests: room.maxGuests?.toString() || '',
        images: '',
        amenities: (room.amenities || []).join(', '),
        isAvailable: room.isAvailable !== false
      });
      setImagePreviews((room.images || []).map((url, i) => ({
        id: `img-${i}-${Date.now()}`,
        url,
        file: null
      })));
    } else {
      setEditingRoom(null);
      setRoomForm(initialRoomForm);
      setImagePreviews([]);
    }
    setRoomFormErrors({});
    setRoomModalOpen(true);
  };

  const handleRoomFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRoomForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (roomFormErrors[name]) {
      setRoomFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateRoomForm = () => {
    const errs = {};
    if (!roomForm.title.trim()) errs.title = 'Room name is required';
    if (!roomForm.pricePerNight || Number(roomForm.pricePerNight) <= 0) errs.pricePerNight = 'Valid price is required';
    if (!roomForm.maxGuests || Number(roomForm.maxGuests) <= 0) errs.maxGuests = 'Max guests is required';
    return errs;
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    const errs = validateRoomForm();
    if (Object.keys(errs).length > 0) {
      setRoomFormErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const uploadedUrls = [];
      for (const p of imagePreviews) {
        if (p.file) {
          try {
            const url = await uploadRoomImage(p.file);
            uploadedUrls.push(url);
          } catch (e) {
            console.warn('Image upload failed:', e);
            addToast('Image upload failed: ' + e.message, 'error');
            throw e;
          }
        } else {
          uploadedUrls.push(p.url);
        }
      }

      const data = {
        title: roomForm.title.trim(),
        description: roomForm.description.trim(),
        category: roomForm.category,
        pricePerNight: Number(roomForm.pricePerNight),
        maxGuests: Number(roomForm.maxGuests),
        images: uploadedUrls,
        image: uploadedUrls[0] || '',
        amenities: roomForm.amenities.split(',').map((a) => a.trim()).filter(Boolean),
        isAvailable: roomForm.isAvailable
      };

      if (editingRoom) {
        await updateRoom(editingRoom.id, data);
        addToast('Room updated successfully', 'success');
      } else {
        await addRoom(data);
        addToast('Room added successfully', 'success');
      }

      setRoomModalOpen(false);
      const fresh = await getRooms();
      setRooms(fresh);
    } catch (e) {
      addToast('Failed to save room: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteRoom(id);
      addToast('Room deleted', 'success');
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch {
      addToast('Failed to delete room', 'error');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateBookingStatus(id, status);
      addToast(`Booking status updated to ${status}`, 'success');
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  const handleDeleteSubaccount = async () => {
    if (!window.confirm('Remove subaccount configuration? This will not delete the subaccount on Paystack.')) return;
    try {
      await updateHotelSettings({
        ...settingsForm,
        subaccountCode: '',
        subaccountStatus: '',
      });
      const fresh = await getHotelSettings();
      if (fresh) {
        setHotelSettings(fresh);
        setSettingsForm({ ...fresh });
      }
      setSubaccountMessage({ type: 'success', text: 'Subaccount code removed' });
      addToast('Subaccount removed', 'success');
    } catch {
      addToast('Failed to remove', 'error');
    }
  };

  const handleCreateSubaccount = async () => {
    setSubaccountMessage(null);
    setSubaccountLoading(true);
    try {
      const result = await createSubaccount(settingsForm);
      const fresh = await getHotelSettings();
      if (fresh) {
        setHotelSettings(fresh);
        setSettingsForm({ ...fresh });
      }
      setSubaccountMessage({ type: 'success', text: result.message });
      addToast(result.message, 'success');
    } catch (e) {
      setSubaccountMessage({ type: 'error', text: e.message });
      addToast(e.message, 'error');
    } finally {
      setSubaccountLoading(false);
    }
  };

  const renderOverview = () => {
    const totalRooms = rooms ? rooms.length : 0;
    const totalBookings = bookings ? bookings.length : 0;

    return (
      <div>
        <div className="dashboard-stats">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon"><i className="fas fa-bed"></i></div>
            <div className="dashboard-stat-label">Total Rooms</div>
            <div className="dashboard-stat-value">{totalRooms}</div>
            <div className="dashboard-stat-sub"><i className="fas fa-circle" style={{ fontSize: 6, color: 'var(--success)' }}></i> {rooms ? rooms.filter(r => r.isAvailable !== false).length : 0} available</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon"><i className="fas fa-calendar-alt"></i></div>
            <div className="dashboard-stat-label">Total Bookings</div>
            <div className="dashboard-stat-value">{totalBookings}</div>
            <div className="dashboard-stat-sub"><i className="fas fa-circle" style={{ fontSize: 6, color: '#eab308' }}></i> {bookings ? bookings.filter(b => b.status === 'pending').length : 0} pending</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon"><i className="fas fa-cedi-sign"></i></div>
            <div className="dashboard-stat-label">Revenue</div>
            <div className="dashboard-stat-value gold">GHS {totalRevenue.toLocaleString()}</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon"><i className="fas fa-users"></i></div>
            <div className="dashboard-stat-label">Guests</div>
            <div className="dashboard-stat-value">{activeGuests}</div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Revenue <span className="text-muted">(Last 6 Months)</span></h2>
          </div>
          <div className="dashboard-chart">
            {chartData.map((val, i) => (
              <div key={i} className="dashboard-chart-bar-wrap">
                <div
                  className="dashboard-chart-bar"
                  style={{ height: `${(val / maxChart) * 100}%` }}
                  title={`GHS ${val.toLocaleString()}`}
                />
                <span className="dashboard-chart-label">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Recent Bookings</h2>
          </div>
          <div className="dashboard-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings && bookings.length > 0 ? (
                  bookings.slice(0, 5).map((b) => (
                    <tr key={b.id}>
                      <td>{b.guestName || b.userEmail || 'N/A'}</td>
                      <td>{b.roomName || b.roomId}</td>
                      <td>{formatDate(b.checkIn)}</td>
                      <td>{formatDate(b.checkOut)}</td>
                      <td>GHS {b.totalPrice?.toLocaleString() || 0}</td>
                      <td>
                        <span className={`dashboard-status-badge ${b.status || 'pending'}`}>
                          {b.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No bookings yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderRooms = () => (
    <div>
      <div className="dashboard-section-header">
        <h2>All Rooms</h2>
        <button className="btn btn-primary btn-sm" onClick={() => handleOpenRoomModal()}>
          <i className="fas fa-plus"></i> Add Room
        </button>
      </div>
      <div className="dashboard-rooms-grid">
        {rooms && rooms.length > 0 ? (
          rooms.map((r) => (
            <div key={r.id} className="dashboard-room-card glass-card">
              {r.image || (r.images && r.images[0]) ? (
                <img
                  src={r.image || (r.images && r.images[0])}
                  alt={r.title}
                  className="dashboard-room-image"
                />
              ) : (
                <div className="dashboard-room-image" style={{ background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-image" style={{ color: 'var(--text-muted)', fontSize: '2rem' }} />
                </div>
              )}
              <div className="dashboard-room-body">
                <h3 className="dashboard-room-title">{r.title}</h3>
                <span className="dashboard-room-cat">{r.category}</span>
                <div className="dashboard-room-price">GHS {r.pricePerNight?.toLocaleString() || 0} / night</div>
                <div className="dashboard-room-meta">
                  <span><i className="fas fa-user-friends"></i> {r.maxGuests || 2}</span>
                  <span className={`dashboard-status-badge ${r.isAvailable !== false ? 'available' : 'busy'}`}>
                    {r.isAvailable !== false ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="dashboard-room-actions">
                  <button className="dashboard-action-btn edit" onClick={() => handleOpenRoomModal(r)}>
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button className="dashboard-action-btn delete" onClick={() => handleDeleteRoom(r.id, r.title)}>
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <h3>No rooms found</h3>
            <p>Add your first room to get started.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderBookings = () => {
    const filtered = bookingSearch.trim()
      ? bookings.filter(b =>
          (b.bookingRef || '').toLowerCase().includes(bookingSearch.toLowerCase()) ||
          (b.guestEmail || '').toLowerCase().includes(bookingSearch.toLowerCase()) ||
          (b.guestPhone || '').includes(bookingSearch) ||
          (b.guestName || '').toLowerCase().includes(bookingSearch.toLowerCase())
        )
      : bookings;

    return (
      <div>
        <div className="dashboard-section-header">
          <h2>All Bookings</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-input"
              style={{ width: 260, padding: '6px 12px', fontSize: '0.85rem' }}
              placeholder="Search by name, email, phone, or ref..."
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="dashboard-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Contact</th>
                <th>Room</th>
                <th>Ref</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Guests</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{b.guestName || 'N/A'}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      <div>{b.guestEmail}</div>
                      {b.guestPhone && <div style={{ color: 'var(--text-muted)' }}>{b.guestPhone}</div>}
                    </td>
                    <td>{b.roomName || b.roomId}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {b.bookingRef || '-'}
                    </td>
                    <td>{formatDate(b.checkIn)}</td>
                    <td>{formatDate(b.checkOut)}</td>
                    <td>{b.guests || '-'}</td>
                    <td>GHS {b.totalPrice?.toLocaleString() || 0}</td>
                    <td>
                      <span className={`dashboard-status-badge ${b.status || 'pending'}`}>
                        {b.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      <div className="dashboard-action-group">
                        {b.status === 'paid' && (
                          <button className="dashboard-action-btn edit" onClick={() => handleStatusUpdate(b.id, 'confirmed')}>
                            Confirm
                          </button>
                        )}
                        {b.status === 'confirmed' && (
                          <button className="dashboard-action-btn edit" onClick={() => handleStatusUpdate(b.id, 'checked_in')}>
                            Check In
                          </button>
                        )}
                        {b.status === 'checked_in' && (
                          <button className="dashboard-action-btn edit" onClick={() => handleStatusUpdate(b.id, 'checked_out')}>
                            Check Out
                          </button>
                        )}
                        {(b.status === 'pending' || b.status === 'paid' || b.status === 'confirmed') && (
                          <button className="dashboard-action-btn delete" onClick={() => handleStatusUpdate(b.id, 'cancelled')}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {bookingSearch ? 'No bookings match your search' : 'No bookings found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPayments = () => {
    const totalCollected = paidOrConfirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    return (
      <div>
        <div className="dashboard-payment-summary">
          <div className="dashboard-payment-card glass-card">
            <div className="dashboard-payment-icon"><i className="fas fa-wallet"></i></div>
            <div className="dashboard-payment-label">Total Collected</div>
            <div className="dashboard-payment-value gold">GHS {totalCollected.toLocaleString()}</div>
          </div>
          <div className="dashboard-payment-card glass-card">
            <div className="dashboard-payment-icon"><i className="fas fa-clock"></i></div>
            <div className="dashboard-payment-label">Pending</div>
            <div className="dashboard-payment-value">GHS {pendingAmount.toLocaleString()}</div>
          </div>
          <div className="dashboard-payment-card glass-card">
            <div className="dashboard-payment-icon"><i className="fas fa-exchange-alt"></i></div>
            <div className="dashboard-payment-label">Transactions</div>
            <div className="dashboard-payment-value">{paidOrConfirmedBookings.length}</div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Payment History</h2>
          </div>
          <div className="dashboard-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Guest</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {paidOrConfirmedBookings.length > 0 ? (
                  paidOrConfirmedBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {b.paystackRef || b.paymentRef || b.id?.slice(0, 8)}
                      </td>
                      <td>{b.guestName || b.userEmail || 'N/A'}</td>
                      <td>GHS {b.totalPrice?.toLocaleString() || 0}</td>
                      <td>
                        <span className={`dashboard-status-badge ${b.status || 'paid'}`}>
                          {b.status === 'confirmed' ? 'Paid' : b.status || 'Paid'}
                        </span>
                      </td>
                      <td>{formatDate(b.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    if (!settingsForm) {
      return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Loading settings...</p>;
    }

    const handleChange = (field) => (e) => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setSettingsForm((prev) => ({ ...prev, [field]: val }));
    };

    const handleAmenitiesChange = (e) => {
      setSettingsForm((prev) => ({ ...prev, amenities: e.target.value.split(',').map((a) => a.trim()).filter(Boolean) }));
    };

    const handleSave = async () => {
      setSavingSettings(true);
      try {
        await updateHotelSettings(settingsForm);
        setHotelSettings({ ...settingsForm });
        addToast('Settings saved successfully', 'success');
      } catch {
        addToast('Failed to save settings', 'error');
      } finally {
        setSavingSettings(false);
      }
    };

    return (
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h2>Hotel Settings</h2>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={savingSettings}>
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.85rem' }}>
          These details are used by the chatbot and displayed across the site.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 800 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Hotel Name</label>
            <input className="form-input" value={settingsForm.hotelName} onChange={handleChange('hotelName')} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Tagline</label>
            <input className="form-input" value={settingsForm.tagline} onChange={handleChange('tagline')} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={settingsForm.description} onChange={handleChange('description')} />
          </div>

          <div className="form-group">
            <label className="form-label">Location / Address</label>
            <input className="form-input" value={settingsForm.location} onChange={handleChange('location')} />
          </div>
          <div className="form-group">
            <label className="form-label">Distance from Airport</label>
            <input className="form-input" value={settingsForm.airportDistance} onChange={handleChange('airportDistance')} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={settingsForm.phone} onChange={handleChange('phone')} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={settingsForm.email} onChange={handleChange('email')} />
          </div>
          <div className="form-group">
            <label className="form-label">Check-In Time</label>
            <input className="form-input" value={settingsForm.checkInTime} onChange={handleChange('checkInTime')} />
          </div>
          <div className="form-group">
            <label className="form-label">Check-Out Time</label>
            <input className="form-input" value={settingsForm.checkOutTime} onChange={handleChange('checkOutTime')} />
          </div>
          <div className="form-group">
            <label className="form-label">Restaurant Hours</label>
            <input className="form-input" value={settingsForm.restaurantHours} onChange={handleChange('restaurantHours')} />
          </div>
          <div className="form-group">
            <label className="form-label">Room Service</label>
            <input className="form-input" value={settingsForm.roomService} onChange={handleChange('roomService')} />
          </div>
          <div className="form-group">
            <label className="form-label">Parking Info</label>
            <input className="form-input" value={settingsForm.parkingInfo} onChange={handleChange('parkingInfo')} />
          </div>
          <div className="form-group">
            <label className="form-label">WiFi Info</label>
            <input className="form-input" value={settingsForm.wifiInfo} onChange={handleChange('wifiInfo')} />
          </div>
          <div className="form-group">
            <label className="form-label">Since Year</label>
            <input className="form-input" value={settingsForm.sinceYear} onChange={handleChange('sinceYear')} />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Amenities (comma-separated)</label>
            <input className="form-input" value={(settingsForm.amenities || []).join(', ')} onChange={handleAmenitiesChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Facebook URL</label>
            <input className="form-input" value={settingsForm.socialFacebook} onChange={handleChange('socialFacebook')} />
          </div>
          <div className="form-group">
            <label className="form-label">Instagram Handle</label>
            <input className="form-input" value={settingsForm.socialInstagram} onChange={handleChange('socialInstagram')} />
          </div>
        </div>

        <hr className="dashboard-divider" />

        <div className="dashboard-section-header">
          <h2>Payment Settings</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.85rem' }}>
          Configure Paystack subaccount so payments settle directly to your bank account or mobile money.
        </p>

        <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {settingsForm.subaccountCode && (
            <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>Subaccount:</span>
                <code style={{ fontSize: '0.85rem', padding: '2px 8px', background: 'rgba(212,168,83,0.1)', borderRadius: 4, color: 'var(--gold)' }}>
                  {settingsForm.subaccountCode}
                </code>
                <span className={`dashboard-status-badge ${settingsForm.subaccountStatus === 'active' ? 'available' : 'busy'}`}>
                  {settingsForm.subaccountStatus || 'unknown'}
                </span>
                <button
                  className="dashboard-action-btn delete"
                  onClick={handleDeleteSubaccount}
                  style={{ padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem', marginLeft: 'auto' }}
                >
                  <i className="fas fa-trash"></i> Remove
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Already have a subaccount code? Paste it here:</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={settingsForm.subaccountCode}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, subaccountCode: e.target.value }))}
                placeholder="ACCT_xxxxxxxxx"
              />
              <button
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap' }}
                onClick={async () => {
                  if (!settingsForm.subaccountCode.trim()) {
                    addToast('Enter a subaccount code', 'error');
                    return;
                  }
                  try {
                    await updateHotelSettings({
                      ...settingsForm,
                      subaccountStatus: 'active'
                    });
                    setHotelSettings({ ...settingsForm, subaccountStatus: 'active' });
                    setSettingsForm((prev) => ({ ...prev, subaccountStatus: 'active' }));
                    addToast('Subaccount code saved', 'success');
                  } catch {
                    addToast('Failed to save', 'error');
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>

          <details style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <summary style={{ marginBottom: 8 }}>Or create a new one via Paystack</summary>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginTop: 8 }}>
            <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>
              {settingsForm.subaccountCode ? 'Update Subaccount' : 'Create Paystack Subaccount'}
            </h3>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Settlement Type</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label className="form-checkbox" style={{ fontWeight: settingsForm.settlementType === 'bank' ? 700 : 400 }}>
                  <input
                    type="radio"
                    name="settlementType"
                    value="bank"
                    checked={settingsForm.settlementType === 'bank'}
                    onChange={() => setSettingsForm((prev) => ({ ...prev, settlementType: 'bank' }))}
                  />
                  <span>Bank Account</span>
                </label>
                <label className="form-checkbox" style={{ fontWeight: settingsForm.settlementType === 'mobile_money' ? 700 : 400 }}>
                  <input
                    type="radio"
                    name="settlementType"
                    value="mobile_money"
                    checked={settingsForm.settlementType === 'mobile_money'}
                    onChange={() => setSettingsForm((prev) => ({ ...prev, settlementType: 'mobile_money' }))}
                  />
                  <span>Mobile Money</span>
                </label>
              </div>
            </div>

            {settingsForm.settlementType === 'bank' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Bank Name / Code</label>
                  <input
                    className="form-input"
                    value={settingsForm.settlementBank}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, settlementBank: e.target.value }))}
                    placeholder="e.g. Access Bank (044)"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input
                    className="form-input"
                    value={settingsForm.settlementAccountNumber}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, settlementAccountNumber: e.target.value }))}
                    placeholder="0123456789"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Name</label>
                  <input
                    className="form-input"
                    value={settingsForm.settlementAccountName}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, settlementAccountName: e.target.value }))}
                    placeholder="Paradise Creek Hotel"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Mobile Money Number</label>
                  <input
                    className="form-input"
                    value={settingsForm.mobileMoneyNumber}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, mobileMoneyNumber: e.target.value }))}
                    placeholder="233XXXXXXXXX"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Money Provider</label>
                  <select
                    className="form-input form-select"
                    value={settingsForm.mobileMoneyProvider}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, mobileMoneyProvider: e.target.value }))}
                  >
                    <option value="">Select provider</option>
                    <option value="mtn">MTN</option>
                    <option value="vodafone">Vodafone</option>
                    <option value="airtel">AirtelTigo</option>
                  </select>
                </div>
              </>
            )}

            <button
              className="btn btn-primary"
              onClick={handleCreateSubaccount}
              disabled={subaccountLoading}
              style={{ marginTop: 8 }}
            >
              {subaccountLoading ? 'Processing...' : settingsForm.subaccountCode ? 'Update Subaccount' : 'Create Subaccount'}
            </button>
          </div>
          </details>

          {subaccountMessage && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: subaccountMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${subaccountMessage.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: subaccountMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.85rem',
            }}>
              {subaccountMessage.text}
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentTab = tabs.find((t) => t.key === activeTab);

  return (
    <div className="dashboard-page">
      <aside className="admin-sidebar">
        <div className="dashboard-sidebar-header">
          <div className="dashboard-sidebar-title">Paradise Creek</div>
          <div className="dashboard-sidebar-subtitle">Admin Panel</div>
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`dashboard-nav-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={`fas ${tab.icon} dashboard-nav-icon`}></i>
            {tab.label}
          </button>
        ))}
      </aside>

      <main className="dashboard-main admin-main">
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>{currentTab?.label || 'Dashboard'}</h1>
          </div>
          <span className="dashboard-date">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'rooms' && renderRooms()}
        {activeTab === 'bookings' && renderBookings()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {roomModalOpen && (
        <div className="dashboard-modal-overlay" onClick={() => setRoomModalOpen(false)}>
          <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dashboard-modal-close" onClick={() => setRoomModalOpen(false)}>
              &times;
            </button>
            <h2>{editingRoom ? 'Edit Room' : 'Add Room'}</h2>
            <form onSubmit={handleSaveRoom}>
              <div className="form-group">
                <label className="form-label">Room Name</label>
                <input
                  name="title"
                  className={`form-input ${roomFormErrors.title ? 'error' : ''}`}
                  value={roomForm.title}
                  onChange={handleRoomFormChange}
                  placeholder="Deluxe Ocean Suite"
                />
                {roomFormErrors.title && <p className="form-error">{roomFormErrors.title}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  name="category"
                  className="form-input form-select"
                  value={roomForm.category}
                  onChange={handleRoomFormChange}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Price (GHS / night)</label>
                  <input
                    name="pricePerNight"
                    type="number"
                    min="0"
                    className={`form-input ${roomFormErrors.pricePerNight ? 'error' : ''}`}
                    value={roomForm.pricePerNight}
                    onChange={handleRoomFormChange}
                    placeholder="350"
                  />
                  {roomFormErrors.pricePerNight && <p className="form-error">{roomFormErrors.pricePerNight}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Max Guests</label>
                  <input
                    name="maxGuests"
                    type="number"
                    min="1"
                    className={`form-input ${roomFormErrors.maxGuests ? 'error' : ''}`}
                    value={roomForm.maxGuests}
                    onChange={handleRoomFormChange}
                    placeholder="2"
                  />
                  {roomFormErrors.maxGuests && <p className="form-error">{roomFormErrors.maxGuests}</p>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-input"
                  value={roomForm.description}
                  onChange={handleRoomFormChange}
                  placeholder="Detailed room description..."
                  style={{ minHeight: 80, resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amenities (comma-separated)</label>
                <input
                  name="amenities"
                  className="form-input"
                  value={roomForm.amenities}
                  onChange={handleRoomFormChange}
                  placeholder="WiFi, AC, TV, Mini Bar"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Images</label>
                <div className="image-upload-area">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      setImagePreviews(prev => [
                        ...prev,
                        ...files.map((f, i) => ({
                          id: `new-${Date.now()}-${i}`,
                          url: URL.createObjectURL(f),
                          file: f
                        }))
                      ]);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="fas fa-upload"></i> Choose Images
                  </button>
                </div>
                {imagePreviews.length > 0 && (
                  <div className="image-preview-grid">
                    {imagePreviews.map((p) => (
                      <div key={p.id} className="image-preview-item">
                        <img src={p.url} alt="" className="image-preview-thumb" />
                        <button
                          type="button"
                          className="image-preview-remove"
                          onClick={() => {
                            setImagePreviews(prev => prev.filter(x => x.id !== p.id));
                            if (p.file) URL.revokeObjectURL(p.url);
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    name="isAvailable"
                    checked={roomForm.isAvailable}
                    onChange={handleRoomFormChange}
                  />
                  <span>Available for booking</span>
                </label>
              </div>

              <div className="dashboard-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setRoomModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingRoom ? 'Update Room' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
