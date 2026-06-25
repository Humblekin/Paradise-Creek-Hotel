import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">
            <i className="fas fa-crown"></i>
            <span>PARADISE CREEK HOTEL</span>
          </div>
          <p className="footer-tagline">
            Where luxury meets serenity. Experience the finest hospitality in
            Accra.
          </p>
        </div>

        <div className="footer-col">
          <h4>Quick Links</h4>
          <Link to="/">Home</Link>
          <Link to="/rooms">Rooms</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </div>

        <div className="footer-col">
          <h4>Services</h4>
          <a href="#">Room Service</a>
        </div>

        <div className="footer-col">
          <h4>Newsletter</h4>
          <p>Get exclusive offers delivered to your inbox.</p>
          <form
            className="footer-newsletter"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="Your email"
              className="footer-newsletter-input"
            />
            <button type="submit" className="footer-newsletter-btn">
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>

      <div className="footer-bottom">
        <span>QQ134 lime St. NT-0264-8192 &copy; 2026 Paradise Creek Hotel. All rights reserved.</span>
        <div className="footer-social">
          <a
            href="https://www.facebook.com/ParadiseCreekHotel"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
          >
            <i className="fab fa-facebook-f"></i>
          </a>
          <a
            href="https://www.instagram.com/paradisecreekg"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <i className="fab fa-instagram"></i>
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
          >
            <i className="fab fa-twitter"></i>
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <i className="fab fa-linkedin-in"></i>
          </a>
        </div>
      </div>
    </footer>
  );
}
