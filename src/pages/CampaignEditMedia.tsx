import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCampaign } from '../context/CampaignContext';
import { supabase } from '../lib/supabaseClient';

export default function CampaignEditMedia() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getCampaign, updateCampaign, deleteCampaign } = useCampaign();

  const [campaign, setCampaign] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(false);

  useEffect(() => {
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

    if (!initialLoad) {
      if (id === 'new') {
        const draftStr = sessionStorage.getItem('draft_campaign');
        if (draftStr) {
          try {
            const draft = JSON.parse(draftStr);
            setCampaign({ ...draft, id: 'new' });
            setImages(parseImages(draft.image || ''));
            setInitialLoad(true);
          } catch (e) { }
        } else {
          navigate('/campaigns/new');
        }
      } else if (id) {
        const data = getCampaign(id);
        if (data) {
          setCampaign(data);
          setImages(parseImages(data.image || ''));
          setInitialLoad(true);
        }
      }
    }
  }, [id, getCampaign, navigate, initialLoad]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('transportes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('transportes')
        .getPublicUrl(filePath);

      const newImages = [...images];
      if (typeof index === 'number' && index < images.length) {
        newImages[index] = publicUrl;
      } else {
        newImages.push(publicUrl);
      }
      setImages(newImages);

      // Se for uma campanha existente, já salva no banco
      if (id !== 'new' && campaign) {
        // Ensure we are saving a valid JSON array of strings
        await updateCampaign(campaign.id, { image: JSON.stringify(newImages) });
      }
    } catch (err: any) {
      console.error('Erro no upload:', err);
      alert(`Erro ao subir imagem: ${err.message || 'Tente novamente.'}`);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (id !== 'new' && campaign) {
      // Ensure we are saving a valid JSON array of strings
      await updateCampaign(campaign.id, { image: JSON.stringify(newImages) });
    }
  };

  const handleSave = async () => {
    if (id === 'new') {
      const draftStr = sessionStorage.getItem('draft_campaign');
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          sessionStorage.setItem('draft_campaign', JSON.stringify({ ...draft, image: JSON.stringify(images) }));
          navigate('/campaigns/new/prizes');
        } catch (e) {
          console.error(e);
        }
      }
    } else if (id && campaign) {
      navigate(`/campaigns/${id}/prizes`);
    } else {
      alert('Embarcação não carregada.');
    }
  };

  if (!campaign) {
    return (
      <div className="bg-[#f9fafb] dark:bg-[#121212] min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando mídias...</p>
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
            <div className="absolute top-1/2 left-0 h-0.5 bg-[#6366f1] -translate-y-1/2 -z-10 transition-all duration-500" style={{ width: '100%' }}></div>
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
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Imagens da embarcação</label>
            <div className="grid grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-[4/3] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e1e1e] overflow-hidden group shadow-sm hover:shadow-md transition-all">
                  <img src={img} alt={`Campaign ${idx}`} className="w-full h-full object-cover" />

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      className="p-2 bg-white text-red-500 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors shadow-lg transform hover:scale-105 active:scale-95"
                      title="Remover imagem"
                    >
                      <span className="material-icons-round text-lg">delete</span>
                    </button>
                  </div>

                  {idx === 0 && (
                    <div className="absolute top-2 left-2 bg-[#6366f1] text-[10px] text-white font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wider">
                      Capa
                    </div>
                  )}
                </div>
              ))}

              {images.length < 3 && (
                <div className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-[#6366f1] dark:hover:border-[#6366f1] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group bg-white dark:bg-[#1e1e1e]">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform text-slate-400 group-hover:text-[#6366f1]">
                    <span className="material-icons-round text-xl">{uploading ? 'sync' : 'add_photo_alternate'}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium group-hover:text-[#6366f1] transition-colors">
                    {uploading ? 'Enviando...' : 'Adicionar foto'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e)}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    title={uploading ? "Aguarde o upload terminar" : "Clique para selecionar uma imagem"}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span className="material-icons-round text-[14px]">info</span>
              Recomendado: 1080x1080px ou 1920x1080px (Máx. 3 imagens)
            </p>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f9fafb]/90 dark:bg-[#121212]/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-md mx-auto flex gap-3">
          <button onClick={() => id === 'new' ? navigate('/campaigns/new/edit') : navigate(-1)} className="flex-1 py-4 px-6 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            <span className="material-icons-round text-sm">arrow_back</span>
            Voltar
          </button>
          <button onClick={handleSave} className="flex-[2] py-4 px-6 rounded-xl bg-[#6366f1] text-white font-semibold shadow-lg shadow-[#6366f1]/25 hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            Próximo
            <span className="material-icons-round text-sm">arrow_forward</span>
          </button>
        </div>
      </div>

      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-8 gap-8 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1e1e]">
        <div className="w-10 h-10 bg-[#6366f1] rounded-xl flex items-center justify-center text-white shadow-lg">
          <span className="material-icons-round">bolt</span>
        </div>
        <div className="flex flex-col gap-6">
          <span className="material-icons-round text-[#6366f1]">campaign</span>
          <span className="material-icons-round text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">group</span>
          <span className="material-icons-round text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">account_balance_wallet</span>
          <span className="material-icons-round text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">analytics</span>
          <span className="material-icons-round text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">person</span>
        </div>
        <div className="mt-auto">
          <span className="material-icons-round text-slate-400 hover:text-red-500 cursor-pointer">logout</span>
        </div>
      </div>
    </div>
  );
}
