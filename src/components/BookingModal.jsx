import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { createBooking, verifyPayment, confirmBookingPayment, updateBookingStatus } from '../services/bookingService';
import { checkRoomAvailability } from '../services/roomService';
import { getHotelSettings } from '../services/hotelSettingsService';
import './BookingModal.css';

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayStr() {
  return toDateStr(new Date());
}

function getTomorrowStr(d) {
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return toDateStr(next);
}

const steps = ['Dates & Guests', 'Your Information', 'Summary', 'Payment'];

export default function BookingModal({ room, isOpen, onClose, onOpenAuth }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const today = getTodayStr();
  const [step, setStep] = useState(1);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(getTomorrowStr(new Date()));
  const [guests, setGuests] = useState(1);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(true);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState('');
  const [country, setCountry] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [loading, setLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [subaccountCode, setSubaccountCode] = useState('');

  useEffect(() => {
    if (!isOpen || !room) return;
    setStep(1);
    setCheckIn(today);
    setCheckOut(getTomorrowStr(new Date()));
    setGuests(1);
    setGuestName(user?.name || '');
    setGuestEmail(user?.email || '');
    setGuestPhone('');
    setCountry('');
    setSpecialRequests('');
    setLoading(false);
    setChecking(false);
    setAvailable(true);
    setConfirmedBooking(null);
    setSubaccountCode('');
    getHotelSettings().then((s) => {
      if (s?.subaccountCode) setSubaccountCode(s.subaccountCode.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ''));
    }).catch(() => {});
  }, [isOpen, room, today, user]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = (d2 - d1) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const totalPrice = nights * (room?.pricePerNight || 0);

  useEffect(() => {
    if (!checkIn || !checkOut || !room || nights <= 0) return;
    let cancelled = false;
    setChecking(true);
    checkRoomAvailability(room.id, checkIn, checkOut).then((avail) => {
      if (!cancelled) {
        setAvailable(avail);
        setChecking(false);
      }
    });
    return () => { cancelled = true; };
  }, [checkIn, checkOut, room, nights]);

  if (!isOpen || !room) return null;

  const handleCheckInChange = (e) => {
    const val = e.target.value;
    setCheckIn(val);
    if (checkOut && val >= checkOut) {
      setCheckOut(getTomorrowStr(new Date(val)));
    }
  };

  const handleCheckOutChange = (e) => {
    setCheckOut(e.target.value);
  };

  const validateStep1 = () => {
    if (nights <= 0) { addToast('Please select valid dates', 'error'); return false; }
    if (!available) { addToast('Room is not available for selected dates', 'error'); return false; }
    if (guests < 1 || guests > room.maxGuests) { addToast(`Guest count must be between 1 and ${room.maxGuests}`, 'error'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!guestName.trim()) { addToast('Full name is required', 'error'); return false; }
    if (!guestEmail.trim()) { addToast('Email address is required', 'error'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) { addToast('Please enter a valid email address', 'error'); return false; }
    if (!guestPhone.trim()) { addToast('Phone number is required', 'error'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handlePayment = async () => {
    setLoading(true);
    if (!window.PaystackPop) {
      addToast('Payment system not loaded. Please refresh the page.', 'error');
      setLoading(false);
      return;
    }

    // 1. Create booking as 'pending' first to reserve the room
    let pendingBooking;
    try {
      pendingBooking = await createBooking({
        roomId: room.id,
        roomName: room.title,
        userId: user?.id || null,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        country: country.trim(),
        specialRequests: specialRequests.trim(),
        checkIn,
        checkOut,
        guests,
        totalPrice,
        paystackRef: '',
        status: 'pending'
      });
    } catch (e) {
      addToast('Failed to create booking: ' + e.message, 'error');
      setLoading(false);
      return;
    }

    // 2. Open Paystack popup
    try {
      const paystackOptions = {
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        email: guestEmail,
        amount: totalPrice * 100,
        currency: 'GHS',
        ...(subaccountCode ? { subaccount: subaccountCode } : {}),
        callback: function (response) {
          verifyPayment(response.reference).then(function () {
            return confirmBookingPayment(pendingBooking.id, response.reference);
          }).then(function () {
            setConfirmedBooking({ ...pendingBooking, status: 'confirmed', paystackRef: response.reference });
            setStep(5);
            addToast('Booking confirmed!', 'success');
          }).catch(function (err) {
            console.error('[BookingModal] Post-payment error:', err?.message || err);
            addToast('Payment received but confirmation pending. Contact support with ref: ' + response.reference + '. Error: ' + (err?.message || 'unknown'), 'warning');
            onClose();
          }).finally(function () {
            setLoading(false);
          });
        },
        onClose: function () {
          updateBookingStatus(pendingBooking.id, 'pending').catch(() => {});
          setLoading(false);
        }
      };

      const handler = window.PaystackPop.setup(paystackOptions);
      handler.openIframe();
    } catch (e) {
      addToast('Payment failed: ' + e.message, 'error');
      setLoading(false);
      // Cancel the pending booking since payment couldn't start
      updateBookingStatus(pendingBooking.id, 'cancelled').catch(() => {});
    }
  };

  const minCheckOut = checkIn ? getTomorrowStr(new Date(checkIn)) : today;
  const roomImage = room.images?.[0] || room.image || '';

  const renderStepIndicator = () => (
    <div className="booking-steps">
      {steps.map((label, i) => {
        const num = i + 1;
        const isActive = num === step;
        const isDone = num < step || (step === 5 && num <= 4);
        return (
          <div key={num} className={`booking-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
            <div className="booking-step-num">{isDone ? '\u2713' : num}</div>
            <div className="booking-step-label">{label}</div>
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <>
      <h3>Select Dates & Guests</h3>
      <div className="booking-row">
        <div className="form-group">
          <label className="form-label" htmlFor="check-in">Check-in</label>
          <input id="check-in" className="form-input" type="date" min={today} value={checkIn} onChange={handleCheckInChange} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="check-out">Check-out</label>
          <input id="check-out" className="form-input" type="date" min={minCheckOut} value={checkOut} onChange={handleCheckOutChange} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="guests">Guests</label>
        <select id="guests" className="form-input form-select" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
          {Array.from({ length: room.maxGuests || 4 }, (_, i) => (
            <option key={i} value={i + 1}>{i + 1} Guest{i > 0 ? 's' : ''}</option>
          ))}
        </select>
      </div>
      {checking && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Checking availability...</p>}
      {!checking && !available && <div className="booking-unavailable">Room not available for selected dates</div>}
      <button className="submit-btn" type="button" onClick={handleNext} disabled={checking || nights <= 0 || !available}>
        Continue
      </button>
    </>
  );

  const renderStep2 = () => (
    <>
      <h3>Your Information</h3>
      <div className="form-group">
        <label className="form-label">Full Name <span className="required">*</span></label>
        <input className="form-input" type="text" placeholder="John Doe" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Email Address <span className="required">*</span></label>
        <input className="form-input" type="email" placeholder="john@example.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Phone Number <span className="required">*</span></label>
        <input className="form-input" type="tel" placeholder="+233 XX XXX XXXX" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Country</label>
        <input className="form-input" type="text" placeholder="Ghana" value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Special Requests</label>
        <textarea className="form-input" style={{ resize: 'none' }} rows={3} placeholder="Any special requirements..." value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} />
      </div>
      <div className="booking-nav-btns">
        <button className="btn btn-secondary" type="button" onClick={handleBack}>Back</button>
        <button className="submit-btn" type="button" onClick={handleNext}>Continue</button>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <h3>Booking Summary</h3>
      <div className="booking-summary-card">
        <div className="booking-summary-row">
          <span className="booking-summary-label">Room</span>
          <span className="booking-summary-value">{room.title}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Category</span>
          <span className="booking-summary-value">{room.category}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Check-in</span>
          <span className="booking-summary-value">{new Date(checkIn).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Check-out</span>
          <span className="booking-summary-value">{new Date(checkOut).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Nights</span>
          <span className="booking-summary-value">{nights}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Guests</span>
          <span className="booking-summary-value">{guests}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Guest Name</span>
          <span className="booking-summary-value">{guestName}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Email</span>
          <span className="booking-summary-value">{guestEmail}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Phone</span>
          <span className="booking-summary-value">{guestPhone}</span>
        </div>
        {country && (
          <div className="booking-summary-row">
            <span className="booking-summary-label">Country</span>
            <span className="booking-summary-value">{country}</span>
          </div>
        )}
        {specialRequests && (
          <div className="booking-summary-row">
            <span className="booking-summary-label">Requests</span>
            <span className="booking-summary-value">{specialRequests}</span>
          </div>
        )}
        <div className="booking-summary-divider" />
        <div className="booking-summary-row total">
          <span className="booking-summary-label">Total Amount</span>
          <span className="booking-summary-value">GHS {totalPrice.toLocaleString()}</span>
        </div>
      </div>
      <div className="booking-nav-btns">
        <button className="btn btn-secondary" type="button" onClick={handleBack}>Back</button>
        <button className="submit-btn" type="button" onClick={handleNext} disabled={loading}>
          Proceed to Payment
        </button>
      </div>
    </>
  );

  const renderStep4 = () => (
    <>
      <h3>Payment</h3>
      <div className="booking-summary-card">
        <div className="booking-summary-row">
          <span className="booking-summary-label">Room</span>
          <span className="booking-summary-value">{room.title}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Nights</span>
          <span className="booking-summary-value">{nights}</span>
        </div>
        <div className="booking-summary-row total">
          <span className="booking-summary-label">Total</span>
          <span className="booking-summary-value">GHS {totalPrice.toLocaleString()}</span>
        </div>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '1rem 0' }}>
        You will be redirected to Paystack to complete payment.
      </p>
      <div className="booking-nav-btns">
        <button className="btn btn-secondary" type="button" onClick={handleBack} disabled={loading}>Back</button>
        <button className="submit-btn" type="button" onClick={handlePayment} disabled={loading}>
          {loading ? 'Processing...' : `Pay GHS ${totalPrice.toLocaleString()}`}
        </button>
      </div>
    </>
  );

  const renderConfirmation = () => (
    <div className="booking-confirmation">
      <div className="booking-confirm-icon">
        <i className="fas fa-check-circle"></i>
      </div>
      <h3>Booking Confirmed!</h3>
      <p>Your booking has been confirmed. A confirmation email will be sent to <strong>{guestEmail}</strong>.</p>
      <div className="booking-confirm-ref">
        <span className="booking-confirm-ref-label">Booking Reference</span>
        <span className="booking-confirm-ref-value">{confirmedBooking?.bookingRef}</span>
      </div>
      <div className="booking-summary-card" style={{ textAlign: 'left' }}>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Room</span>
          <span className="booking-summary-value">{room.title}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Check-in</span>
          <span className="booking-summary-value">{new Date(checkIn).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Check-out</span>
          <span className="booking-summary-value">{new Date(checkOut).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="booking-summary-row">
          <span className="booking-summary-label">Guests</span>
          <span className="booking-summary-value">{guests}</span>
        </div>
        <div className="booking-summary-row total">
          <span className="booking-summary-label">Amount Paid</span>
          <span className="booking-summary-value">GHS {totalPrice.toLocaleString()}</span>
        </div>
      </div>
      {!user && (
        <div className="booking-account-prompt">
          <p><i className="fas fa-user-plus"></i> Create an account to manage your bookings and receive future offers.</p>
          <button className="btn btn-primary" onClick={() => { onClose(); onOpenAuth?.(); }}>
            Create Account
          </button>
        </div>
      )}
      <button className="submit-btn" type="button" onClick={onClose} style={{ marginTop: '1rem' }}>
        Done
      </button>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content booking-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        {step < 5 && (
          <div className="booking-room-summary">
            {roomImage && <img className="booking-room-thumb" src={roomImage} alt={room.title} />}
            <div className="booking-room-info">
              <div className="booking-room-name">{room.title}</div>
              <div className="booking-room-price">GHS {room.pricePerNight?.toLocaleString()} <span>/ night</span></div>
            </div>
          </div>
        )}

        {step < 5 && renderStepIndicator()}

        <div className="booking-form">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderConfirmation()}
        </div>
      </div>
    </div>
  );
}
