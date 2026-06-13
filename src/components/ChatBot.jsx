import { useState, useEffect, useRef, useCallback } from 'react';
import './ChatBot.css';

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  useEffect(() => {
    if (open && !hasOpened) {
      setHasOpened(true);
      setMessages([{ role: 'bot', text: "Hello! Welcome to Paradise Creek Hotel. How can I help you today? You can ask about rooms, bookings, amenities, or contact info." }]);
    }
  }, [open, hasOpened]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const addBotMessage = (text) => {
    setTyping(false);
    setMessages((prev) => [...prev, { role: 'bot', text }]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setTyping(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ message: text })
        }
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('[ChatBot] HTTP error:', res.status, errText);
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.reply) { console.error('[ChatBot] bad response:', data); throw new Error('Empty reply'); }
      addBotMessage(data.reply);
    } catch (e) {
      console.error('[ChatBot] failed:', e.message || e);
      addBotMessage('Sorry, I am having trouble connecting. Please try again or contact us directly.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <>
      <button
        className={`chat-float ${open ? 'open' : ''}`}
        onClick={toggleOpen}
        aria-label="Chat with us"
      >
        {open ? <i className="fas fa-times"></i> : <i className="fas fa-comment"></i>}
      </button>

      {open && (
        <div className="chat-window glass-strong">
          <div className="chat-header">
            <div className="chat-header-avatar">
              <i className="fas fa-robot"></i>
            </div>
            <div className="chat-header-info">
              <span className="chat-header-name">Paradise Assistant</span>
              <span className="chat-header-status">Online</span>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                <div className={`chat-bubble-text`}>{msg.text}</div>
              </div>
            ))}
            {typing && (
              <div className="chat-typing">
                <span className="chat-typing-dot"></span>
                <span className="chat-typing-dot"></span>
                <span className="chat-typing-dot"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
