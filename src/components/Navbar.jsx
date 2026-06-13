import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

export default function Navbar({ onOpenAuth }) {
  const { user, profile, logOut } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const isActive = (path) => location.pathname === path;

  const links = [
    { path: '/', label: 'Home', icon: 'fa-home' },
    { path: '/rooms', label: 'Rooms', icon: 'fa-bed' },
    { path: '/about', label: 'About', icon: 'fa-info-circle' },
    { path: '/contact', label: 'Contact', icon: 'fa-envelope' },
    { path: '/my-bookings', label: 'My Bookings', icon: 'fa-calendar-check' }
  ];

  const handleLogout = async () => {
    await logOut();
    setDropdownOpen(false);
    setMenuOpen(false);
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon"><i className="fas fa-crown"></i></div>
          <span>PARADISE</span>
          <span className="navbar-logo-gold"> CREEK HOTEL</span>
        </Link>

        <div className="navbar-links">
          {links.map(l => (
            <Link
              key={l.path}
              to={l.path}
              className={`nav-link ${isActive(l.path) ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="navbar-actions">
          <ThemeToggle />
          {user ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                className="navbar-user-btn"
                onClick={() => setDropdownOpen(p => !p)}
              >
                <i className="fas fa-user-circle" style={{ color: 'var(--gold)', fontSize: '1.2rem' }}></i>
                <span className="navbar-user-name">{profile?.name || user.email?.split('@')[0]}</span>
                <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}></i>
              </button>
              {dropdownOpen && (
                <div className="navbar-dropdown">
                  {profile?.role === 'admin' && (
                    <Link to="/dashboard" className="navbar-dropdown-item">
                      <i className="fas fa-tachometer-alt navbar-dropdown-icon"></i>Dashboard
                    </Link>
                  )}
                  <Link to="/my-bookings" className="navbar-dropdown-item">
                    <i className="fas fa-calendar-check navbar-dropdown-icon"></i>My Bookings
                  </Link>
                  <hr className="navbar-dropdown-divider" />
                  <button className="navbar-dropdown-item danger" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt navbar-dropdown-icon"></i>Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="navbar-signin-btn" onClick={onOpenAuth}>
                Sign In
              </button>
              <Link to="/rooms" className="navbar-book-btn">
                Book Now
              </Link>
            </>
          )}
          <button
            className={`navbar-hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(p => !p)}
            aria-label="Menu"
          >
            {menuOpen ? <i className="fas fa-times"></i> : <i className="fas fa-bars"></i>}
          </button>
        </div>
      </nav>

      <div className={`mobile-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <span className="mobile-menu-title">PARADISE<span className="text-gold"> CREEK HOTEL</span></span>
          <button className="mobile-menu-close" onClick={() => setMenuOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="mobile-menu-links">
          {links.map(l => (
            <Link
              key={l.path}
              to={l.path}
              className={`mobile-menu-link ${isActive(l.path) ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <i className={`fas ${l.icon} mobile-menu-link-icon`}></i>
              {l.label}
            </Link>
          ))}
          <button
            className="mobile-menu-link"
            onClick={() => { toggleTheme(); setMenuOpen(false); }}
          >
            <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'} mobile-menu-link-icon`}></i>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
        <hr className="mobile-menu-divider" />
        <div className="mobile-menu-auth">
          {user ? (
            <>
              <div className="mobile-menu-user">
                <span className="navbar-user-avatar">
                  {(profile?.name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </span>
                <span className="mobile-menu-user-name">{profile?.name || user.email?.split('@')[0]}</span>
              </div>
              {profile?.role === 'admin' && (
                <Link to="/dashboard" className="mobile-menu-auth-btn" onClick={() => setMenuOpen(false)}>
                  <i className="fas fa-tachometer-alt mobile-menu-link-icon"></i>Dashboard
                </Link>
              )}
              <Link to="/my-bookings" className="mobile-menu-auth-btn" onClick={() => setMenuOpen(false)}>
                <i className="fas fa-calendar-check mobile-menu-link-icon"></i>My Bookings
              </Link>
              <button className="mobile-menu-auth-btn danger" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt mobile-menu-link-icon"></i>Sign Out
              </button>
            </>
          ) : (
            <>
              <button className="mobile-menu-auth-btn outlined" onClick={() => { onOpenAuth(); setMenuOpen(false); }}>
                Sign In
              </button>
              <Link to="/rooms" className="mobile-menu-auth-btn gold" onClick={() => setMenuOpen(false)}>
                Book Now
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
