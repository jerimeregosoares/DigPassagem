import React from 'react';

interface RankingManagerProps {
  campaign: {
    id: string;
    title: string;
  };
}

export default function RankingManager({ campaign }: RankingManagerProps) {
  return (
    <div className="bg-[#1E1E1E] rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="bg-[#6366F1]/10 p-4 rounded-full mb-4">
        <span className="material-icons-outlined text-4xl text-[#6366F1]">groups</span>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Ranking de Compradores</h2>
      <p className="text-slate-400 max-w-md text-sm mb-6">
        Visualize os maiores compradores da embarcação <strong>{campaign.title}</strong> e gerencie premiações especiais para o top ranking.
      </p>
      <div className="flex gap-3">
        <button className="bg-[#6366F1] hover:bg-[#5558DD] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors">
          Configurar Ranking
        </button>
        <button className="bg-[#181818] hover:bg-[#252525] border border-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors">
          Saiba mais
        </button>
      </div>
    </div>
  );
}
