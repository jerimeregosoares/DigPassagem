import React, { useState, useEffect } from 'react';
import { useCampaign } from '../context/CampaignContext';
import { supabase } from '../lib/supabaseClient';

interface DrawResult {
  ticket: string;
  prize: string;
  winnerName: string | null;
  winnerPhone: string | null;
  status: 'valid' | 'no_winner' | 'pending';
}

interface Campaign {
  id: string;
  title: string;
  ticketQuantity: number;
  drawResults?: DrawResult[] | any[]; // Support legacy strings and new objects
  prizes?: { id: string; title: string; description: string }[];
  webhookUrl?: string;
  status: string;
}

interface Winner {
  ticket: string;
  name: string;
  phone: string;
  prize: string;
}

interface RaffleManagerProps {
  campaign: Campaign;
}

/**
 * RaffleManager
 * 
 * Aesthetic Direction: Modern Dark UI
 * - Tone: Refined / Technical
 * - Palette: Dark gray backgrounds (#121212, #181818, #1E1E1E), Purple accents (#6366F1)
 * - Typography: Clean sans-serif, structural hierarchy
 * - Layout: Asymmetric but balanced, clear visual hierarchy
 * 
 * Implements the "Embarque da embarcação" interface with high-fidelity to the provided reference.
 */
export default function RaffleManager({ campaign }: RaffleManagerProps) {
  const { updateCampaign } = useCampaign();
  const [ticketNumber, setTicketNumber] = useState('');
  const [addedTickets, setAddedTickets] = useState<any[]>(campaign.drawResults || []);
  const [channel, setChannel] = useState('Loteria Federal');

  // Sync with campaign prop updates
  useEffect(() => {
    if (campaign.drawResults) {
      setAddedTickets(campaign.drawResults);
    }
  }, [campaign.drawResults]);

  // Helper to save tickets to DB
  const saveTickets = async (newTickets: any[]) => {
    setAddedTickets(newTickets);
    try {
      console.log('Iniciando salvamento de passagens:', newTickets);
      await updateCampaign(campaign.id, { drawResults: newTickets });
      console.log('Passagens salvos com sucesso!');
    } catch (error) {
      console.error('Falha ao salvar passagens no banco:', error);
      alert('Erro ao salvar no banco de dados! Verifique se você está logado e tem permissão.');
    }
  };

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState(campaign.webhookUrl || ''); // Initialize from DB first
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Winner | null>(null);
  const [processingDraw, setProcessingDraw] = useState(false);

  const [awardedPrizes, setAwardedPrizes] = useState<string[]>([]); // Track awarded prizes locally for now

  // Load webhook from DB
  useEffect(() => {
    if (campaign.webhookUrl) {
      setWebhookUrl(campaign.webhookUrl);
    }
  }, [campaign.webhookUrl]);

  // Cleanup legacy local storage
  useEffect(() => {
    const savedWebhook = localStorage.getItem('digpassagem_webhook_url');
    if (savedWebhook) localStorage.removeItem('digpassagem_webhook_url');
  }, []);

  const handleSaveWebhook = async (url: string) => {
    setWebhookUrl(url);

    // Save to DB ONLY
    try {
      console.log('Salvando webhook no banco:', url);
      await updateCampaign(campaign.id, { webhookUrl: url });
      console.log('Webhook salvo no banco com sucesso.');
    } catch (err: any) {
      console.error('Erro ao salvar webhook no banco:', err);
      const msg = err?.message || JSON.stringify(err);
      if (msg.includes('column') && msg.includes('does not exist')) {
        alert('Erro: A coluna "webhook_url" não existe no banco de dados. Por favor, execute o script SQL fornecido.');
      } else {
        alert(`Erro ao salvar webhook: ${msg}`);
      }
    }

    setIsWebhookModalOpen(false);
  };

  const handleToggleStatus = async () => {
    const newStatus = campaign.status === 'completed' ? 'active' : 'completed';
    const action = newStatus === 'completed' ? 'FINALIZAR' : 'REABRIR';

    if (!confirm(`Tem certeza que deseja ${action} a embarcação? \n\n${newStatus === 'completed' ? 'Isso encerrará as vendas e mostrará a tela de passageiros.' : 'Isso permitirá novas vendas.'}`)) return;

    try {
      await updateCampaign(campaign.id, { status: newStatus });
      alert(`Embarcação ${newStatus === 'completed' ? 'finalizada' : 'reaberta'} com sucesso!`);
      // Force reload or optimistic update if needed, but context should handle it
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar status.');
    }
  };

  const prizes = ['1º Destino', '2º Destino', '3º Destino', '4º Destino', '5º Destino'];

  const handleAddTicket = async () => {
    if (!ticketNumber) return;

    // Check duplicates REMOVED to allow multiple prizes for same ticket number if needed
    /*
    if (addedTickets.some((t: any) => (typeof t === 'string' ? t : t.ticket) === ticketNumber)) {
      alert('Passagem já adicionado');
      return;
    }
    */

    const nextPrizeIndex = addedTickets.length;
    if (nextPrizeIndex >= prizes.length) {
      alert('Todos os destinos já foram confirmados.');
      return;
    }
    const currentPrize = prizes[nextPrizeIndex];

    // Just add to list as pending
    const result: DrawResult = {
      ticket: ticketNumber,
      prize: currentPrize,
      winnerName: null,
      winnerPhone: null,
      status: 'pending'
    };

    saveTickets([...addedTickets, result]);
    setTicketNumber('');
  };

  const handleProcessDraw = async () => {
    const pendingTickets = addedTickets.filter(t => t.status === 'pending');

    if (pendingTickets.length === 0) {
      alert('Não há passagens pendentes para finalizar embarque.');
      return;
    }

    setProcessingDraw(true);
    let updatedTickets = [...addedTickets];
    let winnersFound: Winner[] = [];

    try {
      // Process each pending ticket
      for (let i = 0; i < updatedTickets.length; i++) {
        const ticket = updatedTickets[i];
        if (ticket.status !== 'pending') continue;

        const { data, error } = await supabase
          .from('historico_vendas')
          .select('*, clientes(name, phone)')
          .eq('transporte_id', campaign.id)
          .eq('status', 'approved')
          .contains('tickets', [parseInt(ticket.ticket)])
          .maybeSingle();

        if (error) {
          console.error(`Erro ao validar passagem ${ticket.ticket}:`, error);
          continue;
        }

        if (data) {
          const customer = data.clientes as any;
          const winnerName = customer?.name || 'Desconhecido';
          const winnerPhone = customer?.phone || '';

          updatedTickets[i] = {
            ...ticket,
            winnerName,
            winnerPhone,
            status: 'valid'
          };

          winnersFound.push({
            ticket: ticket.ticket,
            name: winnerName,
            phone: winnerPhone,
            prize: ticket.prize
          });

        } else {
          updatedTickets[i] = {
            ...ticket,
            status: 'no_winner'
          };
        }
      }

      await saveTickets(updatedTickets);

      // Show modal for the first winner found (or last processed if multiple)
      // Ideally we could show a list, but current modal supports one.
      // Let's show the most relevant one (first prize winner found in this batch?)
      if (winnersFound.length > 0) {
        setCurrentWinner(winnersFound[0]);
        setWinnerModalOpen(true);
      } else {
        alert('Embarque realizado. Nenhum passageiro encontrado para os passagens selecionados.');
      }

    } catch (err) {
      console.error('Erro no processamento do embarque:', err);
      alert('Ocorreu um erro ao processar o embarque.');
    } finally {
      setProcessingDraw(false);
    }
  };


  const handleRemoveTicket = (ticketVal: string) => {
    // Find index of item matching ticket value
    const index = addedTickets.findIndex(t => (typeof t === 'string' ? t : t.ticket) === ticketVal);

    if (index > -1) {
      const newTickets = [...addedTickets];
      newTickets.splice(index, 1);
      saveTickets(newTickets);
    }
  };

  // Helper to calculate intervals
  const getIntervals = (total: number) => {
    if (!total || total <= 0) return { start: '0', end: '0' };
    const maxVal = total - 1;
    const digits = String(maxVal).length;
    // Standard logic: pad with leading zeros to match the digits of maxVal
    // e.g. 1000 tickets -> max 999 (3 digits) -> 000-999
    // e.g. 2000 tickets -> max 1999 (4 digits) -> 0000-1999
    const start = '0'.repeat(digits);
    const end = String(maxVal).padStart(digits, '0');
    return { start, end };
  };

  const handleOpenExtractionModal = () => {
    if (!webhookUrl) {
      alert('Por favor, configure o Webhook antes de usar a Extração IA.');
      setIsWebhookModalOpen(true);
      return;
    }
    setIsExtractionModalOpen(true);
  };

  const handleSelectPrize = async (prize: string) => {
    setLoadingWebhook(true);
    setIsExtractionModalOpen(false);

    try {
      const { start, end } = getIntervals(campaign.ticketQuantity);

      const payload = {
        campaign_name: campaign.title,
        total_tickets: String(campaign.ticketQuantity),
        interval_start: start,
        interval_end: end,
        prize: prize
      };

      console.log('Sending payload to webhook:', payload);

      // Try fetching with JSON and expecting response first
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.ticket) {
            const ticket = String(data.ticket);
            // ONLY set input, do NOT save automatically
            setTicketNumber(ticket);
            return;
          }
        }
      } catch (corsError) {
        console.warn('CORS or Network error on standard fetch, trying no-cors fallback:', corsError);
      }

      // Fallback: If CORS blocked the first request (common with n8n default settings),
      // we try again with no-cors. Note: We CANNOT get the ticket back in this mode.
      // This is a "best effort" to ensure the trigger happens even if the UI can't update automatically.
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      alert(`Solicitação enviada para o Webhook (Modo Silencioso). Verifique se o embarque foi processado no n8n. Nota: O passagem não pôde ser lido automaticamente devido a restrições de segurança (CORS).`);
      setAwardedPrizes(prev => [...prev, prize]); // Optimistically mark as awarded

    } catch (error) {
      console.error('Error sending webhook:', error);
      alert('Erro ao enviar solicitação para o Webhook.');
    } finally {
      setLoadingWebhook(false);
    }
  };

  // Determine which prize is next in sequence based on added tickets
  const getNextPrizeIndex = () => addedTickets.length;

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Webhook Configuration Modal */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsWebhookModalOpen(false)}>
          <div
            className="bg-[#1E1E1E] w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Configurar Webhook n8n</h3>
              <button onClick={() => setIsWebhookModalOpen(false)} className="text-slate-400 hover:text-white">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <p className="text-sm text-slate-400">
              Insira a URL do seu webhook n8n para integração com a Extração IA.
            </p>
            <input
              type="text"
              placeholder="https://seu-n8n.com/webhook/..."
              defaultValue={webhookUrl}
              className="w-full bg-[#121212] border border-[#333] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
              id="webhook-input"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsWebhookModalOpen(false)}
                className="px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('webhook-input') as HTMLInputElement;
                  handleSaveWebhook(input.value);
                }}
                className="bg-[#6366F1] hover:bg-[#5558DD] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                Salvar Webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extraction Prize Selection Modal */}
      {isExtractionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsExtractionModalOpen(false)}>
          <div
            className="bg-[#1E1E1E] w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-white">Selecionar Destino</h3>
              <button onClick={() => setIsExtractionModalOpen(false)} className="text-slate-400 hover:text-white">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Selecione o próximo destino a ser confirmado. A sequência deve ser respeitada.
            </p>

            <div className="flex flex-col gap-2">
              {prizes.map((prize, index) => {
                const isNext = index === getNextPrizeIndex();
                const isAwarded = index < getNextPrizeIndex();

                if (isAwarded) return null;

                return (
                  <button
                    key={prize}
                    onClick={() => isNext && handleSelectPrize(prize)}
                    disabled={!isNext}
                    className={`w-full border font-medium py-3 rounded-xl transition-all flex items-center justify-between px-4 group ${isNext
                        ? 'bg-[#121212] hover:bg-[#252525] border-[#333] hover:border-[#6366F1] text-slate-200 hover:text-white cursor-pointer'
                        : 'bg-[#121212]/50 border-[#333]/50 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                  >
                    <span>{prize}</span>
                    {isNext && <span className="material-icons-outlined text-slate-500 group-hover:text-[#6366F1] text-sm">arrow_forward_ios</span>}
                    {!isNext && <span className="material-icons-outlined text-slate-700 text-sm">lock</span>}
                  </button>
                );
              })}
              {getNextPrizeIndex() >= 5 && (
                <p className="text-center text-slate-500 text-sm py-4">Todos os destinos já foram confirmados.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Winner Modal */}
      {winnerModalOpen && currentWinner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setWinnerModalOpen(false)}>
          <div
            className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-6 relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setWinnerModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <span className="material-icons-outlined">close</span>
            </button>

            <div className="pt-2">
              <h3 className="text-xl font-bold text-slate-900 mb-1">Finalizar Embarque passagem</h3>
              <p className="text-sm text-slate-500">Sorteie a passagem e veja quem são os passageiroes</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm text-left p-6 space-y-4">
              <h4 className="text-lg font-bold text-slate-900">Lista de passageiroes</h4>
              <p className="text-sm text-slate-500 pb-2">Abaixo estão os passageiroes da sua embarcação</p>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">{currentWinner.prize}</p>
                  <p className="text-sm text-slate-600 font-medium">{campaign.title}</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">Passagem confirmado</p>
                  <p className="text-lg text-slate-900 font-bold">{currentWinner.ticket}</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">Nome</p>
                  <p className="text-base text-slate-700 font-medium">{currentWinner.name}</p>
                </div>

                <a
                  href={`https://wa.me/${currentWinner.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${currentWinner.name}, parabéns! Você foi o passageiro do ${currentWinner.prize} na passagem ${campaign.title} com o número ${currentWinner.ticket}!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-[#6366F1]/25 text-center"
                >
                  Chamar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-[#181818] rounded-2xl p-6 border border-[#2A2A2A] shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
            <span className="material-icons-outlined text-[#6366F1] text-3xl">emoji_events</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">Embarque da embarcação</h2>
              {/* Status Badge */}
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${campaign.status === 'completed'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                  : 'bg-amber-500/10 border-amber-500 text-amber-500'
                }`}>
                {campaign.status === 'completed' ? 'Finalizada' : 'Em Andamento'}
              </span>
            </div>
            <p className="text-sm text-slate-400 font-medium mt-1 max-w-lg truncate">{campaign.title}</p>
          </div>
        </div>

        <div className="w-full md:w-auto min-w-[240px]">
          <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-2 block pl-1">Canal de embarque</label>
          <div className="relative">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full bg-[#121212] hover:bg-[#161616] border border-[#333] hover:border-[#444] text-white text-sm font-medium rounded-xl pl-4 pr-10 py-3 appearance-none focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 transition-all cursor-pointer shadow-sm"
            >
              <option value="Loteria Federal">Loteria Federal</option>
              <option value="Manual">Manual</option>
            </select>
            <span className="material-icons-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xl">expand_more</span>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-[#181818] rounded-2xl p-6 border border-[#2A2A2A] shadow-lg space-y-8">

        {/* Mode Section */}
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-white">Modo</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setChannel('Loteria Federal')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold border transition-all flex items-center gap-2 ${channel === 'Loteria Federal'
                  ? 'bg-[#6366F1]/10 border-[#6366F1] text-[#6366F1] shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  : 'bg-transparent border-[#333] text-slate-400 hover:border-[#555] hover:text-white'
                }`}
            >
              Loteria Federal
            </button>
            {/* Placeholder for other modes if needed */}
          </div>
        </div>

        {/* Ticket Input Section */}
        <div>
          <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-3 block pl-1">Nº passagem</label>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <input
              type="text"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="numero do passagem"
              className="w-full sm:w-1/3 bg-[#121212] border border-[#333] text-white text-sm font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 transition-all placeholder:text-slate-600 shadow-inner"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTicket()}
            />
            <button
              onClick={handleAddTicket}
              disabled={!ticketNumber}
              className="px-5 py-2.5 rounded-full text-xs font-bold border transition-all flex items-center justify-center gap-2 bg-[#6366F1]/10 border-[#6366F1] text-[#6366F1] shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:bg-[#6366F1]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6366F1]/10"
            >
              Adicionar
            </button>
            <button
              onClick={handleOpenExtractionModal}
              disabled={loadingWebhook}
              className="flex-1 px-6 py-3 rounded-xl bg-transparent border border-[#333] hover:border-[#6366F1] hover:bg-[#6366F1]/5 text-white disabled:opacity-40 disabled:hover:border-[#333] disabled:hover:bg-transparent text-sm font-bold transition-all flex items-center justify-center gap-2 min-w-[140px]"
            >
              {loadingWebhook ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="material-icons-outlined text-base">auto_awesome</span>
              )}
              {loadingWebhook ? 'Enviando...' : 'Extração IA'}
            </button>
            <button
              onClick={() => setIsWebhookModalOpen(true)}
              className="px-4 py-3 rounded-xl bg-[#1E1E1E] border border-[#333] hover:border-slate-500 text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
              title={webhookUrl ? "Webhook Configurado" : "Configurar Webhook"}
            >
              <span className={`material-icons-outlined text-base ${webhookUrl ? 'text-emerald-500' : ''}`}>webhook</span>
              <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">Webhook</span>
            </button>
          </div>
        </div>

        {/* Results / List */}
        <div>
          {addedTickets.length === 0 ? (
            <div className="rounded-xl border border-[#6366F1]/20 bg-[#1E1B4B]/30 p-8 flex flex-col justify-center text-center min-h-[150px]">
              <span className="text-[#818CF8] text-sm font-semibold">Nenhum passagem adicionado</span>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider pb-4 border-b border-[#333] mb-2 px-4">
                <span className="w-24 text-left">Posição</span>
                <span className="flex-1 text-center">Passagem</span>
                <span className="w-12"></span>
              </div>

              <div className="flex flex-col">
                {addedTickets.map((item, index) => {
                  const ticketVal = typeof item === 'string' ? item : item.ticket;
                  const winnerName = typeof item === 'object' && item.winnerName ? item.winnerName : null;
                  const status = typeof item === 'object' ? item.status : 'valid'; // legacy fallback

                  return (
                    <div key={ticketVal} className="flex items-center justify-between py-4 px-4 border-b border-[#333] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <div className="w-24 flex flex-col">
                        <span className="text-white font-bold text-lg">{index + 1}º</span>
                        <span className="text-[10px] text-slate-500 uppercase">{prizes[index] || 'Destino'}</span>
                      </div>

                      <div className="flex-1 flex flex-col items-center">
                        <span className="text-slate-200 font-black text-2xl tracking-wider">{ticketVal}</span>
                        {status === 'pending' && (
                          <span className="text-amber-500 text-xs font-bold bg-amber-500/10 px-2 py-0.5 rounded mt-1 border border-amber-500/20 animate-pulse">
                            Aguardando Embarque
                          </span>
                        )}
                        {status === 'valid' && winnerName && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="material-icons-round text-emerald-500 text-xs">emoji_events</span>
                            <span className="text-emerald-400 text-xs font-bold">{winnerName}</span>
                          </div>
                        )}
                        {status === 'no_winner' && (
                          <span className="text-rose-500 text-xs font-bold bg-rose-500/10 px-2 py-0.5 rounded mt-1 border border-rose-500/20">
                            Sem Passageiro
                          </span>
                        )}
                      </div>

                      <div className="w-12 flex justify-end">
                        <button
                          onClick={() => handleRemoveTicket(ticketVal)}
                          className="text-slate-500 hover:text-red-400 border border-[#333] hover:border-red-400/30 hover:bg-red-400/10 rounded-lg p-2 transition-all group"
                          title="Remover passagem"
                        >
                          <span className="material-icons-outlined text-sm block">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Draw Action Button */}
        {addedTickets.some(t => t.status === 'pending') && (
          <button
            onClick={handleProcessDraw}
            disabled={processingDraw}
            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-sm py-4 rounded-xl transition-all shadow-lg shadow-[#6366F1]/25 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {processingDraw ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processando Embarque...
              </>
            ) : (
              <>
                <span className="material-icons-outlined">play_circle</span>
                Finalizar Embarque
              </>
            )}
          </button>
        )}

        {/* Finalize Action Button */}
        {addedTickets.length > 0 && (
          <div className="pt-4 border-t border-[#333] flex flex-col gap-2">
            <button
              onClick={handleToggleStatus}
              className={`w-full font-bold text-sm py-4 rounded-xl transition-all flex items-center justify-center gap-2 group border ${campaign.status === 'completed'
                  ? 'bg-slate-700/30 border-slate-600 text-slate-400 hover:text-white hover:border-slate-400'
                  : 'bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-600/50 text-emerald-500 hover:text-emerald-400'
                }`}
            >
              <span className="material-icons-outlined group-hover:scale-110 transition-transform">
                {campaign.status === 'completed' ? 'lock_open' : 'check_circle'}
              </span>
              {campaign.status === 'completed' ? 'Reabrir Embarcação' : 'Finalizar Embarcação e Encerrar Vendas'}
            </button>
            {campaign.status !== 'completed' && (
              <p className="text-center text-[10px] text-slate-500">
                Clique acima para encerrar as vendas e mostrar a tela oficial de passageiroes.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
