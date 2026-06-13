import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './CTASection.css';

export default function CTASection() {
  const [ref, visible] = useScrollAnimation();

  return (
    <section
      ref={ref}
      className={`cta-section animate-on-scroll scale-in ${visible ? 'visible' : ''}`}
    >
      <div className="cta-content">
        <h2 className="cta-title">
          Ready for an <span className="text-shimmer">Unforgettable</span> Stay?
        </h2>
        <p className="cta-subtitle">
          Book your dream suite today and immerse yourself in the pinnacle of luxury hospitality.
        </p>
        <button
          className="btn btn-primary cta-btn"
          onClick={() => { window.location.href = '/rooms'; }}
        >
          Book Your Suite Now
        </button>
      </div>
    </section>
  );
}
