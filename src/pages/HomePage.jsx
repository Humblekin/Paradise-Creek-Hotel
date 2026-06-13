import { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import StatsBar from '../components/StatsBar';
import FeaturedRooms from '../components/FeaturedRooms';
import Amenities from '../components/Amenities';
import Testimonials from '../components/Testimonials';
import CTASection from '../components/CTASection';
import MapSection from '../components/MapSection';
import BookingModal from '../components/BookingModal';
import { testimonials } from '../lib/localData';
import { getRooms } from '../services/roomService';
import './HomePage.css';

const normalizeRoom = (room) => ({
  ...room,
  name: room.title,
  price: room.pricePerNight,
  image: room.image || (room.images && room.images[0]) || '',
  capacity: room.maxGuests
});

export default function HomePage({ onOpenAuth }) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  const [rooms, setRooms] = useState(null);

  useEffect(() => {
    getRooms().then(setRooms);
  }, []);

  const normRooms = rooms ? rooms.map(normalizeRoom) : null;

  const handleBook = (room) => {
    setSelectedRoom(normalizeRoom(room));
    setBookingOpen(true);
  };

  const handleCloseBooking = () => {
    setBookingOpen(false);
    setSelectedRoom(null);
  };

  return (
    <>
      <Hero />

      <section className="page-section homepage-stats">
        <StatsBar />
      </section>

      <section className="page-section homepage-featured">
        <FeaturedRooms rooms={normRooms} onBook={handleBook} />
      </section>

      <section className="page-section homepage-amenities">
        <Amenities />
      </section>

      <section className="page-section homepage-testimonials">
        <Testimonials testimonials={testimonials} />
      </section>

      <section className="page-section homepage-cta">
        <CTASection />
      </section>

      <section className="page-section homepage-map">
        <MapSection />
      </section>

      <BookingModal
        isOpen={bookingOpen}
        room={selectedRoom}
        onClose={handleCloseBooking}
        onOpenAuth={onOpenAuth}
      />
    </>
  );
}
