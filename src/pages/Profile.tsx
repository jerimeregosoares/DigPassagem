import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfileData(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = profileData?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const displayEmail = user?.email || 'Email não disponível';
  const displayPhone = profileData?.phone || 'Não informado';
  const displayCpf = profileData?.cpf || 'Não informado';
  const displayAvatar = profileData?.avatar_url || `https://ui-avatars.com/api/?name=${displayName}&background=6366F1&color=fff`;

  return (
    <div className="bg-[#F9FAFB] dark:bg-[#0F0F0F] text-slate-900 dark:text-slate-100 min-h-screen pb-24 font-sans">
      <header className="sticky top-0 z-50 bg-[#F9FAFB]/80 dark:bg-[#0F0F0F]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#6366F1] flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">Dig</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight">Minha Conta</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-500 dark:text-slate-400">
            <span className="material-icons-round">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F9FAFB] dark:border-[#0F0F0F]"></span>
          </button>
          <button className="p-2 text-slate-500 dark:text-slate-400">
            <span className="material-icons-round">settings</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="relative">
            <img 
              alt="Profile Picture" 
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#6366F1]/20" 
              src={displayAvatar} 
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 bg-[#6366F1] text-white p-1.5 rounded-lg shadow-lg">
              <span className="material-icons-round text-xs">edit</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">{loading ? 'Carregando...' : displayName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{displayEmail}</p>
          </div>
        </div>

        <section className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Dados principais</h3>
            <button className="p-2 bg-[#6366F1]/10 text-[#6366F1] rounded-lg">
              <span className="material-icons-round text-lg">edit</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome</label>
              <p className="text-sm font-medium">{loading ? '...' : displayName}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <p className="text-sm font-medium truncate">{loading ? '...' : displayEmail}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Cpf</label>
              <p className="text-sm font-medium text-slate-400 dark:text-slate-600 italic">{loading ? '...' : displayCpf}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Telefone</label>
              <p className="text-sm font-medium">{loading ? '...' : displayPhone}</p>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center">
              <span className="material-icons-round text-slate-400">camera_alt</span>
            </div>
            <div>
              <h3 className="text-base font-semibold">Adicionar foto de perfil</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Recomendamos as dimensões: <span className="text-slate-700 dark:text-slate-200 font-medium">100px por 50px</span></p>
            </div>
          </div>
          <button className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#6366F1]/20">
            <span>Adicionar</span>
            <span className="material-icons-round text-lg">add_a_photo</span>
          </button>
        </section>

        <section className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-sm">
          <h3 className="text-base font-semibold mb-2">Resetar senha</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Você receberá um link via email para redefinir a sua senha de acesso com segurança.
          </p>
          <button className="w-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-white/5 transition-all active:scale-95">
            <span className="material-icons-round text-[#6366F1] text-lg">link</span>
            <span>Enviar link de recuperação</span>
          </button>
        </section>

        <button 
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
        >
          <span className="material-icons-round text-base">logout</span>
          Sair do aplicativo
        </button>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-6 pb-8 pt-3 flex justify-between items-center z-50">
        <Link to="/dashboard" className="flex flex-col items-center gap-1 group">
          <span className="material-icons-round text-slate-400 group-active:scale-90 transition-transform">confirmation_number</span>
          <span className="text-[10px] font-medium text-slate-500">Embarcações</span>
        </Link>
        <div className="flex flex-col items-center gap-1 group">
          <span className="material-icons-round text-slate-400 group-active:scale-90 transition-transform">people_alt</span>
          <span className="text-[10px] font-medium text-slate-500">Afiliados</span>
        </div>
        <Link to="/campaigns/new" className="flex flex-col items-center gap-1 group">
          <div className="bg-[#6366F1] p-2.5 rounded-2xl -mt-8 shadow-xl shadow-[#6366F1]/30 ring-4 ring-[#F9FAFB] dark:ring-[#0F0F0F]">
            <span className="material-icons-round text-white">add</span>
          </div>
          <span className="text-[10px] font-bold text-[#6366F1]">Novo</span>
        </Link>
        <div className="flex flex-col items-center gap-1 group">
          <span className="material-icons-round text-slate-400 group-active:scale-90 transition-transform">insights</span>
          <span className="text-[10px] font-medium text-slate-500">Pixels</span>
        </div>
        <div className="flex flex-col items-center gap-1 group">
          <span className="material-icons-round text-[#6366F1] group-active:scale-90 transition-transform">person</span>
          <span className="text-[10px] font-bold text-[#6366F1]">Conta</span>
        </div>
      </nav>
      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 dark:bg-white/20 rounded-full"></div>
    </div>
  );
}
