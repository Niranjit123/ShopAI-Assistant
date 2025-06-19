'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient'; // This path should be correct

const AuthContext = createContext({
  session: null,
  user: null,
  signOut: () => {},
  // loading: true, // It's good practice to initialize all context values
});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth: Error getting initial session:', error);
      }
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log('Auth: Auth state changed. Event:', _event, 'New session:', newSession);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false); // Ensure loading is set to false here too
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, signOut, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);