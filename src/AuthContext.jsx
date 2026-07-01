import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, email, name, role }
  const [loading, setLoading] = useState(true);

  async function loadProfile(authUser) {
    if (!authUser) {
      setUser(null);
      return;
    }
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('Failed to load profile:', error);
      setUser(null);
      return;
    }
    setUser(profile);
  }

  useEffect(() => {
    // Check for an existing session on first load
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session?.user ?? null).finally(() => setLoading(false));
    });

    // Keep user state in sync if the session changes (e.g. token refresh,
    // logout in another tab)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await loadProfile(data.user);
    // Return the freshly loaded profile (re-fetch since state update is async)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', data.user.id)
      .single();
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
