
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function RedirectToRaffle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveRedirect() {
      if (!id) return;

      try {
        // 1. Buscar a compra para saber qual é a campanha
        const { data: purchase, error: purchaseError } = await supabase
          .from('historico_vendas')
          .select('transporte_id')
          .eq('id', id)
          .single();

        if (purchaseError || !purchase) {
          console.error('Erro ao buscar compra:', purchaseError);
          setError('Compra não encontrada.');
          return;
        }

        // 2. Buscar o slug da embarcação
        const { data: campaign, error: campaignError } = await supabase
          .from('transportes')
          .select('slug')
          .eq('id', purchase.transporte_id)
          .single();

        if (campaignError || !campaign) {
          console.error('Erro ao buscar campanha:', campaignError);
          setError('Embarcação não encontrada.');
          return;
        }

        // 3. Redirecionar para a página da passagem com o ID da compra na query
        navigate(`/passagens/${campaign.slug}?purchaseId=${id}`, { replace: true });

      } catch (err) {
        console.error('Erro no redirecionamento:', err);
        setError('Ocorreu um erro ao processar o link.');
      }
    }

    resolveRedirect();
  }, [id, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 font-sans p-4">
        <div className="text-center">
          <span className="material-icons-outlined text-4xl text-red-500 mb-2">error_outline</span>
          <p className="text-lg font-bold">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 text-indigo-600 hover:underline text-sm"
          >
            Voltar para o início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Redirecionando para sua compra...</p>
      </div>
    </div>
  );
}
