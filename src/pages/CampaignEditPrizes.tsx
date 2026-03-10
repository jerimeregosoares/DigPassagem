import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCampaign } from '../context/CampaignContext';

export default function CampaignEditPrizes() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { campaigns, updateCampaign, deleteCampaign, addCampaign } = useCampaign();
  const campaign = id === 'new'
    ? { title: 'Nova Embarcação', id: 'new', ticketValue: '0,00' } // Placeholder for render before effect
    : campaigns.find(c => c.id === id || c.slug === id);

  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);

  useEffect(() => {
    if (id === 'new') {
      const draftStr = sessionStorage.getItem('draft_campaign');
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          setDraftData(draft);
        } catch (e) { }
      } else {
        navigate('/campaigns/new');
      }
    }
  }, [id, navigate]);

  // Use draftData if new
  const activeCampaign = id === 'new' ? (draftData || campaign) : campaign;

  // Promo Modal State
  const [promoTickets, setPromoTickets] = useState('');
  const [promoTotalValue, setPromoTotalValue] = useState('');

  const handleAddPromo = () => {
    console.log('Adding promo:', { tickets: promoTickets, totalValue: promoTotalValue });
    setIsPromoModalOpen(false);
    setPromoTickets('');
    setPromoTotalValue('');
  };

  const handleFinalize = async () => {
    if (saving) return;

    if (id === 'new' && draftData) {
      try {
        setSaving(true);
        const finalCampaign = { ...draftData };
        await addCampaign(finalCampaign);
        sessionStorage.removeItem('draft_campaign');
        navigate('/dashboard');
      } catch (err: any) {
        console.error(err);
        setSaving(false);
        if (err.message?.includes('campaigns_slug_key') || err.message?.includes('slug')) {
          alert('Erro: Já existe uma embarcação com este nome (URL duplicada). Por favor, volte e altere o nome ou tente novamente.');
        } else {
          alert(`Erro ao cadastrar embarcação: ${err.message || 'Verifique sua conexão.'}`);
        }
      }
    } else if (campaign) {
      try {
        setSaving(true);
        await updateCampaign(campaign.id, {
          status: 'Ativa'
        });
        navigate('/dashboard');
      } catch (err) {
        console.error(err);
        setSaving(false);
        alert('Erro ao finalizar embarcação.');
      }
    }
  };

  if (!activeCampaign) {
    return (
      <div className="bg-[#f9fafb] dark:bg-[#121212] min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando etapa final...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f9fafb] dark:bg-[#121212] text-slate-900 dark:text-slate-100 min-h-screen pb-20 font-sans">
      <nav className="sticky top-0 z-50 bg-[#f9fafb]/80 dark:bg-[#121212]/80 backdrop-blur-md border-b border-gray-200 dark:border-[#2d2d2d] px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[#6366f1] p-1.5 rounded-lg">
            <span className="text-white font-bold text-lg leading-none">DigPassagem</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isDeleting ? (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await deleteCampaign(id!);
                  navigate('/dashboard');
                } catch (err) {
                  console.error(err);
                }
              }}
              className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg animate-in fade-in transition-all"
            >
              Certeza?
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(true);
                setTimeout(() => setIsDeleting(false), 3000);
              }}
              className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Excluir embarcação"
            >
              <span className="material-icons-round">delete_outline</span>
            </button>
          )}
          <button className="relative text-slate-500 dark:text-slate-400">
            <span className="material-icons-round">notifications</span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#f9fafb] dark:border-[#121212]">1</span>
          </button>
          <button className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 bg-gray-100 dark:bg-[#1e1e1e] px-3 py-1.5 rounded-full border border-gray-200 dark:border-[#2d2d2d]">
            <span className="material-icons-round text-lg">computer</span>
            Sistema
            <span className="material-icons-round text-sm">expand_more</span>
          </button>
        </div>
      </nav>

      <main className="max-w-md mx-auto p-4 space-y-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1e1e1e] rounded-full transition-colors">
              <span className="material-icons-round">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold">Editando: {activeCampaign.title}</h1>
          </div>

          <div className="relative px-4 flex justify-between items-center h-10">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 px-8">
              <div className="h-0.5 bg-[#6366f1] w-full relative z-0"></div>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#6366f1] text-white flex items-center justify-center shadow-lg shadow-[#6366f1]/30 ring-4 ring-[#f9fafb] dark:ring-[#121212]">
                <span className="material-icons-round text-xl">confirmation_number</span>
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#6366f1] text-white flex items-center justify-center shadow-lg shadow-[#6366f1]/30 ring-4 ring-[#f9fafb] dark:ring-[#121212]">
                <span className="material-icons-round text-xl">image</span>
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#6366f1] text-white flex items-center justify-center shadow-lg shadow-[#6366f1]/30 ring-4 ring-[#f9fafb] dark:ring-[#121212]">
                <span className="material-icons-round text-xl">redeem</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-2 px-1 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            <span className="text-[#6366f1]">GERAL</span>
            <span className="text-[#6366f1]">MÍDIA</span>
            <span className="text-[#6366f1]">PROMOÇÕES</span>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PROMOÇÕES (OPCIONAL)</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setIsPromoModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-700 hover:border-[#6366f1] transition-all bg-[#1e1e1e] group"
            >
              <span className="font-medium text-slate-300 group-hover:text-white">Adicionar promoções</span>
            </button>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f9fafb]/90 dark:bg-[#121212]/90 backdrop-blur-lg border-t border-gray-200 dark:border-[#2d2d2d] flex items-center gap-3 max-w-md mx-auto z-40">
        <button onClick={() => id === 'new' ? navigate('/campaigns/new/media') : navigate(`/campaigns/${id}/media`)} className="flex-shrink-0 px-6 py-3 bg-[#1e1e1e] border border-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#2d2d2d] transition-colors">
          <span className="material-icons-round text-lg">chevron_left</span>
          Voltar
        </button>
        <button
          onClick={handleFinalize}
          disabled={saving}
          className={`flex-grow py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${saving ? 'bg-slate-500 cursor-not-allowed opacity-70' : 'bg-[#6366f1] shadow-indigo-500/20 active:scale-95 hover:bg-opacity-90'}`}
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Salvando...
            </>
          ) : (
            <>
              Salvar embarcação
              <span className="material-icons-round text-lg">arrow_forward</span>
            </>
          )}
        </button>
      </div>

      {/* Promo Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1e1e1e] rounded-2xl w-full max-w-md border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">Nova Promoção</h3>
                  <p className="text-slate-400 text-sm mt-1">Adicione uma nova promoção para a sua campanha</p>
                </div>
                <button onClick={() => setIsPromoModalOpen(false)} className="text-slate-400 hover:text-white">
                  <span className="material-icons-round">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Quantidade lugares</label>
                  <input
                    type="number"
                    value={promoTickets}
                    onChange={(e) => setPromoTickets(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full bg-[#121212] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Valor total</label>
                  <input
                    type="text"
                    value={promoTotalValue}
                    onChange={(e) => setPromoTotalValue(e.target.value)}
                    placeholder="R$ 0,00"
                    className="w-full bg-[#121212] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                  />
                </div>

                <div className="bg-[#121212] rounded-xl p-4 space-y-2 border border-slate-800">
                  <p className="text-slate-400 text-sm">Valor passagem R$ {activeCampaign.ticketValue || '0,00'}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white font-medium">De R$ 0,00</span>
                    <span className="text-[#10B981] font-bold">Por apenas R$ 0,00</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddPromo}
                className="w-full bg-[#6366f1] hover:bg-[#5558dd] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                Adicionar +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
