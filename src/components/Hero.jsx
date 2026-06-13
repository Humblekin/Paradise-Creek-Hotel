import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import heroImage from '../assets/hero image.jpeg';
import './Hero.css';

export default function Hero({ onOpenAuth }) {
  const navigate = useNavigate();
  const particlesRef = useRef(null);

  useEffect(() => {
    const el = particlesRef.current;
    if (!el) return;
    const particles = [];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      const size = Math.random() * 3 + 1;
      p.style.cssText = `
        position:absolute;
        width:${size}px;
        height:${size}px;
        background:rgba(52,211,153,${Math.random() * 0.4 + 0.1});
        border-radius:50%;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation:particleFloat ${Math.random() * 6 + 4}s ease-in-out infinite;
        animation-delay:${Math.random() * -5}s;
        pointer-events:none;
      `;
      el.appendChild(p);
      particles.push(p);
    }
    return () => particles.forEach(p => p.remove());
  }, []);

  return (
    <section className="hero">
      <div className="hero-bg" style={{ backgroundImage: `url(${heroImage})` }} />
      <div className="hero-particles" ref={particlesRef} />
      <div className="float-shape" style={{ width: '384px', height: '384px', background: 'rgba(196, 160, 80, 0.05)', borderRadius: '50%', position: 'absolute', top: '-80px', left: '-80px', zIndex: 1, animation: 'floatShape 8s ease-in-out infinite', animationDelay: '-2s' }} />
      <div className="float-shape" style={{ width: '288px', height: '288px', background: 'rgba(196, 160, 80, 0.05)', borderRadius: '50%', position: 'absolute', bottom: '80px', right: '40px', zIndex: 1, animation: 'floatShape 8s ease-in-out infinite', animationDelay: '-5s' }} />
      <div className="hero-content">
        <p className="hero-label">Welcome to Excellence</p>
        <h1 className="hero-title">
          Where Luxury<br /><span className="text-shimmer">Meets Serenity</span>
        </h1>
        <p className="hero-subtitle">Experience unparalleled elegance and world-class hospitality in the heart of the city. Your extraordinary stay awaits.</p>
        <div className="hero-buttons">
          <button className="btn-gold pulse-ring" onClick={() => navigate('/rooms')}>Reserve Your Stay</button>
          <button className="btn-outline" onClick={() => navigate('/about')}>Discover More</button>
        </div>
      </div>
      <div className="hero-scroll-indicator">
        <i className="fas fa-chevron-down" />
      </div>
    </section>
  );
}
