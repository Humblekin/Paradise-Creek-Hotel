import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBookings, updateBookingStatus, getBookingsByEmail, getBookingByRef } from '../services/bookingService';
import { getRoom } from '../services/roomService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './MyBookingsPage.css';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function MyBookingsPage({ onOpenAuth }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [headerRef, headerVisible] = useScrollAnimation();
  const [enriched, setEnriched] = useState([]);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupRef, setLookupRef] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (user) {
      getBookings(user.id).then(async (bookings) => {
        const withRooms = await Promise.all(
          bookings.map(async (b) => ({
            ...b,
            roomData: await getRoom(b.roomId)
          }))
        );
        setEnriched(withRooms);
      });
    }
  }, [user]);

  const handleGuestLookup = async () => {
    if (!lookupEmail.trim() && !lookupRef.trim()) {
      addToast('Enter your email or booking reference', 'error');
      return;
    }
    setLookupLoading(true);
    let bookings = [];
    if (lookupRef.trim()) {
      const b = await getBookingByRef(lookupRef.trim());
      if (b) bookings = [b];
    }
    if (bookings.length === 0 && lookupEmail.trim()) {
      bookings = await getBookingsByEmail(lookupEmail.trim());
    }
    const withRooms = await Promise.all(
      bookings.map(async (b) => ({ ...b, roomData: await getRoom(b.roomId) }))
    );
    setEnriched(withRooms);
    setLookupLoading(false);
    if (withRooms.length === 0) {
      addToast('No bookings found', 'info');
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    await updateBookingStatus(bookingId, 'cancelled');
    if (user) {
      const bookings = await getBookings(user.id);
      const withRooms = await Promise.all(
        bookings.map(async (b) => ({ ...b, roomData: await getRoom(b.roomId) }))
      );
      setEnriched(withRooms);
    }
    addToast('Booking cancelled', 'success');
  };

  return (
    <div className="my-bookings-page">
      <div ref={headerRef} className={`my-bookings-header animate-on-scroll ${headerVisible ? 'visible' : ''}`}>
        <h1 className="section-title">My Bookings</h1>
        <div className={`divider divider-animate ${headerVisible ? 'visible' : ''}`} />
      </div>

      <div className="my-bookings-content">
        {!user && (
          <div className="booking-guest-lookup">
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 16 }}>
              Enter your email or booking reference to find your reservation.
            </p>
            <div style={{ display: 'flex', gap: 8, maxWidth: 500, margin: '0 auto' }}>
              <input
                className="form-input"
                type="email"
                placeholder="Email address"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
              />
              <input
                className="form-input"
                type="text"
                placeholder="Booking ref (HTL-...)"
                value={lookupRef}
                onChange={(e) => setLookupRef(e.target.value)}
                style={{ maxWidth: 160 }}
              />
              <button className="btn btn-primary" onClick={handleGuestLookup} disabled={lookupLoading}>
                {lookupLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            <p style={{ textAlign: 'center', marginTop: 12 }}>
              <button className="btn btn-outline btn-sm" onClick={onOpenAuth}>
                <i className="fas fa-sign-in-alt"></i> Sign in to see all bookings
              </button>
            </p>
          </div>
        )}

        {enriched.length > 0 ? (
          <div className="bookings-list">
            {enriched.map((booking) => {
              const room = booking.roomData;
              return (
                <div key={booking.id} className="booking-card glass">
                  <div className="booking-card-image">
                    {room?.images?.[0] ? (
                      <img src={room.images[0]} alt={room.title} />
                    ) : (
                      <div className="booking-card-image-placeholder">
                        <i className="fas fa-image"></i>
                      </div>
                    )}
                  </div>
                  <div className="booking-card-body">
                    <div className="booking-card-header">
                      <h3 className="booking-card-title">
                        {room?.title || 'Unknown Room'}
                      </h3>
                      <span className={`booking-status status-${booking.status}`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="booking-card-details">
                      <div className="booking-detail-item">
                        <i className="fas fa-calendar-check"></i>
                        <span>{formatDate(booking.checkIn)}</span>
                      </div>
                      <div className="booking-detail-item">
                        <i className="fas fa-calendar-minus"></i>
                        <span>{formatDate(booking.checkOut)}</span>
                      </div>
                      <div className="booking-detail-item">
                        <i className="fas fa-user-friends"></i>
                        <span>{booking.guests} Guest{booking.guests > 1 ? 's' : ''}</span>
                      </div>
                      <div className="booking-detail-item">
                        <i className="fas fa-tag"></i>
                        <span>GHS {booking.totalPrice?.toLocaleString()}</span>
                      </div>
                    </div>
                    {booking.bookingRef && (
                      <p className="booking-ref">Ref: {booking.bookingRef}</p>
                    )}
                    {booking.paymentRef && !booking.bookingRef && (
                      <p className="booking-ref">Ref: {booking.paymentRef}</p>
                    )}
                    <div className="booking-card-actions">
                      {(booking.status === 'pending') && (
                        <button
                          className="btn btn-primary"
                          onClick={() => addToast('Payment not yet available for this booking', 'info')}
                        >
                          <i className="fas fa-credit-card"></i> Pay Now
                        </button>
                      )}
                      {(booking.status === 'pending' || booking.status === 'paid' || booking.status === 'confirmed') && (
                        <button
                          className="btn btn-outline btn-danger-outline"
                          onClick={() => handleCancel(booking.id)}
                        >
                          <i className="fas fa-times"></i> Cancel
                        </button>
                      )}
                      {room && (
                        <Link to={`/rooms/${room.id}`} className="btn btn-outline">
                          <i className="fas fa-eye"></i> View Room
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="my-bookings-empty">
            <i className="fas fa-calendar-times empty-icon"></i>
            <h2>No Bookings Found</h2>
            <p>{user ? 'You have no bookings yet. Browse our rooms and book your stay!' : 'Enter your email or booking reference above to find your reservation.'}</p>
            <Link to="/rooms" className="btn btn-primary">Browse Rooms</Link>
          </div>
        )}
      </div>
    </div>
  );
}
