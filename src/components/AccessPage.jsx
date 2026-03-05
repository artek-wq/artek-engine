import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, LayoutDashboard, ArrowRight, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AccessPage = () => {

  const navigate = useNavigate();
  const { user, signIn, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setSigningIn(true);

    const { error } = await signIn(email, password);

    if (!error) {
      navigate('/dashboard');
    }

    setSigningIn(false);
  };

  return (
    <>
      <Helmet>
        <title>Acceso - Artek Engine</title>
      </Helmet>

      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">

        {!user ? (

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-800 p-8 rounded-2xl w-full max-w-md border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Iniciar Sesión
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">

              <div>
                <label className="text-sm text-slate-400">Correo</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={signingIn}
                className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium text-white flex items-center justify-center"
              >
                {signingIn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Iniciar Sesión
              </button>

            </form>
          </motion.div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">

            <button
              onClick={() => navigate('/clientes-artek')}
              className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-left hover:border-blue-500 transition"
            >
              <h2 className="text-xl font-bold text-white mb-2">
                Clientes Artek
              </h2>
              <span className="text-blue-400 flex items-center">
                Acceder <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-left hover:border-indigo-500 transition"
            >
              <h2 className="text-xl font-bold text-white mb-2">
                Equipo
              </h2>
              <span className="text-indigo-400 flex items-center">
                Ir al Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </button>

          </div>

        )}

      </div>
    </>
  );
};

export default AccessPage;