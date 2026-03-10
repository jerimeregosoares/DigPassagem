
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCampaign } from '../context/CampaignContext';
import { motion, AnimatePresence } from 'motion/react';

export default function PublicHome() {
    const { campaigns, loading, refreshCampaigns } = useCampaign();
    const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
    const [selectedTab, setSelectedTab] = useState('Todos');
    const navigate = useNavigate();

    useEffect(() => {
        // Filtra apenas campanhas ativas
        let filtered = campaigns.filter(c => c.status === 'Ativa');

        // Filtro por aba
        if (selectedTab === 'Lanchas Expresso') {
            filtered = filtered.filter(c => c.vesselType === 'Lancha Rápida' || c.vesselType === 'Expresso');
        } else if (selectedTab === 'Navios') {
            filtered = filtered.filter(c => c.vesselType === 'Navio' || c.vesselType === 'Ferry Boat');
        } else if (selectedTab === 'Promoções') {
            // Lógica de promoções (por enquanto placeholder ou baseado em algum campo)
            // filtered = filtered.filter(c => c.isPromo);
        }

        setActiveCampaigns(filtered);
    }, [campaigns, selectedTab]);

    const parseImages = (imgData: any): string[] => {
        if (!imgData) return [];
        if (Array.isArray(imgData)) {
            return imgData.filter(img => img && typeof img === 'string' && img.trim() !== '');
        }
        if (typeof imgData !== 'string') return [String(imgData)];
        try {
            const parsed = JSON.parse(imgData);
            if (Array.isArray(parsed)) {
                return parsed.filter(img => img && typeof img === 'string' && img.trim() !== '');
            }
            return [imgData];
        } catch (e) {
            return imgData ? [imgData] : [];
        }
    };

    return (
        <div className="bg-[#0F172A] min-h-screen font-sans pb-20 text-slate-100">
            {/* Header */}
            <header className="px-4 py-4 flex justify-between items-center sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-800">
                <button className="p-2 -ml-2 text-slate-400 hover:text-white">
                    <span className="material-icons-round text-2xl">menu</span>
                </button>
                <h1 className="text-lg font-bold text-white">Oliveira Nobre</h1>
                <button className="p-2 -mr-2 text-slate-400 hover:text-white">
                    <span className="material-icons-round text-2xl">search</span>
                </button>
            </header>

            {/* Tabs */}
            <div className="px-4 border-b border-slate-800 bg-[#0F172A]">
                <div className="flex gap-6 overflow-x-auto no-scrollbar pb-1">
                    {['Todos', 'Lanchas Expresso', 'Navios', 'Promoções'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setSelectedTab(tab)}
                            className={`pb-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${selectedTab === tab
                                ? 'text-[#3B82F6] border-[#3B82F6]'
                                : 'text-slate-400 border-transparent hover:text-slate-200'
                                }`}
                        >
                            {tab === 'Todos' ? 'Todos' : tab}
                        </button>
                    ))}
                </div>
            </div>

            <main className="p-4 space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : activeCampaigns.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons-round text-slate-500 text-3xl">directions_boat</span>
                        </div>
                        <h3 className="text-white font-bold text-lg">Nenhuma viagem encontrada</h3>
                        <p className="text-slate-500 text-sm mt-1">Tente mudar o filtro ou volte mais tarde.</p>
                        <button
                            onClick={() => refreshCampaigns()}
                            className="mt-6 text-[#3B82F6] font-bold text-sm flex items-center gap-2 mx-auto hover:underline"
                        >
                            <span className="material-icons-round text-sm">refresh</span>
                            Atualizar
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {activeCampaigns.map((boat) => (
                            <BoatCard key={boat.id} boat={boat} parseImages={parseImages} />
                        ))}
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-slate-800 px-6 py-2 pb-5 z-50">
                <div className="flex justify-between items-center">
                    <button className="flex flex-col items-center gap-1 text-[#3B82F6]">
                        <span className="material-icons-round">home</span>
                        <span className="text-[10px] font-medium">Início</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300">
                        <span className="material-icons-outlined">receipt_long</span>
                        <span className="text-[10px] font-medium">Pedidos</span>
                    </button>
                    <Link to="/login" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300">
                        <span className="material-icons-outlined">person</span>
                        <span className="text-[10px] font-medium">Perfil</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}

const BoatCard = ({ boat, parseImages }: any) => {
    const images = parseImages(boat.image);
    const [currentIdx, setCurrentIdx] = useState(0);

    // Group itinerary by location name
    const groupedItinerary = React.useMemo(() => {
        if (!boat.itinerary || !boat.locations) return {};
        const groups: Record<string, string[]> = {};

        boat.itinerary.forEach((item: any) => {
            // Find location name
            const loc = boat.locations.find((l: any) => l.id === item.locationId);
            const locName = loc ? loc.name : 'Origem'; // Fallback

            if (!groups[locName]) groups[locName] = [];
            if (!groups[locName].includes(item.dayOfWeek)) {
                groups[locName].push(item.dayOfWeek);
            }
        });
        return groups;
    }, [boat.itinerary, boat.locations]);

    useEffect(() => {
        if (images.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIdx(prev => (prev + 1) % images.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [images.length]);

    // Determine badge text based on vessel type
    const badgeText = boat.vesselType ? boat.vesselType.toUpperCase() : 'EMBARCAÇÃO';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1E293B] rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl"
        >
            {/* Image Section */}
            <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.img
                        key={currentIdx}
                        src={images[currentIdx] || "https://via.placeholder.com/800x450?text=Sem+Imagem"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full object-cover"
                    />
                </AnimatePresence>

                {/* Badge */}
                <div className="absolute top-4 left-4 bg-[#2563EB] text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg uppercase tracking-wide">
                    {badgeText}
                </div>

                {/* Pagination Dots */}
                {images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {images.map((_: any, i: number) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIdx ? 'bg-white scale-125' : 'bg-white/40'}`} />
                        ))}
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight mb-1">{boat.title}</h2>
                        <p className="text-xl font-bold text-[#06B6D4]">
                            R$ {boat.ticketValue ? boat.ticketValue.replace('.', ',') : '0,00'}
                        </p>
                    </div>
                    <div className="bg-[#0F172A] p-2 rounded-lg text-[#3B82F6]">
                        <span className="material-icons-round">directions_boat</span>
                    </div>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="material-icons-round text-sm">place</span>
                    <span className="text-sm font-medium">{boat.routeName || 'Rota não definida'}</span>
                </div>

                {/* Info Panel (Departure Times) */}
                <div className="bg-[#0F172A] rounded-xl p-3 space-y-2">
                    {Object.keys(groupedItinerary).length > 0 ? (
                        Object.entries(groupedItinerary).map(([locName, days]) => (
                            <div key={locName} className="flex items-start gap-2 text-xs text-slate-300">
                                <span className="material-icons-round text-sm text-slate-500 mt-0.5">calendar_today</span>
                                <span>
                                    <span className="font-bold text-slate-200">Saída {locName}:</span> {days.join(' e ')}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="material-icons-round text-sm">info</span>
                            <span>Consulte os horários de saída</span>
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <Link
                    to={`/passagens/${boat.slug}`}
                    className="w-full bg-[#1D4ED8] hover:bg-[#2563EB] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    Conferir
                    <span className="material-icons-round text-sm">arrow_forward</span>
                </Link>
            </div>
        </motion.div>
    );
}
