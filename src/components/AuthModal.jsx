import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (authMode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your name');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      setLoading(true);
      try {
        const result = await signUp(name, email, password);
        if (result) {
          addToast('Account created successfully! Welcome to Paradise Creek.', 'success');
          onClose();
        } else {
          setError('An account with this email already exists');
        }
      } catch {
        setError('Something went wrong. Please try again.');
      }
      setLoading(false);
    } else {
      setLoading(true);
      try {
        const result = await signIn(email, password);
        if (result) {
          addToast('Welcome back! Signed in successfully.', 'success');
          onClose();
          if (result.role === 'admin') {
            navigate('/dashboard');
          } else {
            navigate('/');
          }
        } else {
          setError('Invalid email or password');
        }
      } catch {
        setError('Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setAuthMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal-content glass-strong" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        <h3 className="auth-modal-title">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h3>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {authMode === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="authName">Full Name</label>
              <input
                id="authName"
                className="form-input"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="authEmail">Email</label>
            <input
              id="authEmail"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="authPassword">Password</label>
            <input
              id="authPassword"
              className="form-input"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="submit-btn" type="submit" disabled={loading}>
            {loading
              ? (authMode === 'login' ? 'Signing In...' : 'Creating Account...')
              : (authMode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="auth-footer-text">
          {authMode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={toggleMode}>Sign Up</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={toggleMode}>Sign In</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}