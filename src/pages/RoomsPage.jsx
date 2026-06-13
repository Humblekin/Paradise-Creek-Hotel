import { useState, useMemo, useEffect } from 'react';
import { getRooms } from '../services/roomService';
import RoomCard from '../components/RoomCard';
import BookingModal from '../components/BookingModal';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './RoomsPage.css';

const categories = [
  { key: 'all', label: 'All Rooms' },
  { key: 'standard', label: 'Standard' },
  { key: 'deluxe', label: 'Deluxe' },
  { key: 'suite', label: 'Suite' },
  { key: 'penthouse', label: 'Penthouse' }
];

const normalizeRoom = (room) => ({
  ...room,
  name: room.title,
  price: room.pricePerNight,
  image: room.image || (room.images && room.images[0]) || '',
  capacity: room.maxGuests
});

export default function RoomsPage({ onOpenAuth }) {
  const [activeCat, setActiveCat] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [rooms, setRooms] = useState([]);

  const [headerRef, headerVisible] = useScrollAnimation();

  useEffect(() => {
    getRooms().then(setRooms);
  }, []);

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    let result = [...rooms];
    if (activeCat !== 'all') {
      result = result.filter((r) => r.category === activeCat);
    }
    return result.map(normalizeRoom);
  }, [rooms, activeCat]);

  const handleBook = (room) => {
    const roomData = rooms.find((r) => r.id === room.id);
    setSelectedRoom(roomData ? normalizeRoom(roomData) : null);
    setBookingOpen(true);
  };

  const handleCloseBooking = () => {
    setBookingOpen(false);
    setSelectedRoom(null);
  };

  return (
    <div className="rooms-page">
      <div ref={headerRef} className={`rooms-header animate-on-scroll ${headerVisible ? 'visible' : ''}`}>
        <span className="section-label">Our Collection</span>
        <h1 className="section-title">Rooms & Suites</h1>
        <div className={`divider divider-animate ${headerVisible ? 'visible' : ''}`} />
      </div>

      <div className="rooms-categories">
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`rooms-cat-btn ${activeCat === cat.key ? 'active' : ''}`}
            onClick={() => setActiveCat(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className={`rooms-grid animate-on-scroll ${headerVisible ? 'visible' : ''}`}>
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room) => (
            <RoomCard key={room.id} room={room} onBook={() => handleBook(room)} />
          ))
        ) : (
          <div className="rooms-empty">
            <i className="fas fa-bed rooms-empty-icon"></i>
            <p>No rooms found in this category.</p>
          </div>
        )}
      </div>

      <BookingModal
        isOpen={bookingOpen}
        room={selectedRoom}
        onClose={handleCloseBooking}
        onOpenAuth={onOpenAuth}
      />
    </div>
  );
}
