import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [backendError, setBackendError] = useState('');

  // Fetch profile row from profiles table
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, points, created_at')
        .eq('id', authUser.id)
        .single();
      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err) {
      console.warn('[auth] Could not fetch profile:', err.message);
      // Fallback profile from metadata if DB row hasn't been created yet
      const fallback = {
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
        avatar_url: authUser.user_metadata?.avatar_url || null,
        role: 'student',
        points: 0,
        created_at: authUser.created_at,
      };
      setProfile(fallback);
      return fallback;
    }
  }, []);

  // Build enriched user object with role from DB profile
  const buildUser = useCallback((authUser, profileData) => {
    if (!authUser) return null;
    return {
      ...authUser,
      name: profileData?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
      role: profileData?.role || 'student',
      avatar_url: profileData?.avatar_url || null,
      points: profileData?.points || 0,
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          const profileData = await fetchProfile(session.user);
          if (mounted) setUser(buildUser(session.user, profileData));
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('[auth] Init session error:', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        if (session?.user) {
          const profileData = await fetchProfile(session.user);
          if (mounted) {
            setUser(buildUser(session.user, profileData));
            setLoading(false);
          }
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, buildUser]);

  const login = async ({ email, password }) => {
    setAuthBusy(true);
    setBackendError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profileData = await fetchProfile(data.user);
      const enrichedUser = buildUser(data.user, profileData);
      setUser(enrichedUser);
      return { success: true, user: enrichedUser };
    } catch (error) {
      const msg = mapAuthError(error.message);
      setBackendError(msg);
      return { success: false, error: msg };
    } finally {
      setAuthBusy(false);
    }
  };

  const signup = async ({ name, email, password }) => {
    setAuthBusy(true);
    setBackendError('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
      return { success: true, user: data.user, needsConfirmation: !data.session };
    } catch (error) {
      const msg = mapAuthError(error.message);
      setBackendError(msg);
      return { success: false, error: msg };
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = async () => {
    setAuthBusy(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setBackendError('');
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const role = profile?.role || (user ? 'student' : null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authBusy,
        backendError,
        login,
        signup,
        logout,
        isAdmin: role === 'admin',
        isStudent: role === 'student',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Map common Supabase error messages to user-friendly strings
function mapAuthError(message) {
  const map = {
    'Invalid login credentials': 'Incorrect email or password.',
    'Email not confirmed': 'Please check your email to confirm your account.',
    'User already registered': 'An account with this email already exists.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'Signup requires a valid password': 'Please enter a valid password.',
  };
  return map[message] || message;
}
