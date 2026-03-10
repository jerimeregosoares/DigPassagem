import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCampaign } from '../context/CampaignContext';

export default function NewCampaign() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addCampaign, getCampaign, updateCampaign } = useCampaign();

  const [name, setName] = useState('');
  const [ticketQuantity, setTicketQuantity] = useState(25);
  const [ticketValue, setTicketValue] = useState('');
  const [vesselType, setVesselType] = useState('Expresso');
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);
  const [creating, setCreating] = useState(false);

  // Novos campos
  const [routeName, setRouteName] = useState('');
  const [routeDistance, setRouteDistance] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [locations, setLocations] = useState<{ id: string, name: string, mapLink?: string }[]>([]);
  const [seatLayout, setSeatLayout] = useState<{ left: number, right: number }[]>([{ left: 2, right: 2 }]);
  const [itinerary, setItinerary] = useState<{ dayOfWeek: string, departureTime: string, locationId?: string }[]>([]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const amount = Number(numericValue) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleTicketValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = rawValue.replace(/\D/g, '');

    if (numericValue === '') {
      setTicketValue('');
      return;
    }

    const formatted = formatCurrency(numericValue);
    setTicketValue(formatted);
  };

  useEffect(() => {
    const numericTicketValue = Number(ticketValue.replace(/\./g, '').replace(',', '.')) || 0;
    setEstimatedRevenue(ticketQuantity * numericTicketValue);
  }, [ticketQuantity, ticketValue]);

  useEffect(() => {
    const totalSeats = seatLayout.reduce((acc, row) => acc + row.left + row.right, 0);
    setTicketQuantity(totalSeats || 1);
  }, [seatLayout]);

  useEffect(() => {
    if (id) {
      const data = getCampaign(id);
      if (data) {
        setName(data.title);
        setTicketQuantity(data.ticketQuantity);
        if (data.ticketValue) {
          const valNum = Number(data.ticketValue);
          if (!isNaN(valNum)) {
            setTicketValue(valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
          } else {
            setTicketValue(String(data.ticketValue).replace('.', ','));
          }
        }
        if (data.vesselType) setVesselType(data.vesselType);

        if (data.routeName) setRouteName(data.routeName);
        if (data.routeDistance) setRouteDistance(data.routeDistance);
        if (data.estimatedDuration) setEstimatedDuration(data.estimatedDuration);
        if (data.seatLayout && Array.isArray(data.seatLayout) && data.seatLayout.length > 0) {
          setSeatLayout(data.seatLayout);
        }
        if (data.itinerary && Array.isArray(data.itinerary)) {
          setItinerary(data.itinerary);
        }
        if (data.locations && Array.isArray(data.locations)) {
          setLocations(data.locations);
        }
      }
    } else {
      const draftStr = sessionStorage.getItem('draft_campaign');
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          if (draft.title) setName(draft.title);
          if (draft.ticketQuantity) setTicketQuantity(draft.ticketQuantity);
          if (draft.ticketValue) setTicketValue(draft.ticketValue.replace('.', ','));
          if (draft.vesselType) setVesselType(draft.vesselType);
          if (draft.routeName) setRouteName(draft.routeName);
          if (draft.routeDistance) setRouteDistance(draft.routeDistance);
          if (draft.estimatedDuration) setEstimatedDuration(draft.estimatedDuration);
          if (draft.seatLayout && Array.isArray(draft.seatLayout) && draft.seatLayout.length > 0) {
            setSeatLayout(draft.seatLayout);
          }
          if (draft.itinerary && Array.isArray(draft.itinerary)) {
            setItinerary(draft.itinerary);
          }
          if (draft.locations && Array.isArray(draft.locations)) {
            setLocations(draft.locations);
          }
        } catch (e) { }
      }
    }
  }, [id, getCampaign]);

  const handleNext = async () => {
    if (!name || !ticketQuantity || !ticketValue || !routeName) {
      alert('Por favor, preencha os campos obrigatórios (nome, valor e rota)');
      return;
    }

    const numericTicketValueStr = ticketValue.replace(/\./g, '').replace(',', '.');

    if (id) {
      try {
        setCreating(true);
        await updateCampaign(id, {
          title: name,
          ticketQuantity,
          ticketValue: numericTicketValueStr,
          selectionMethod: 'manual',
          vesselType,
          routeName,
          routeDistance,
          estimatedDuration,
          seatLayout,
          itinerary,
          locations
        });
        navigate(`/campaigns/${id}/media`);
      } catch (err: any) {
        console.error(err);
        if (err.message?.includes('campaigns_slug_key')) {
          alert('Erro ao salvar: Já existe uma embarcação com este nome. Tente mudar o nome.');
        } else {
          alert(`Erro ao salvar as alterações: ${err.message || 'Verifique sua conexão.'}`);
        }
      } finally {
        setCreating(false);
      }
    } else {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${randomSuffix}`;
      const newCampaignData = {
        slug,
        title: name,
        ticketQuantity,
        ticketValue: numericTicketValueStr,
        selectionMethod: 'manual',
        status: 'Pendente',
        image: 'https://via.placeholder.com/400x400?text=Sem+Imagem',
        vesselType,
        routeName,
        routeDistance,
        estimatedDuration,
        seatLayout,
        itinerary,
        locations
      };

      const existingDraftStr = sessionStorage.getItem('draft_campaign');
      let mergedDraft = newCampaignData;
      if (existingDraftStr) {
        try {
          const existingDraft = JSON.parse(existingDraftStr);
          mergedDraft = { ...existingDraft, ...newCampaignData };
        } catch (e) { }
      }

      sessionStorage.setItem('draft_campaign', JSON.stringify(mergedDraft));
      navigate('/campaigns/new/edit');
    }
  };

  const addLocation = () => {
    const newLocation = { id: Date.now().toString(), name: '', mapLink: '' };
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
    // Also remove from itinerary if selected
    setItinerary(itinerary.map(item => item.locationId === locationToRemove.id ? { ...item, locationId: undefined } : item));
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-[#121212] text-slate-900 dark:text-slate-100 min-h-screen pb-24 font-sans">
      <header className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d]">
            <span className="material-icons-round text-[#6366f1]">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold">{id ? 'Editar embarcação' : 'Nova embarcação'}</h1>
        </div>
        <div className="relative">
          <span className="material-icons-round text-slate-400">notifications</span>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#6366f1] text-[10px] text-white flex items-center justify-center rounded-full border-2 border-[#121212]">1</span>
        </div>
      </header>

      <main className="px-5 space-y-8">
        <div className="mb-4">
          <div className="relative flex items-center justify-between">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 -z-10"></div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#6366f1] text-white flex items-center justify-center shadow-lg shadow-[#6366f1]/30 ring-4 ring-[#f8fafc] dark:ring-[#121212]">
                <span className="material-icons-round text-xl">confirmation_number</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-sm">
                <span className="material-icons-round text-sm">image</span>
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
            <span>MÍDIA</span>
            <span>PROMOÇÕES</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">Nome da embarcação</label>
            <input
              className="w-full h-14 bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-2xl px-4 focus:ring-2 focus:ring-[#6366f1] focus:border-transparent outline-none transition-all"
              placeholder="Ex: Ônibus Executivo, Lancha X..."
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">Tipo de embarcação</label>
            <div className="relative">
              <select
                className="w-full h-14 bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-2xl px-4 focus:ring-2 focus:ring-[#6366f1] focus:border-transparent outline-none appearance-none transition-all"
                value={vesselType}
                onChange={(e) => setVesselType(e.target.value)}
              >
                <option value="Expresso">Expresso</option>
                <option value="Lancha Rápida">Lancha Rápida</option>
                <option value="Navio">Navio</option>
                <option value="Catamarã">Catamarã</option>
                <option value="Ferry Boat">Ferry Boat</option>
                <option value="Outro">Outro</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                <span className="material-icons-round">expand_more</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">Valor unitário</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                <input
                  className="w-full h-14 bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-2xl pl-12 pr-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold"
                  placeholder="0,00"
                  type="text"
                  value={ticketValue}
                  onChange={handleTicketValueChange}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Detalhes da Rota</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">Rota (Ex: Breves/Anajás)</label>
                <input
                  className="w-full h-11 bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] focus:border-transparent outline-none transition-all"
                  placeholder="Breves/Anajás"
                  type="text"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">Distância (Ex: 180km)</label>
                <input
                  className="w-full h-11 bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] focus:border-transparent outline-none transition-all"
                  placeholder="180km"
                  type="text"
                  value={routeDistance}
                  onChange={(e) => setRouteDistance(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">Duração (Ex: 4h 30min)</label>
                <input
                  className="w-full h-11 bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] focus:border-transparent outline-none transition-all"
                  placeholder="4h 30min"
                  type="text"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Embarque e Desembarque</h4>
                <button type="button" onClick={addLocation} className="text-[#6366f1] text-xs font-bold flex items-center gap-1 hover:underline">
                  <span className="material-icons-round text-sm">add_circle</span> Adicionar local
                </button>
              </div>

              <div className="space-y-3">
                {locations.map((loc, index) => (
                  <div key={loc.id} className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-slate-200 dark:border-[#2d2d2d] space-y-3 relative group">
                    <button type="button" onClick={() => removeLocation(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-icons-round text-base">close</span>
                    </button>
                    <div className="space-y-2">
                      <input
                        className="w-full h-11 bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#333] rounded-lg px-4 text-sm focus:ring-2 focus:ring-[#6366f1] outline-none"
                        placeholder="Nome do local (Ex: Porto Oliveira Nobre)"
                        type="text"
                        value={loc.name}
                        onChange={(e) => updateLocation(index, 'name', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                         <input
                           className="w-full h-10 bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#333] rounded-lg px-4 text-xs focus:ring-2 focus:ring-[#6366f1] outline-none"
                           placeholder="Latitude (Ex: -1.23456)"
                           type="text"
                           value={(loc as any).lat || ''}
                           onChange={(e) => updateLocation(index, 'lat', e.target.value)}
                         />
                         <input
                           className="w-full h-10 bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#333] rounded-lg px-4 text-xs focus:ring-2 focus:ring-[#6366f1] outline-none"
                           placeholder="Longitude (Ex: -48.12345)"
                           type="text"
                           value={(loc as any).lng || ''}
                           onChange={(e) => updateLocation(index, 'lng', e.target.value)}
                         />
                      </div>
                      <input
                        className="w-full h-10 bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#333] rounded-lg px-4 text-xs focus:ring-2 focus:ring-[#6366f1] outline-none"
                        placeholder="Link do Google Maps (Opcional)"
                        type="text"
                        value={loc.mapLink}
                        onChange={(e) => updateLocation(index, 'mapLink', e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                {locations.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-[#2d2d2d] rounded-2xl">
                    <p className="text-xs text-slate-400">Nenhum local de embarque cadastrado.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-[#2d2d2d]">
            <div className="flex items-center gap-2">
              <span className="material-icons-round text-[#6366f1]">schedule</span>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Horários de Saída</h3>
            </div>
            <div className="space-y-4">
              {itinerary.map((trip, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 dark:bg-[#181818] p-4 rounded-xl border border-slate-200 dark:border-[#2d2d2d] relative">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Dia da Semana</label>
                    <div className="relative">
                      <select
                        className="w-full h-11 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#6366f1] focus:border-transparent outline-none appearance-none"
                        value={trip.dayOfWeek}
                        onChange={(e) => {
                          const newItinerary = [...itinerary];
                          newItinerary[index].dayOfWeek = e.target.value;
                          setItinerary(newItinerary);
                        }}
                      >
                        <option>Segunda-feira</option>
                        <option>Terça-feira</option>
                        <option>Quarta-feira</option>
                        <option>Quinta-feira</option>
                        <option>Sexta-feira</option>
                        <option>Sábado</option>
                        <option>Domingo</option>
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                        <span className="material-icons-round text-sm">expand_more</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Local da Saída</label>
                    <div className="relative">
                      <select
                        className="w-full h-11 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#6366f1] focus:border-transparent outline-none appearance-none"
                        value={trip.locationId || ''}
                        onChange={(e) => {
                          const newItinerary = [...itinerary];
                          newItinerary[index].locationId = e.target.value;
                          setItinerary(newItinerary);
                        }}
                      >
                        <option value="">Selecione um local...</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name || 'Sem nome'}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                        <span className="material-icons-round text-sm">expand_more</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-emerald-500 dark:text-emerald-400 ml-1">Horário</label>
                      <input
                        className="w-full h-11 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-xl px-4 text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-[#6366f1] outline-none"
                        type="time"
                        value={trip.departureTime}
                        onChange={(e) => {
                          const newItinerary = [...itinerary];
                          newItinerary[index].departureTime = e.target.value;
                          setItinerary(newItinerary);
                        }}
                      />
                    </div>
                    {itinerary.length > 0 && (
                      <button type="button" onClick={() => setItinerary(itinerary.filter((_, i) => i !== index))} className="h-11 w-11 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1e1e]">
                        <span className="material-icons-round">delete_outline</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setItinerary([...itinerary, { dayOfWeek: 'Segunda-feira', departureTime: '', locationId: locations.length > 0 ? locations[0].id : undefined }])} className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-[#2d2d2d] rounded-xl flex items-center justify-center text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-[#1e1e1e] transition-all gap-2">
                <span className="material-icons-round">add_alarm</span>Adicionar mais dia / horário
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-[#2d2d2d]">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Layout de Poltronas</h3>
            <div className="space-y-3">
              {seatLayout.map((row, index) => (
                <div key={index} className="flex gap-4 items-end bg-slate-50 dark:bg-[#181818] p-3 rounded-xl border border-slate-200 dark:border-[#2d2d2d]">
                  <div className="w-12 h-9 flex items-center justify-center font-bold text-slate-400 text-sm">Fil {index + 1}</div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Esq.</label>
                    <div className="flex items-center bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-lg h-9">
                      <button type="button" onClick={() => { const nl = [...seatLayout]; nl[index].left = Math.max(0, nl[index].left - 1); setSeatLayout(nl); }} className="w-8 h-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#2d2d2d] transition-colors"><span className="material-icons-round text-[14px]">remove</span></button>
                      <div className="flex-1 text-center font-bold text-sm">{row.left}</div>
                      <button type="button" onClick={() => { const nl = [...seatLayout]; nl[index].left += 1; setSeatLayout(nl); }} className="w-8 h-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#2d2d2d] transition-colors"><span className="material-icons-round text-[14px]">add</span></button>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Dir.</label>
                    <div className="flex items-center bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2d2d2d] rounded-lg h-9">
                      <button type="button" onClick={() => { const nl = [...seatLayout]; nl[index].right = Math.max(0, nl[index].right - 1); setSeatLayout(nl); }} className="w-8 h-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#2d2d2d] transition-colors"><span className="material-icons-round text-[14px]">remove</span></button>
                      <div className="flex-1 text-center font-bold text-sm">{row.right}</div>
                      <button type="button" onClick={() => { const nl = [...seatLayout]; nl[index].right += 1; setSeatLayout(nl); }} className="w-8 h-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#2d2d2d] transition-colors"><span className="material-icons-round text-[14px]">add</span></button>
                    </div>
                  </div>
                  <button type="button" onClick={() => { if (seatLayout.length > 1) setSeatLayout(seatLayout.filter((_, i) => i !== index)); }} className="w-9 h-9 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"><span className="material-icons-round text-[18px]">delete</span></button>
                </div>
              ))}
              <button type="button" onClick={() => setSeatLayout([...seatLayout, { ...seatLayout[seatLayout.length - 1] }])} className="w-full h-11 border-2 border-dashed border-slate-300 dark:border-[#2d2d2d] rounded-xl flex items-center justify-center text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-[#1e1e1e] transition-colors mt-2">
                <span className="material-icons-round text-sm mr-2">add</span>Adicionar Fileira NO FINAL
              </button>
            </div>

            <div className="mt-8 p-6 bg-[#0a0a0a] border border-[#2d2d2d] rounded-2xl flex flex-col items-center overflow-x-auto w-full">
              <div className="flex items-center justify-between w-full max-w-sm mb-6 bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                <div className="w-full text-center">
                  <h4 className="font-bold text-white text-sm">Preview da Lancha</h4>
                  <p className="text-[10px] text-slate-500">Gerada para <b>{ticketQuantity}</b> poltronas em {seatLayout.length} fileira(s)</p>
                </div>
              </div>
              <div className="relative border-[6px] border-[#333] bg-[#1a1a1a] rounded-t-[140px] rounded-b-[40px] p-6 pb-12 shadow-2xl mx-auto" style={{ minWidth: 'min-content' }}>
                <div className="w-24 h-12 border-b-2 border-x-2 border-slate-700/50 rounded-b-xl mx-auto mb-12 bg-[#111] shadow-inner relative flex justify-center items-center">
                  <div className="w-6 h-6 rounded-full border-4 border-slate-600 absolute -top-3 bg-[#1a1a1a]"></div>
                </div>
                <div className="flex flex-col gap-3 relative z-10 shrink-0">
                  {seatLayout.map((row, rowIndex) => {
                    const startSeat = seatLayout.slice(0, rowIndex).reduce((acc, r) => acc + r.left + r.right, 0) + 1;
                    return (
                      <div key={rowIndex} className="flex justify-center gap-6">
                        <div className="flex gap-1.5 min-w-[32px] justify-end">
                          {Array.from({ length: row.left }).map((_, i) => (
                            <div key={i} className="w-8 h-10 rounded-t-lg rounded-b-md border bg-[#252525] border-[#444] flex items-center justify-center shrink-0">
                              <span className="text-[10px] text-slate-300 font-bold">{String(startSeat + i).padStart(2, '0')}</span>
                            </div>
                          ))}
                        </div>
                        <div className="w-8 flex items-center justify-center relative shrink-0">
                          {rowIndex === 0 && <span className="absolute top-10 text-[11px] -rotate-90 text-blue-500/30 font-bold select-none uppercase tracking-widest">Corredor</span>}
                        </div>
                        <div className="flex gap-1.5 min-w-[32px] justify-start">
                          {Array.from({ length: row.right }).map((_, i) => (
                            <div key={i} className="w-8 h-10 rounded-t-lg rounded-b-md border bg-[#252525] border-[#444] flex items-center justify-center shrink-0">
                              <span className="text-[10px] text-slate-300 font-bold">{String(startSeat + row.left + i).padStart(2, '0')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-[#1e1e1e] rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-[#2d2d2d]">
          <h3 className="font-bold text-lg">Resumo financeiro</h3>
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200 dark:border-[#2d2d2d]">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Passagens</p>
              <p className="text-lg font-bold">{ticketQuantity}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Valor unitário</p>
              <p className="text-lg font-bold text-slate-400">{ticketValue ? `R$ ${ticketValue}` : '-'}</p>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-emerald-500 font-medium">Arrecadação estimada</span>
            <span className="text-emerald-500 font-bold">{estimatedRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#f8fafc]/80 dark:bg-[#121212]/80 backdrop-blur-xl border-t border-slate-200 dark:border-[#2d2d2d] z-40">
        <button onClick={handleNext} disabled={creating} className="w-full bg-[#6366f1] hover:bg-indigo-600 text-white font-bold h-14 rounded-2xl shadow-lg shadow-[#6366f1]/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
          {creating ? 'Salvando...' : (
            <>{id ? 'Salvar alterações' : 'Cadastrar embarcação'}<span className="material-icons-round text-[20px]">{id ? 'save' : 'add_circle'}</span></>
          )}
        </button>
      </div>
    </div>
  );
}
