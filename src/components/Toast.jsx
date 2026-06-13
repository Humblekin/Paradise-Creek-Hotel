import { useToast } from '../contexts/ToastContext';
import './Toast.css';

const icons = {
  success: 'fa-check-circle',
  error: 'fa-exclamation-circle',
  warning: 'fa-info-circle',
  info: 'fa-info-circle'
};

export default function Toast() {
  const { toasts } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type} show`}>
          <i className={`fas ${icons[t.type] || icons.info}`}></i>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
