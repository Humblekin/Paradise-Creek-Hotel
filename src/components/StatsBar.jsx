import { useCounter } from '../hooks/useCounter';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './StatsBar.css';

export default function StatsBar() {
  const [containerRef, visible] = useScrollAnimation();
  const [guestsRef, guestsCount] = useCounter(10);
  const [yearsRef, yearsCount] = useCounter(1);
  const [roomsRef, roomsCount] = useCounter(7);
  const [ratingRef, ratingCount] = useCounter(4);

  const stats = [
    { ref: roomsRef, count: roomsCount, label: 'Luxury Rooms' },
    { ref: yearsRef, count: yearsCount, label: 'Years of Service' },
    { ref: guestsRef, count: guestsCount, label: 'Happy Guests' },
    { ref: ratingRef, count: ratingCount, label: 'Star Rating' },
  ];

  return (
    <div
      ref={containerRef}
      className={`stats-bar glass-strong animate-on-scroll ${visible ? 'visible' : ''}`}
    >
      {stats.map((stat, i) => (
        <div key={i} className={`stat-item stagger-children ${visible ? 'visible' : ''}`} style={{ transitionDelay: `${i * 100}ms` }}>
          <div className="stat-number">
            <span ref={stat.ref} className="stat-counter">{stat.count}</span>
          </div>
          <span className="stat-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
