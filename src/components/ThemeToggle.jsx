import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
      {darkMode ? <i className="fas fa-moon"></i> : <i className="fas fa-sun"></i>}
    </button>
  );
}
