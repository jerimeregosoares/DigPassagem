import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSocialNetworks, SocialNetworksData } from '../context/SocialNetworkContext';

type NetworkKey = keyof SocialNetworksData;

interface NetworkConfig {
    key: NetworkKey;
    label: string;
    icon: string;
}

const NETWORKS_CONFIG: NetworkConfig[] = [
    { key: 'facebook', label: 'Facebook', icon: 'facebook' },
    { key: 'instagram', label: 'Instagram', icon: 'camera_alt' },
    { key: 'tiktok', label: 'Tiktok', icon: 'music_note' },
    { key: 'telegram', label: 'Telegram', icon: 'send' },
    { key: 'whatsappGroup', label: 'Whatsapp grupo', icon: 'groups' },
    { key: 'whatsappSupport', label: 'Whatsapp suporte', icon: 'chat' },
    { key: 'youtube', label: 'Youtube', icon: 'play_circle' },
];

export default function SocialNetworks() {
    const navigate = useNavigate();
    const { networks, updateNetwork, removeNetwork, loading } = useSocialNetworks();

    const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
    const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null);
    const [linkInput, setLinkInput] = useState('');

    const handleOpenModal = (network: NetworkConfig, mode: 'add' | 'edit') => {
        setSelectedNetwork(network);
        setModalMode(mode);
        setLinkInput(networks[network.key] || '');
    };

    const handleCloseModal = () => {
        setModalMode(null);
        setSelectedNetwork(null);
        setLinkInput('');
    };

    const handleSave = async () => {
        if (selectedNetwork && linkInput) {
            await updateNetwork(selectedNetwork.key, linkInput);
            handleCloseModal();
        }
    };

    const handleDelete = async () => {
        if (selectedNetwork) {
            await removeNetwork(selectedNetwork.key);
            handleCloseModal();
        }
    };

    if (loading) {
        return (
            <div className="bg-[#121212] text-slate-100 min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6366F1]"></div>
            </div>
        );
    }

    return (
        <div className="bg-[#121212] text-slate-100 min-h-screen font-sans flex overflow-x-hidden">
            {/* Sidebar for Desktop */}
            <div className="hidden lg:block h-screen sticky top-0">
                <Sidebar />
            </div>

            <div className="flex-1 flex flex-col min-h-screen relative">
                <Header />

                <main className="px-4 py-6 md:px-8 max-w-5xl w-full mx-auto">
                    {/* Page Top Navigation */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 bg-[#1E1E1E] rounded-xl flex items-center justify-center border border-slate-800 hover:border-slate-700 transition-colors"
                        >
                            <span className="material-icons-round text-slate-400">arrow_back</span>
                        </button>
                        <h1 className="text-xl font-bold text-white">Redes sociais</h1>
                    </div>

                    {/* Social Networks Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {NETWORKS_CONFIG.map((network) => {
                            const isConnected = !!networks[network.key];

                            return (
                                <div
                                    key={network.key}
                                    className="bg-[#1E1E1E] rounded-2xl border border-slate-800 p-6 flex items-center justify-between group hover:border-[#6366F1]/30 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#2D2D2D] rounded-xl flex items-center justify-center overflow-hidden border border-slate-700/50">
                                            <span className="material-icons-round text-slate-100 text-2xl">{network.icon}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white leading-tight">{network.label}</h3>
                                            <p className={`text-xs mt-1 ${isConnected ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                {isConnected ? 'Conectado' : 'Não conectado'}
                                            </p>
                                        </div>
                                    </div>

                                    {isConnected ? (
                                        <button
                                            onClick={() => handleOpenModal(network, 'edit')}
                                            className="w-10 h-10 bg-[#252525] hover:bg-[#2d2d2d] rounded-xl flex items-center justify-center border border-slate-700/50 transition-colors"
                                        >
                                            <span className="material-icons-round text-slate-100 text-xl">edit</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleOpenModal(network, 'add')}
                                            className="w-10 h-10 bg-[#252525] hover:bg-[#2d2d2d] rounded-xl flex items-center justify-center border border-slate-700/50 transition-colors"
                                        >
                                            <span className="material-icons-round text-slate-100 text-xl">add</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </main>

                {/* Modal Overlay */}
                {modalMode && selectedNetwork && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity">
                        <div className="bg-[#1E1E1E] w-full max-w-md rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6">
                                {/* Modal Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            {modalMode === 'add' ? `Adicionar ${selectedNetwork.label}` : `Editar ${selectedNetwork.label}`}
                                        </h2>
                                        <p className="text-slate-500 text-sm mt-1">
                                            {modalMode === 'add' ? 'Adicione o link da sua rede social' : 'Edite o link da sua rede social'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleCloseModal}
                                        className="text-slate-500 hover:text-white transition-colors p-1"
                                    >
                                        <span className="material-icons-round">close</span>
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-white">Cole o link aqui</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={linkInput}
                                                onChange={(e) => setLinkInput(e.target.value)}
                                                placeholder="https://..."
                                                className="w-full bg-[#121212] border border-slate-800 rounded-2xl px-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Modal Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        {modalMode === 'edit' && (
                                            <button
                                                onClick={handleDelete}
                                                className="w-14 h-14 bg-[#181818] hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 rounded-2xl flex items-center justify-center transition-all group"
                                                title="Excluir"
                                            >
                                                <span className="material-icons-round text-slate-400 group-hover:text-red-500 transition-colors">delete_outline</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={handleSave}
                                            disabled={!linkInput}
                                            className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${linkInput
                                                    ? 'bg-[#6366F1] hover:bg-[#5558dd] text-white shadow-lg shadow-[#6366F1]/20'
                                                    : 'bg-[#252525] text-slate-600 cursor-not-allowed border border-slate-800'
                                                }`}
                                        >
                                            <span>{modalMode === 'add' ? 'Adicionar' : 'Salvar'}</span>
                                            <span className="material-icons-round text-lg">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Nav Spacer */}
            <div className="lg:hidden h-24"></div>
        </div>
    );
}
