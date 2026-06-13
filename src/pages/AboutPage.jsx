import { Link } from 'react-router-dom';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './AboutPage.css';

const values = [
  {
    icon: 'fa-award',
    title: 'Award Winning',
    description: 'Recognized globally for exceptional hospitality and outstanding service, we set the standard for luxury accommodations.'
  },
  {
    icon: 'fa-leaf',
    title: 'Eco Conscious',
    description: 'Committed to sustainable practices, from solar energy to zero-waste initiatives, we care for the environment as much as our guests.'
  },
  {
    icon: 'fa-heart',
    title: 'Community Focus',
    description: 'Deeply rooted in our local community, we support local artisans, farmers, and businesses to create shared prosperity.'
  }
];

export default function AboutPage() {
  const [storyRef, storyVisible] = useScrollAnimation();
  const [valuesRef, valuesVisible] = useScrollAnimation();

  return (
    <div className="about-page">
      <div className="about-hero">
        <span className="section-label">About Paradise Creek Hotel</span>
        <h1 className="section-title">Our Story</h1>
        <p className="about-hero-subtitle">
          Discover the heart and soul behind Paradise Creek Hotel — a sanctuary where nature meets luxury.
        </p>
        <div className="divider" style={{ margin: '16px auto 0' }} />
      </div>

      <section className="page-section">
        <div
          ref={storyRef}
          className={`about-story animate-on-scroll ${storyVisible ? 'visible' : ''}`}
        >
          <img
            src="https://picsum.photos/seed/hotelabout/600/400"
            alt="Paradise Creek Hotel"
            className="about-story-image"
          />
          <div className="about-story-text">
            <h2>A Legacy of Excellence</h2>
            <p>
              Since 1999, Paradise Creek Hotel has been the destination of choice for discerning travelers seeking an unforgettable blend of luxury, comfort, and natural beauty. Nestled along the pristine coastline, our hotel has grown from a small boutique retreat into a world-renowned destination.
            </p>
            <p>
              Every detail — from the hand-selected Italian marble in our lobby to the farm-to-table cuisine crafted by our award-winning chefs — reflects our unwavering commitment to excellence. We welcome guests from across the globe to experience the warmth of our hospitality, the richness of our culture, and the unparalleled beauty of our surroundings.
            </p>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div
          ref={valuesRef}
          className={`animate-on-scroll ${valuesVisible ? 'visible' : ''}`}
        >
          <div className="section-header">
            <span className="section-label">What Drives Us</span>
            <h2 className="section-title">Our Values</h2>
            <div className="divider divider-animate" />
          </div>
          <div className="about-values">
            {values.map((v, i) => (
              <div
                key={i}
                className="about-value-card glass-card animate-on-scroll scale-in"
                style={{
                  transitionDelay: `${i * 100}ms`,
                  opacity: valuesVisible ? 1 : 0,
                  transform: valuesVisible ? 'scale(1)' : 'scale(0.85)'
                }}
              >
                <i className={`fas ${v.icon} about-value-icon`}></i>
                <h3>{v.title}</h3>
                <p>{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="about-cta page-section">
        <h2>Experience Paradise Yourself</h2>
        <p>Book your stay and discover what makes Paradise Creek truly special.</p>
        <Link to="/rooms" className="btn btn-primary">
          View Our Rooms
        </Link>
      </div>
    </div>
  );
}
