import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(authUser) {
    if (!authUser) {
      setUser(null);
      return null;
    }
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser(profile);
        return profile;
      }

      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      } else {
        console.error('Failed to load profile after retries:', error);
        setUser(null);
        return null;
      }
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user) {
        loadProfile(session.user);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await new Promise((r) => setTimeout(r, 300));
    const profile = await loadProfile(data.user);
    if (!profile) throw new Error('Could not load your profile. Please try again.');
    return profile;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
