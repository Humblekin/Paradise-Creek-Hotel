import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';
import ChatBot from './components/ChatBot';
import HomePage from './pages/HomePage';
import RoomsPage from './pages/RoomsPage';
import RoomDetailPage from './pages/RoomDetailPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import MyBookingsPage from './pages/MyBookingsPage';
import DashboardPage from './pages/DashboardPage';
import { initLocalData } from './lib/localData';
import './App.css';

initLocalData();

function AppContent() {
  const [authOpen, setAuthOpen] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <>
      <ErrorBoundary><Navbar onOpenAuth={() => setAuthOpen(true)} /></ErrorBoundary>
      <main style={{ minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<HomePage onOpenAuth={() => setAuthOpen(true)} />} />
          <Route path="/rooms" element={<RoomsPage onOpenAuth={() => setAuthOpen(true)} />} />
          <Route path="/rooms/:id" element={<RoomDetailPage onOpenAuth={() => setAuthOpen(true)} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage onOpenAuth={() => setAuthOpen(true)} />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
      {!isDashboard && <Footer />}
      {!isDashboard && <ChatBot />}
      <Toast />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
