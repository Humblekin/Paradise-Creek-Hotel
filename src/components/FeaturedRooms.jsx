import { Link } from 'react-router-dom';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import RoomCard from './RoomCard';
import './FeaturedRooms.css';

export default function FeaturedRooms({ rooms, onBook }) {
  const [headerRef, headerVisible] = useScrollAnimation();

  const featured = rooms ? rooms.filter(r => r.isAvailable !== false).slice(0, 3) : [];

  const renderSkeleton = () => (
    <div className="featured-grid">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image" />
          <div className="skeleton-body">
            <div className="skeleton-line short" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className="empty-state">
      <h3>No rooms available</h3>
      <p>Check back later for our premium room offerings.</p>
    </div>
  );

  const renderGrid = () => (
    <div className="featured-grid">
      {featured.map((room) => (
        <RoomCard key={room.id} room={room} onBook={onBook} />
      ))}
    </div>
  );

  return (
    <section className="page-section" id="featured-rooms">
      <div
        ref={headerRef}
        className={`section-header animate-on-scroll ${headerVisible ? 'visible' : ''}`}
      >
        <span className="section-label">Accommodations</span>
        <h2 className="section-title">Featured Suites</h2>
        <div className={`divider divider-animate ${headerVisible ? 'visible' : ''}`} />
      </div>

      {!rooms ? renderSkeleton() : rooms.length === 0 ? renderEmpty() : renderGrid()}

      {featured.length > 0 && (
        <div className="featured-cta">
          <Link to="/rooms" className="btn btn-secondary">View All Rooms <i className="fas fa-arrow-right"></i></Link>
        </div>
      )}
    </section>
  );
}
