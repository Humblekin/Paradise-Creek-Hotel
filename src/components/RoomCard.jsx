import { Link } from 'react-router-dom';
import { useImageFadeIn } from '../hooks/useImageFadeIn';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './RoomCard.css';

export default function RoomCard({ room, onBook }) {
  const [imgRef, imgLoaded, onImgLoad] = useImageFadeIn();
  const [cardRef, cardVisible] = useScrollAnimation();

  const amenities = room.amenities || [];
  const visibleAmenities = amenities.slice(0, 3);
  const desc = room.description || '';
  const truncatedDesc = desc.length > 80 ? desc.slice(0, 80) + '...' : desc;
  const firstImage = room.images?.[0] || room.image || null;

  return (
    <div
      ref={cardRef}
      className={`room-card glass animate-on-scroll scale-in ${cardVisible ? 'visible' : ''}`}
    >
      <Link to={`/rooms/${room.id}`} className="room-card-image-wrap">
        {firstImage && (
          <img
            ref={imgRef}
            src={firstImage}
            alt={room.title}
            className={`room-img image-fade-in ${imgLoaded ? 'loaded' : ''}`}
            onLoad={onImgLoad}
          />
        )}
        <div className="room-card-gradient" />
        <span className={`room-card-badge ${room.isAvailable ? 'available' : 'sold-out'}`}>
          {room.isAvailable ? 'Available' : 'Sold Out'}
        </span>
      </Link>

      <div className="room-card-body">
        <h3 className="room-card-title">
          <Link to={`/rooms/${room.id}`}>{room.title}</Link>
        </h3>

        <p className="room-card-desc">{truncatedDesc}</p>

        <div className="room-card-amenities">
          {visibleAmenities.map((a, i) => (
            <span key={i} className="amenity-tag">{a}</span>
          ))}
        </div>

        <div className="room-card-footer">
          <div className="room-card-price">
            <span className="room-card-price-amount">GHS {room.pricePerNight?.toLocaleString()}</span>
            <span className="room-card-price-night">/night</span>
          </div>
          <button
            className="btn-gold btn-sm"
            onClick={(e) => {
              e.preventDefault();
              onBook(room);
            }}
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}
