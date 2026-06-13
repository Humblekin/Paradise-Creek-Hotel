import { createContext, useContext, useState, useEffect } from 'react';
import { signIn as sbSignIn, signUp as sbSignUp, logOut as sbLogOut, onAuthChange } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setProfile(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email, password) => {
    const u = await sbSignIn(email, password);
    if (u) {
      setUser(u);
      setProfile(u);
    }
    return u;
  };

  const signUp = async (name, email, password) => {
    const u = await sbSignUp(email, password, name);
    if (u) {
      setUser(u);
      setProfile(u);
    }
    return u;
  };

  const logOut = async () => {
    await sbLogOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile, signIn, signUp, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
