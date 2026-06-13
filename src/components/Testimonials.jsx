import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './Testimonials.css';

export default function Testimonials({ testimonials }) {
  const [ref, visible] = useScrollAnimation();

  if (!testimonials || testimonials.length === 0) return null;

  const data = [...testimonials, ...testimonials];

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fas fa-star ${i <= rating ? 'star-filled' : 'star-empty'}`}
        />
      );
    }
    return stars;
  };

  return (
    <section className="page-section" id="testimonials">
      <div
        ref={ref}
        className={`section-header animate-on-scroll ${visible ? 'visible' : ''}`}
      >
        <span className="section-label">Testimonials</span>
        <h2 className="section-title">Guest Experiences</h2>
        <div className={`divider divider-animate ${visible ? 'visible' : ''}`} />
      </div>

      <div className="testimonials-track-wrap">
        <div className="testimonials-track">
          {data.map((t, i) => (
            <div key={i} className="testimonial-card glass">
              <div className="testimonial-stars">
                {renderStars(t.rating || 5)}
              </div>
              <p className="testimonial-quote">&ldquo;{t.text}&rdquo;</p>
              <div className="testimonial-author">
                <img src={t.avatar} alt={t.name} className="testimonial-avatar" />
                <div>
                  <h4 className="testimonial-name">{t.name}</h4>
                  <span className="testimonial-location">{t.location || t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
