import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  username: string;
}

interface UserContextType {
  user: User | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      loadUser(storedUsername);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUser(data);
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      localStorage.removeItem('username');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string) => {
    try {
      const trimmedUsername = username.trim().toLowerCase();

      let { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', trimmedUsername)
        .maybeSingle();

      if (selectError) throw selectError;

      if (!existingUser) {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({ username: trimmedUsername })
          .select('id, username')
          .single();

        if (insertError) throw insertError;
        existingUser = newUser;

        await supabase.from('financial_profiles').insert({
          user_id: existingUser.id,
        });

        await supabase.from('notification_settings').insert({
          user_id: existingUser.id,
        });
      }

      setUser(existingUser);
      localStorage.setItem('username', trimmedUsername);

      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', existingUser.id);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('username');
  };

  return (
    <UserContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
