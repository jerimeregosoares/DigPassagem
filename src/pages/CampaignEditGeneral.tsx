import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCampaign } from '../context/CampaignContext';

export default function CampaignEditGeneral() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getCampaign, updateCampaign, deleteCampaign } = useCampaign();

  const [campaign, setCampaign] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [minTickets, setMinTickets] = useState(1);
  const [maxTickets, setMaxTickets] = useState(500);
  const [paymentTime, setPaymentTime] = useState('10 minutos');
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itinerary, setItinerary] = useState<{ dayOfWeek: string, departureTime: string, locationId?: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string, name: string, mapLink?: string, lat?: string, lng?: string }[]>([]);

  useEffect(() => {
    if (id === 'new') {
      const draftStr = sessionStorage.getItem('draft_campaign');
      if (draftStr) {
        try {
          const data = JSON.parse(draftStr);
          setCampaign({ ...data, id: 'new', title: data.title || 'Nova Embarcação' });
          setDescription(data.description || '');
          setMinTickets(data.minTickets || 1);
          setMaxTickets(data.maxTickets || 500);
          setPaymentTime(data.paymentTime || '10 minutos');
          if (data.itinerary) setItinerary(data.itinerary);
          if (data.locations) setLocations(data.locations);
        } catch (e) { }
      } else {
        navigate('/campaigns/new');
      }
    } else if (id) {
      const data = getCampaign(id);
      if (data) {
        setCampaign(data);
        setDescription(data.description || '');
        setMinTickets(data.minTickets || 1);
        setMaxTickets(data.maxTickets || 500);
        setPaymentTime(data.paymentTime || '10 minutos');
        if (data.itinerary) setItinerary(data.itinerary);
        if (data.locations) setLocations(data.locations);
      }
    }
  }, [id, getCampaign, navigate]);

  const handleSave = async () => {
    if (id === 'new') {
      const draftStr = sessionStorage.getItem('draft_campaign');
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          const updatedDraft = { 
            ...draft, 
            description, 
            minTickets, 
            maxTickets, 
            paymentTime, 
            itinerary, 
            locations
          };
          sessionStorage.setItem('draft_campaign', JSON.stringify(updatedDraft));
          navigate('/campaigns/new/media');
        } catch (e) {
          console.error(e);
        }
      }
    } else if (id && campaign) {
      try {
        setSaving(true);
        // Garante que o itinerário atual seja enviado corretamente
        const updatedData = {
          description,
          minTickets,
          maxTickets,
          paymentTime,
          itinerary: [...itinerary], // Cria uma cópia rasa para garantir nova referência
          locations: [...locations]
        };
        
        console.log('ENVIANDO PARA O BANCO:', JSON.stringify(updatedData.itinerary));
        
        await updateCampaign(campaign.id, updatedData);
        
        // Pequeno delay para o Supabase processar antes de mudar de página
        setTimeout(() => {
          navigate(`/campaigns/${id}/media`);
        }, 500);
      } catch (err: any) {
        console.error(err);
        alert(`Erro ao salvar alterações: ${err.message || 'Verifique sua conexão.'}`);
      } finally {
        setSaving(false);
      }
    } else {
      alert('Embarcação não carregada. Aguarde um momento.');
    }
  };

  const addLocation = () => {
    const newLocation = { id: Date.now().toString(), name: '', mapLink: '', lat: '', lng: '' };
    setLocations([...locations, newLocation]);
  };

  const updateLocation = (index: number, field: string, value: string) => {
    const newLocations = [...locations];
    (newLocations[index] as any)[field] = value;
    setLocations(newLocations);
  };

  const removeLocation = (index: number) => {
    const locationToRemove = locations[index];
    setLocations(locations.filter((_, i) => i !== index));
    setItinerary(itinerary.map(item => item.locationId === locationToRemove.id ? { ...item, locationId: undefined } : item));
  };

  if (!campaign) {
    return (
      <div className="bg-[#f9fafb] dark:bg-[#121212] min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando dados da embarcação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f9fafb] dark:bg-[#121212] text-slate-900 dark:text-slate-100 min-h-screen font-sans">
      <header className="sticky top-0 z-50 bg-[#f9fafb]/80 dark:bg-[#121212]/80 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-icons-round text-2xl">chevron_left</span>
          </button>
          <h1 className="text-lg font-semibold">Editando: {campaign.title}</h1>
        </div>
        <div className="flex items-center gap-3">
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
          <span className="material-icons-round text-[#6366f1]">info</span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-32">
        <div className="mb-8 px-2">
          <div className="relative flex items-center justify-between">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 -z-10"></div>
            <div className="absolute top-1/2 left-0 h-0.5 bg-[#6366f1] -translate-y-1/2 -z-10 transition-all duration-500" style={{ width: '50%' }}></div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#6366f1] text-white flex items-center justify-center shadow-lg shadow-[#6366f1]/30 ring-4 ring-[#f9fafb] dark:ring-[#121212]">
                <span className="material-icons-round text-xl">confirmation_number</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#6366f1] text-white flex items-center justify-center shadow-lg shadow-[#6366f1]/30 ring-4 ring-[#f9fafb] dark:ring-[#121212]">
                <span className="material-icons-round text-xl">image</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-sm">
                <span className="material-icons-round text-sm">card_giftcard</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-2 px-1 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            <span className="text-[#6366f1]">GERAL</span>
            <span className="text-[#6366f1]">MÍDIA</span>
            <span>PROMOÇÕES</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-[#6366f1]">place</span>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Locais de Embarque</label>
              </div>
              <button
                onClick={addLocation}
                className="text-xs font-medium text-[#6366f1] hover:text-[#5558dd] transition-colors"
              >
                + Adicionar Local
              </button>
            </div>

            {locations.map((loc, index) => (
              <div key={loc.id} className="bg-white dark:bg-[#1e1e1e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 relative group">
                <button type="button" onClick={() => removeLocation(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-icons-round text-base">close</span>
                </button>
                <div className="space-y-2">
                  <input
                    className="w-full h-11 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-lg px-4 text-sm focus:ring-2 focus:ring-[#6366f1] outline-none"
                    placeholder="Nome do local (Ex: Porto Oliveira Nobre)"
                    type="text"
                    value={loc.name}
                    onChange={(e) => updateLocation(index, 'name', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="w-full h-10 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-lg px-4 text-xs focus:ring-2 focus:ring-[#6366f1] outline-none"
                      placeholder="Latitude (Ex: -1.23456)"
                      type="text"
                      value={loc.lat || ''}
                      onChange={(e) => updateLocation(index, 'lat', e.target.value)}
                    />
                    <input
                      className="w-full h-10 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-lg px-4 text-xs focus:ring-2 focus:ring-[#6366f1] outline-none"
                      placeholder="Longitude (Ex: -48.12345)"
                      type="text"
                      value={loc.lng || ''}
                      onChange={(e) => updateLocation(index, 'lng', e.target.value)}
                    />
                  </div>
                  <input
                    className="w-full h-10 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-lg px-4 text-xs focus:ring-2 focus:ring-[#6366f1] outline-none"
                    placeholder="Link do Google Maps (Opcional)"
                    type="text"
                    value={loc.mapLink}
                    onChange={(e) => updateLocation(index, 'mapLink', e.target.value)}
                  />
                </div>
              </div>
            ))}

            {locations.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-sm text-slate-400">Nenhum local cadastrado</p>
                <button onClick={addLocation} className="mt-2 text-sm text-[#6366f1] font-medium">Cadastrar Local</button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-icons-round text-[#6366f1]">schedule</span>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Horários de Saída</label>
            </div>
            
            {itinerary.map((item, index) => (
              <div key={index} className="bg-white dark:bg-[#1e1e1e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 relative">
                <button
                  onClick={() => {
                    const newItinerary = [...itinerary];
                    newItinerary.splice(index, 1);
                    setItinerary(newItinerary);
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors"
                >
                  <span className="material-icons-round text-lg">delete_outline</span>
                </button>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Dia da Semana</label>
                    <select
                      value={item.dayOfWeek}
                      onChange={(e) => {
                        const newItinerary = [...itinerary];
                        newItinerary[index].dayOfWeek = e.target.value;
                        setItinerary(newItinerary);
                      }}
                      className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Selecione...</option>
                      <option value="Segunda-feira">Segunda-feira</option>
                      <option value="Terça-feira">Terça-feira</option>
                      <option value="Quarta-feira">Quarta-feira</option>
                      <option value="Quinta-feira">Quinta-feira</option>
                      <option value="Sexta-feira">Sexta-feira</option>
                      <option value="Sábado">Sábado</option>
                      <option value="Domingo">Domingo</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Local de Saída</label>
                    <select
                      value={item.locationId || ''}
                      onChange={(e) => {
                        const newItinerary = [...itinerary];
                        newItinerary[index].locationId = e.target.value;
                        setItinerary(newItinerary);
                      }}
                      className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Selecione o local...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Horário</label>
                    <input
                      type="time"
                      value={item.departureTime}
                      onChange={(e) => {
                        const newItinerary = [...itinerary];
                        newItinerary[index].departureTime = e.target.value;
                        setItinerary(newItinerary);
                      }}
                      className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setItinerary([...itinerary, { dayOfWeek: 'Segunda-feira', departureTime: '08:00', locationId: locations[0]?.id }])}
              className="w-full py-3 border-2 border-dashed border-[#6366f1]/30 text-[#6366f1] rounded-xl font-medium hover:bg-[#6366f1]/5 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-icons-round">add_circle_outline</span>
              Adicionar Horário
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Descrição / Regulamento</label>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
              <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><span className="material-icons-round text-base">format_bold</span></button>
                <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><span className="material-icons-round text-base">format_italic</span></button>
                <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><span className="material-icons-round text-base">format_underlined</span></button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><span className="material-icons-round text-base">format_list_bulleted</span></button>
                <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><span className="material-icons-round text-base">link</span></button>
              </div>
              <textarea
                className="w-full p-4 bg-transparent border-none focus:ring-0 text-sm resize-none placeholder-slate-400 dark:placeholder-slate-600"
                placeholder="Escreva a descrição ou regulamento da embarcação..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Qtd minima por compra</label>
              <div className="relative">
                <input
                  className="w-full bg-white dark:bg-[#1e1e1e] border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
                  type="number"
                  value={minTickets}
                  onChange={(e) => setMinTickets(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Qtd. maxima por compra</label>
              <div className="relative">
                <input
                  className="w-full bg-white dark:bg-[#1e1e1e] border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
                  type="number"
                  value={maxTickets}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > 2) {
                      alert('O limite máximo permitido é de 2 passagens por compra.');
                      setMaxTickets(2);
                    } else {
                      setMaxTickets(val);
                    }
                  }}
                  max={2}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Tempo para pagamento</label>
            <div className="relative">
              <select
                className="w-full bg-white dark:bg-[#1e1e1e] border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6366f1] focus:border-transparent appearance-none"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
              >
                <option>10 minutos</option>
                <option>30 minutos</option>
                <option>1 hora</option>
                <option>24 horas</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <span className="material-icons-round text-slate-400">expand_more</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f9fafb]/90 dark:bg-[#121212]/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-md mx-auto flex gap-3">
          <button onClick={() => id === 'new' ? navigate('/campaigns/new') : navigate(-1)} className="flex-1 py-4 px-6 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            <span className="material-icons-round text-sm">arrow_back</span>
            Voltar
          </button>
          <button onClick={handleSave} className="flex-[2] py-4 px-6 rounded-xl bg-[#6366f1] text-white font-semibold shadow-lg shadow-[#6366f1]/25 hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            Próximo
            <span className="material-icons-round text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
