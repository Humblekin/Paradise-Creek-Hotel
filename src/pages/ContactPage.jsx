import { useState } from 'react';
import { submitContact } from '../services/bookingService';
import { useToast } from '../contexts/ToastContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './ContactPage.css';

const contactInfo = [
  {
    icon: 'fa-map-marker-alt',
    title: 'Address',
    content: 'Koblimahagu Zuo, Tamale, Ghana'
  },
  {
    icon: 'fa-phone',
    title: 'Phone',
    content: '+233 30 277 1234'
  },
  {
    icon: 'fa-envelope',
    title: 'Email',
    content: 'paradisecreekhotel@yahoo.com'
  }
];

const socialLinks = [
  { icon: 'fa-facebook-f', url: 'https://www.facebook.com/ParadiseCreekHotel', label: 'Facebook' },
  { icon: 'fa-instagram', url: 'https://www.instagram.com/paradisecreekg', label: 'Instagram' },
  { icon: 'fa-twitter', url: '#', label: 'Twitter' },
  { icon: 'fa-tripadvisor', url: '#', label: 'Tripadvisor' }
];

const initialForm = { name: '', email: '', subject: '', message: '' };

export default function ContactPage() {
  const { addToast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [formRef, formVisible] = useScrollAnimation();
  const [infoRef, infoVisible] = useScrollAnimation();

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email';
    }
    if (!form.subject.trim()) errs.subject = 'Subject is required';
    if (!form.message.trim()) errs.message = 'Message is required';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await submitContact({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim()
      });
      addToast('Message sent! We\'ll get back to you soon.', 'success');
      setForm(initialForm);
      setErrors({});
    } catch {
      addToast('Failed to send message. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-hero">
        <span className="section-label">Get In Touch</span>
        <h1 className="section-title">Contact Us</h1>
        <p className="section-subtitle">
          Have a question or special request? We would love to hear from you.
        </p>
        <div className="divider" style={{ margin: '16px auto 0' }} />
      </div>

      <div className="contact-layout">
        <div
          ref={formRef}
          className={`animate-on-scroll reveal-left ${formVisible ? 'visible' : ''}`}
        >
          <div className="contact-form-section">
            <h2>Send Us a Message</h2>

            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  type="text"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={handleChange}
                />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange}
                />
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  name="subject"
                  className={`form-input ${errors.subject ? 'error' : ''}`}
                  type="text"
                  placeholder="How can we help?"
                  value={form.subject}
                  onChange={handleChange}
                />
                {errors.subject && <p className="form-error">{errors.subject}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  className={`form-input ${errors.message ? 'error' : ''}`}
                  placeholder="Tell us more about your inquiry..."
                  value={form.message}
                  onChange={handleChange}
                  rows={5}
                />
                {errors.message && <p className="form-error">{errors.message}</p>}
              </div>

              <button
                type="submit"
                className="btn btn-gold w-full"
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>

        <div
          ref={infoRef}
          className={`animate-on-scroll reveal-right ${infoVisible ? 'visible' : ''}`}
        >
          <div className="contact-info-section">
            {contactInfo.map((item, i) => (
              <div key={i} className="contact-info-card glass">
                <div className="contact-info-icon-wrap">
                  <i className={`fas ${item.icon}`}></i>
                </div>
                <div className="contact-info-content">
                  <h4>{item.title}</h4>
                  <p>{item.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="contact-social-section">
            <h4>Follow Us</h4>
            <div className="contact-social-links">
              {socialLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-social-link"
                  aria-label={link.label}
                >
                  <i className={`fab ${link.icon}`}></i>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
