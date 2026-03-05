import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminSettingsContext = createContext({});

export const useAdminSettings = () => useContext(AdminSettingsContext);

export const AdminSettingsProvider = ({ children }) => {
  const [supabaseKey, setSupabaseKeyState] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedKey = localStorage.getItem('admin_supabase_key');
    if (storedKey) {
      setSupabaseKeyState(storedKey);
    }
    setIsLoading(false);
  }, []);

  const setSupabaseKey = (key) => {
    if (!key || key.trim() === '') {
      localStorage.removeItem('admin_supabase_key');
      setSupabaseKeyState('');
      return;
    }
    
    // Basic validation: Supabase anon keys are usually JWTs (3 parts separated by dots)
    const isValidFormat = key.split('.').length === 3;
    if (!isValidFormat) {
      throw new Error('Formato de clave inválido. Debe ser un token JWT válido.');
    }

    localStorage.setItem('admin_supabase_key', key.trim());
    setSupabaseKeyState(key.trim());
  };

  const getSupabaseKey = () => supabaseKey;

  const isKeyConfigured = () => !!supabaseKey;

  const value = {
    supabaseKey,
    setSupabaseKey,
    getSupabaseKey,
    isKeyConfigured,
    isLoading
  };

  return (
    <AdminSettingsContext.Provider value={value}>
      {children}
    </AdminSettingsContext.Provider>
  );
};

export default AdminSettingsContext;