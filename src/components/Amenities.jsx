import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './Amenities.css';

const amenitiesData = [
  { icon: 'fa-spa', title: 'Luxury Spa' },
  { icon: 'fa-swimming-pool', title: 'Infinity Pool' },
  { icon: 'fa-utensils', title: 'Fine Dining' },
  { icon: 'fa-dumbbell', title: 'Fitness Center' },
  { icon: 'fa-wifi', title: 'Free Wi-Fi' },
  { icon: 'fa-concierge-bell', title: 'Concierge' },
];

export default function Amenities() {
  const [headerRef, headerVisible] = useScrollAnimation();

  return (
    <section className="page-section" id="amenities">
      <div
        ref={headerRef}
        className={`section-header animate-on-scroll ${headerVisible ? 'visible' : ''}`}
      >
        <span className="section-label">World-Class</span>
        <h2 className="section-title">Hotel Amenities</h2>
        <div className={`divider divider-animate ${headerVisible ? 'visible' : ''}`} />
      </div>

      <div className="amenities-grid">
        {amenitiesData.map((amenity, i) => (
          <div key={i} className={`amenity-card glass stagger-children ${headerVisible ? 'visible' : ''}`} style={{ transitionDelay: `${i * 100}ms` }}>
            <div className="amenity-icon-circle">
              <i className={`fas ${amenity.icon}`}></i>
            </div>
            <h3 className="amenity-title">{amenity.title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}
