import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRoom } from '../services/roomService';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import BookingModal from '../components/BookingModal';
import './RoomDetailPage.css';

export default function RoomDetailPage({ onOpenAuth }) {
  const { id } = useParams();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRoom(id).then(r => {
      setRoom(r);
      setLoading(false);
    });
  }, [id]);

  const [activeSlide, setActiveSlide] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const [infoRef, infoVisible] = useScrollAnimation();
  const [amenitiesRef, amenitiesVisible] = useScrollAnimation();

  const handleBook = () => {
    setBookingOpen(true);
  };

  const handleCloseBooking = () => {
    setBookingOpen(false);
  };

  const images = room?.images && room.images.length > 0
    ? room.images
    : room?.image
      ? [room.image]
      : [];

  const totalSlides = images.length;

  const prevSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const nextSlide = () => {
    setActiveSlide((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index) => {
    setActiveSlide(index);
  };

  const normalizeRoom = (r) => r ? {
    ...r,
    name: r.title,
    price: r.pricePerNight,
    image: r.image || (r.images && r.images[0]) || '',
    capacity: r.maxGuests
  } : null;

  const today = new Date().toISOString().split('T')[0];

  const getNights = () => {
    if (!checkIn || !checkOut) return 0;
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = (d2 - d1) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  };

  const nights = getNights();
  const detailPrice = nights * (room?.pricePerNight || 0);

  if (loading) {
    return (
      <div className="room-detail-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--gold)' }} />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="room-detail-not-found">
        <h2>Room not found</h2>
        <p>The room you are looking for does not exist or has been removed.</p>
        <Link to="/rooms" className="btn btn-primary">
          Browse All Rooms
        </Link>
      </div>
    );
  }

  const categoryLabel = room.category || '';

  return (
    <div className="room-detail">
      <div className="room-detail-container">
        <Link to="/rooms" className="room-detail-back">
          <i className="fas fa-arrow-left"></i> Back to Rooms
        </Link>

        {images.length > 0 && (
          <div className="slider-container">
            <div
              className="slider-track"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {images.map((img, i) => (
                <div key={i} className="slider-slide">
                  <img
                    src={img}
                    alt={`${room.title} view ${i + 1}`}
                    className="slider-image"
                  />
                </div>
              ))}
            </div>
            {images.length > 1 && (
              <>
                <button className="slider-btn slider-btn-left" onClick={prevSlide}>
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button className="slider-btn slider-btn-right" onClick={nextSlide}>
                  <i className="fas fa-chevron-right"></i>
                </button>
                <div className="slider-dots">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      className={`slider-dot ${i === activeSlide ? 'active' : ''}`}
                      onClick={() => goToSlide(i)}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="room-detail-layout">
          <div className="room-detail-info">
            <div
              ref={infoRef}
              className={`animate-on-scroll ${infoVisible ? 'visible' : ''}`}
            >
              {categoryLabel && (
                <span className="room-detail-category">{categoryLabel}</span>
              )}
              <h1 className="room-detail-title">{room.title}</h1>
              <span className={`badge ${room.isAvailable ? 'badge-available' : 'badge-unavailable'}`}>
                {room.isAvailable ? 'Available' : 'Unavailable'}
              </span>
              <p className="room-detail-description">
                {room.description || 'No description available.'}
              </p>
            </div>

            {room.amenities && room.amenities.length > 0 && (
              <div
                ref={amenitiesRef}
                className={`room-detail-amenities-section animate-on-scroll ${amenitiesVisible ? 'visible' : ''}`}
              >
                <h2>Amenities</h2>
                <div className="room-detail-amenities-list">
                  {room.amenities.map((a, i) => (
                    <span key={i} className="amenity-tag">
                      <i className="fas fa-check text-gold-400"></i> {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="room-detail-max-guests">
              <i className="fas fa-user-friends"></i>
              <span>Up to {room.maxGuests || 2} Guests</span>
            </div>
          </div>

          <div className="room-detail-sidebar">
            <div className="room-detail-book-card glass-strong">
              <div className="room-detail-book-price">
                GHS {room.pricePerNight?.toLocaleString() || 0}
              </div>
              <div className="room-detail-book-period">/night</div>

              <div className="room-detail-book-divider" />

              <div className="form-group">
                <label className="form-label">Check-in</label>
                <input
                  type="date"
                  className="form-input"
                  value={checkIn}
                  min={today}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Check-out</label>
                <input
                  type="date"
                  className="form-input"
                  value={checkOut}
                  min={checkIn || today}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Guests</label>
                <select
                  className="form-input form-select"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n} disabled={n > (room.maxGuests || 2)}>
                      {n} Guest{n > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {nights > 0 && (
                <div className="room-detail-price-breakdown">
                  <div className="room-detail-price-row">
                    <span>{nights} night{nights > 1 ? 's' : ''} x GHS {room.pricePerNight?.toLocaleString()}</span>
                    <span>GHS {detailPrice.toLocaleString()}</span>
                  </div>
                  <div className="room-detail-price-row room-detail-price-total">
                    <span>Total</span>
                    <span>GHS {detailPrice.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button
                className="btn btn-gold w-full"
                onClick={handleBook}
              >
                Book This Room
              </button>
            </div>
          </div>
        </div>
      </div>

      <BookingModal
        isOpen={bookingOpen}
        room={normalizeRoom(room)}
        onClose={handleCloseBooking}
        onOpenAuth={onOpenAuth}
      />
    </div>
  );
}
