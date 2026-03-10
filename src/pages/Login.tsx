import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-[#121212] text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-slate-200 dark:border-slate-800 flex flex-col pt-12">

        <div className="flex-1 overflow-y-auto px-8 pt-8 pb-12">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-[#6366f1] p-4 rounded-2xl rotate-3 shadow-lg mb-6">
              <div className="flex items-center">
                <span className="text-3xl font-black text-white tracking-tighter italic">Dig</span>
                <div className="flex flex-col items-center ml-1 bg-green-400 px-1 rounded">
                  <span className="text-[#6366f1] font-black text-lg leading-none">Passagem</span>
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center tracking-tight mb-2">
              Entre na DigPassagem
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
              Preencha seus dados de acesso
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold ml-1">Seu email</label>
              <div className="relative">
                <input
                  className="w-full bg-slate-100 dark:bg-[#181818] border-transparent focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 rounded-2xl py-4 px-4 transition-all duration-200"
                  placeholder="exemplo@exemplo.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold">Senha</label>
                <a className="text-[#6366f1] text-xs font-semibold hover:underline" href="#">Esqueceu a senha?</a>
              </div>
              <div className="relative group">
                <input
                  className="w-full bg-slate-100 dark:bg-[#181818] border-transparent focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 rounded-2xl py-4 px-4 transition-all duration-200"
                  placeholder="******"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              className="w-full bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#6366f1]/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? 'Entrando...' : 'Entrar'}</span>
            </button>
          </form>

          <div className="mt-12 text-center">
            <a className="text-slate-400 dark:text-slate-500 text-xs flex items-center justify-center space-x-1" href="#">
              <span className="material-icons-round text-sm">help_outline</span>
              <span>Precisa de ajuda? Fale conosco</span>
            </a>
          </div>
        </div>

        <div className="h-8 flex justify-center items-end pb-2">
          <div className="w-32 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
        </div>
      </div>

      <button
        className="fixed bottom-6 right-6 w-12 h-12 bg-white dark:bg-[#1e1e1e] rounded-full shadow-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 transition-transform active:scale-90"
        onClick={() => document.documentElement.classList.toggle('dark')}
      >
        <span className="material-icons-round text-[#6366f1] dark:text-yellow-400">dark_mode</span>
      </button>
    </div>
  );
}
