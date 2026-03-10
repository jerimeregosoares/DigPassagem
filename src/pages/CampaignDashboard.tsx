import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useCampaign } from '../context/CampaignContext';
import { usePayment } from '../context/PaymentContext';
import { supabase } from '../lib/supabaseClient';

export default function CampaignDashboard() {
  const navigate = useNavigate();
  const { campaigns, loading, deleteCampaign, updateCampaign, refreshCampaigns } = useCampaign();
  const { pixManual } = usePayment();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [campaignStats, setCampaignStats] = useState<Record<string, number>>({});
  const [showBalance, setShowBalance] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filter, setFilter] = useState('Todas');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === 'Todas') return true;
    if (filter === 'Ativas') return c.status === 'Ativa';
    if (filter === 'Pendentes') return c.status === 'Pendente';
    if (filter === 'Encerradas') return c.status === 'Encerrada';
    return true;
  });

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all approved purchases for user's campaigns
      const { data } = await supabase
        .from('historico_vendas')
        .select('total_value, tickets, transporte_id, transportes!inner(user_id)')
        .eq('status', 'approved')
        .eq('campaigns.user_id', user.id);

      if (data) {
        // Calculate total revenue
        const total = data.reduce((sum, p) => sum + Number(p.total_value), 0);
        setTotalRevenue(total);

        // Calculate sold tickets per campaign
        const stats: Record<string, number> = {};
        data.forEach((p: any) => {
          const count = p.tickets ? p.tickets.length : 0;
          stats[p.transporte_id] = (stats[p.transporte_id] || 0) + count;
        });
        setCampaignStats(stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchDashboardData();
  }, [campaigns]); // Refresh when campaigns change

  return (
    <div className="bg-[#F9FAFB] dark:bg-[#121212] text-slate-900 dark:text-slate-100 min-h-screen font-sans flex">
      {/* Sidebar for Desktop */}
      <div className="hidden lg:block h-screen sticky top-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-screen relative" onClick={() => {
        isFilterOpen && setIsFilterOpen(false);
      }}>
        {/* Header */}
        <Header />

        <main className="px-4 py-2 space-y-6 pb-24 lg:pb-8 lg:px-8 max-w-5xl w-full">

          {/* Greeting */}
          <div className="flex items-center gap-2">
            <span className="text-xl">👋</span>
            <h1 className="text-xl font-bold">Olá, Jérime Rêgo</h1>
          </div>

          {/* Total Revenue Card - Image 1/2 */}
          <div className="bg-[#1E1E1E] rounded-2xl border border-slate-800 p-6 flex items-center justify-between group hover:border-[#6366F1]/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#6366F1]/10 rounded-xl flex items-center justify-center">
                <span className="material-icons-round text-[#6366F1] text-2xl">payments</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total arrecadado</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">
                    {showBalance ? `R$ ${totalRevenue.toFixed(2).replace('.', ',')}` : 'R$ ****'}
                  </h2>
                  <button onClick={() => setShowBalance(!showBalance)} className="text-slate-500 hover:text-white transition-colors">
                    <span className="material-icons-round text-lg">{showBalance ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
            </div>
            {/* Small decorative sparkline element or similar could go here */}
          </div>

          {/* Configuration Alert */}
          {!pixManual.isConfigured && (
            <div className="bg-[#1e1b2e] border border-[#6366F1]/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-[#6366F1]/20 p-1.5 rounded-lg">
                  <span className="material-icons-outlined text-[#6366F1] text-xl">layers</span>
                </div>
                <div>
                  <h3 className="text-[#6366F1] font-semibold text-sm">Forma de recebimento</h3>
                  <p className="text-[#6366F1]/70 text-xs mt-0.5">Você ainda não configurou uma forma para receber os pagamentos na sua conta</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/pix')}
                className="bg-[#6366F1] hover:bg-[#5558dd] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap w-full sm:w-auto"
              >
                Configurar
              </button>
            </div>
          )}

          {/* Create Campaign Button & Filter - Now at the Top of List (as per Image 1) */}
          <div className="flex gap-2 relative">
            <Link
              to="/campaigns/new"
              onClick={() => sessionStorage.removeItem('draft_campaign')}
              className="flex-1 bg-[#6366F1] hover:bg-[#5558dd] text-white font-bold py-4 rounded-xl flex items-center justify-center shadow-lg shadow-[#6366F1]/20 transition-all active:scale-[0.98] ring-1 ring-white/10"
            >
              Nova embarcação
            </Link>
            <button
              onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); }}
              className="bg-[#1E1E1E] border border-slate-800 text-slate-400 hover:text-white w-14 rounded-xl flex items-center justify-center transition-colors relative active:scale-95"
            >
              <span className="material-icons-outlined">tune</span>
              {campaigns.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#1E1E1E]">
                  {campaigns.length}
                </span>
              )}
              {filter !== 'Todas' && (
                <span className="absolute top-3 right-3 w-2 h-2 bg-[#6366F1] rounded-full ring-2 ring-[#1E1E1E]"></span>
              )}
            </button>

            {/* Filter Dropdown */}
            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-[#181818] border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl bg-opacity-95">
                <div className="p-3 border-b border-slate-800 bg-white/5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status da embarcação</span>
                </div>
                <div className="p-1">
                  {['Todas', 'Ativas', 'Pendentes', 'Encerradas'].map((status) => (
                    <button
                      key={status}
                      onClick={() => { setFilter(status); setIsFilterOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 text-sm rounded-lg flex items-center gap-3 transition-colors ${filter === status ? 'bg-[#6366F1]/10 text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${filter === status ? 'bg-[#6366F1] ring-4 ring-[#6366F1]/20' : 'bg-slate-700'}`}></div>
                      <span>{status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Campaigns List or Empty State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm animate-pulse">Carregando suas embarcações...</p>
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <div className="space-y-6 pt-2">
              {filteredCampaigns.map(campaign => (
                <div key={campaign.id} className="bg-[#1E1E1E] rounded-2xl border border-slate-800/60 overflow-hidden hover:border-slate-700/80 transition-all group">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                          {(() => {
                            let imgUrl = campaign.image || '';
                            if (typeof imgUrl === 'string' && (imgUrl.trim().startsWith('[') || imgUrl.trim().startsWith('{'))) {
                              try {
                                const parsed = JSON.parse(imgUrl);
                                imgUrl = Array.isArray(parsed) ? parsed[0] : imgUrl;
                              } catch (e) { }
                            }
                            return (
                              <img
                                src={imgUrl || "https://via.placeholder.com/400x400?text=Sem+Imagem"}
                                alt={campaign.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            );
                          })()}
                        </div>
                        <h3 className="text-xl font-bold text-white leading-tight">{campaign.title}</h3>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (statusChangingId === campaign.id) {
                            const nextStatus = campaign.status === 'Ativa' ? 'Inativa' : 'Ativa';
                            updateCampaign(campaign.id, { status: nextStatus });
                            setStatusChangingId(null);
                          } else {
                            setStatusChangingId(campaign.id);
                            setTimeout(() => setStatusChangingId(null), 3000);
                          }
                        }}
                        className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${campaign.status === 'Ativa'
                          ? (statusChangingId === campaign.id ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10')
                          : ['completed', 'Encerrada'].includes(campaign.status)
                            ? 'border-blue-500/30 text-blue-500 bg-blue-500/10'
                            : (statusChangingId === campaign.id ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 'border-orange-500/30 text-orange-500 bg-orange-500/10')
                          }`}>
                        {statusChangingId === campaign.id ? 'Certeza?' : (campaign.status === 'completed' ? 'Encerrada' : campaign.status)}
                      </button>
                    </div>

                    {['Ativa', 'completed', 'Encerrada'].includes(campaign.status) ? (
                      <div className="flex flex-col gap-5">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                              <span className="material-icons-round text-sm text-[#6366F1]">poll</span>
                              <span>Progresso da passagem {(() => {
                                const sold = campaignStats[campaign.id] || 0;
                                const total = campaign.ticketQuantity || 0;
                                const pct = total > 0 ? (sold / total) * 100 : 0;
                                return Math.min(pct, 100).toFixed(0);
                              })()}%</span>
                            </div>
                            <span className="text-xs text-slate-300 font-bold">
                              {campaignStats[campaign.id] || 0}/{campaign.ticketQuantity || 0}
                            </span>
                          </div>
                          <div className="w-full bg-slate-800/50 rounded-full h-2.5 p-0.5">
                            <div
                              className="bg-gradient-to-r from-[#6366F1] to-[#818cf8] h-1.5 rounded-full relative transition-all duration-500"
                              style={{
                                width: `${(() => {
                                  const sold = campaignStats[campaign.id] || 0;
                                  const total = campaign.ticketQuantity || 0;
                                  const pct = total > 0 ? (sold / total) * 100 : 0;
                                  return Math.min(pct, 100);
                                })()}%`
                              }}
                            >
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Link to={`/campaigns/${campaign.id}/manage`} className="flex-1 bg-[#252525] border border-slate-700 hover:border-slate-500 hover:bg-[#2d2d2d] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all">
                            <span className="material-icons-outlined text-lg">settings</span>
                            Gerenciar
                          </Link>
                          {deletingId === campaign.id ? (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await deleteCampaign(campaign.id);
                                  setDeletingId(null);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl flex flex-1 items-center justify-center transition-all shadow-lg animate-in fade-in"
                            >
                              Confirma?
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(campaign.id);
                                setTimeout(() => setDeletingId(null), 3000);
                              }}
                              className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-500 font-semibold py-3.5 px-5 rounded-xl flex items-center justify-center transition-all bg-white dark:bg-[#1e1e1e]"
                              title="Excluir embarcação"
                            >
                              <span className="material-icons-outlined text-xl">delete_outline</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {/* Status Pending info if any could go here */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              updateCampaign(campaign.id, { status: 'Ativa' });
                            }}
                            className="flex-[2] bg-[#10B981] hover:bg-[#12d393] text-[#064e3b] font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <span className="material-icons-round text-lg">rocket_launch</span>
                            Publicar
                          </button>
                          <Link to={`/campaigns/${campaign.id}/setup`} className="flex-1 bg-[#252525] border border-slate-700 hover:border-slate-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all">
                            <span className="material-icons-outlined text-lg">settings</span>
                          </Link>

                          {deletingId === campaign.id ? (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await deleteCampaign(campaign.id);
                                  setDeletingId(null);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl flex flex-1 items-center justify-center transition-all shadow-lg animate-in fade-in"
                            >
                              Confirma?
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(campaign.id);
                                setTimeout(() => setDeletingId(null), 3000);
                              }}
                              className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-500 font-semibold py-3.5 px-5 rounded-xl flex items-center justify-center transition-all bg-white dark:bg-[#1e1e1e]"
                              title="Excluir embarcação"
                            >
                              <span className="material-icons-outlined text-xl">delete_outline</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-white/5 px-6 py-3 border-t border-slate-800/50 flex justify-center">
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                      Criada em {campaign.created}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Empty State */}
              <div className="text-center py-16 bg-[#181818] rounded-3xl border border-dashed border-slate-800">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-icons-round text-slate-600 text-3xl">sentiment_dissatisfied</span>
                </div>
                <h3 className="text-white font-bold mb-1">Nenhuma embarcação encontrada</h3>
                <p className="text-slate-500 text-sm mb-6">Tente ajustar seus filtros ou cadastre uma nova embarcação.</p>
                <button
                  onClick={() => refreshCampaigns()}
                  className="bg-[#252525] border border-slate-700 hover:border-slate-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all inline-flex items-center gap-2"
                >
                  <span className="material-icons-round text-sm">refresh</span>
                  Recarregar
                </button>
              </div>
            </div>
          )}

          {/* Learn Section - Only when needed or at the bottom */}
          {campaigns.length === 0 && (
            <div className="mt-8">
              <h3 className="text-white font-bold text-center mb-2">Aprenda a criar uma passagem</h3>
              <p className="text-slate-400 text-xs text-center mb-6">Criamos um video explicando todos os passso para você criar sua campanha</p>

              <div className="bg-gradient-to-br from-[#6366F1] to-[#4F46E5] rounded-xl p-4 flex items-center justify-between relative overflow-hidden group cursor-pointer shadow-xl shadow-[#6366F1]/10">
                <div className="flex items-center gap-3 z-10">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <span className="material-icons-round text-white">play_arrow</span>
                  </div>
                  <span className="text-white font-bold text-sm">Como cadastrar uma embarcação online</span>
                </div>
                <div className="flex items-center gap-4 text-white/80 text-xs z-10">
                  <div className="flex flex-col items-center">
                    <span className="material-icons-round text-lg">schedule</span>
                    <span>Assistir</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="material-icons-round text-lg">share</span>
                    <span>Compartilhar</span>
                  </div>
                </div>

                {/* Decorative circles */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute left-1/2 top-1/2 w-32 h-32 bg-purple-500/20 rounded-full blur-xl"></div>
              </div>
            </div>
          )}

        </main>
      </div >

      {/* Mobile Bottom Nav */}
      < nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-6 py-2 pb-6 z-50" >
        <div className="flex justify-between items-center">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-[#6366F1]">
            <span className="material-icons-outlined">campaign</span>
            <span className="text-[10px] font-medium">Embarcações</span>
          </Link>
          <button className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-icons-outlined">group</span>
            <span className="text-[10px] font-medium">Afiliados</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-icons-outlined">account_balance_wallet</span>
            <span className="text-[10px] font-medium">Financeiro</span>
          </button>
          <Link to="/profile" className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-icons-outlined">person_outline</span>
            <span className="text-[10px] font-medium">Perfil</span>
          </Link>
        </div>
      </nav >
    </div >
  );
}
