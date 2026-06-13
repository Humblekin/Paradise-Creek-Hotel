import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './MapSection.css';

export default function MapSection() {
  const [headerRef, headerVisible] = useScrollAnimation();
  const [cardRef, cardVisible] = useScrollAnimation();

  return (
    <section className="page-section" id="find-us">
      <div
        ref={headerRef}
        className={`section-header animate-on-scroll ${headerVisible ? 'visible' : ''}`}
      >
        <span className="section-label">Find Us</span>
        <h2 className="section-title">Our Location</h2>
        <div className={`divider divider-animate ${headerVisible ? 'visible' : ''}`} />
      </div>

      <div className="map-container glass" ref={cardRef}>
        <iframe
          title="Paradise Creek Hotel Location"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-0.1867%2C5.5560%2C-0.1767%2C5.5660&layer=mapnik&marker=5.5610%2C-0.1817"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
        />
        <div className={`map-info-card glass-strong animate-on-scroll slide-left ${cardVisible ? 'visible' : ''}`}>
          <h3 className="map-info-title">Paradise Creek Hotel</h3>
          <p className="map-info-address">Independence Ave, Accra, Ghana</p>
        </div>
      </div>
    </section>
  );
}
