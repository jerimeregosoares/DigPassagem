import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useCampaign } from '../context/CampaignContext';
import { supabase } from '../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { validatePhone, generateWhatsAppMessage, openWhatsApp, logAudit } from '../utils/whatsapp';
import RaffleManager from '../components/RaffleManager';
import RankingManager from '../components/RankingManager';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Utils ──────────────────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
   const R = 6371; // Earth radius in km
   const dLat = (lat2 - lat1) * (Math.PI / 180);
   const dLon = (lon2 - lon1) * (Math.PI / 180);
   const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
   return R * c;
}

const NOTIFICATION_SOUNDS = {
   new_purchase: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
   proximity: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
   checkin: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
};

function playSound(type: keyof typeof NOTIFICATION_SOUNDS) {
   const audio = new Audio(NOTIFICATION_SOUNDS[type]);
   audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
}

// Fix for leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── Types ───────────────────────────────────────────────────
type PurchaseStatus = 'pending' | 'approved' | 'cancelled';

interface Purchase {
   id: string;
   cliente_id: string;
   transporte_id: string;
   tickets: number[];
   total_value: number;
   status: PurchaseStatus;
   proof_url?: string;
   created_at: string;
   boarding_address?: string;
   boarding_lat?: number;
   boarding_lng?: number;
   checked_in?: boolean;
   clientes?: {
      name: string;
      phone: string;
      email?: string;
      boarding_address?: string;
      boarding_lat?: number;
      boarding_lng?: number;
   };
}

// ─── Helpers ────────────────────────────────────────────────
function parsePaymentTime(pt: string): number {
   if (!pt) return 60;
   const m = pt.match(/(\d+)/);
   const n = m ? parseInt(m[1]) : 1;
   if (pt.toLowerCase().includes('hora')) return n * 60;
   return n;
}

// ─── Status Badge ────────────────────────────────────────────
function StatusBadge({ 
   status, 
   onClick 
}: { 
   status: PurchaseStatus; 
   onClick?: () => void;
}) {
   const map: Record<PurchaseStatus, { label: string; cls: string }> = {
      pending: { label: 'Pagamento pendente', cls: 'bg-amber-100 text-amber-700' },
      approved: { label: 'Pagamento aprovado', cls: 'bg-emerald-100 text-emerald-600' },
      cancelled: { label: 'Pagamento cancelado', cls: 'bg-red-100 text-red-500' },
   };
   const { label, cls } = map[status] || map.pending;
   
   return (
      <button 
         onClick={(e) => {
            if (onClick) {
               e.stopPropagation();
               onClick();
            }
         }}
         disabled={!onClick}
         className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-transform active:scale-95 ${cls} ${onClick ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}
      >
         {label}
      </button>
   );
}

// ─── Payment Analysis Modal ──────────────────────────────────
function PaymentModal({
   purchase,
   onClose,
   onStatusChange,
}: {
   purchase: Purchase;
   onClose: () => void;
   onStatusChange: (id: string, status: PurchaseStatus) => Promise<void>;
}) {
   const [loading, setLoading] = useState(false);

   const handleAction = async (newStatus: PurchaseStatus) => {
      setLoading(true);
      try {
         // Chamamos a função central que já cuida de atualizar o banco e o estado
         await onStatusChange(purchase.id, newStatus);
         onClose();
      } catch (err) {
         console.error(err);
      } finally {
         setLoading(false);
      }
   };

   const isPending = purchase.status === 'pending';
   const isApproved = purchase.status === 'approved';
   const isCancelled = purchase.status === 'cancelled';

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
         <div
            className="bg-[#1E1E1E] w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
         >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-start bg-[#181818]">
               <div>
                  <h3 className="font-bold text-white text-base">
                     {isApproved ? 'Pagamento Aprovado' : isCancelled ? 'Pagamento Cancelado' : 'Análise de Pagamento'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                     Verifique o comprovante abaixo.
                  </p>
               </div>
               <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                  <span className="material-icons-round text-lg">close</span>
               </button>
            </div>

            {/* Top Action Buttons */}
            <div className="p-3 gap-2 flex flex-col sm:flex-row bg-[#1E1E1E]">
               {isPending && (
                  <>
                     <button
                        onClick={() => handleAction('approved')}
                        disabled={loading}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-70 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                     >
                        <span className="material-icons-outlined text-sm">check_circle</span>
                        Aprovar
                     </button>
                     <button
                        onClick={() => handleAction('cancelled')}
                        disabled={loading}
                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-70 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                     >
                        <span className="material-icons-outlined text-sm">cancel</span>
                        Cancelar
                     </button>
                  </>
               )}
               {isApproved && (
                  <button
                     onClick={() => handleAction('cancelled')}
                     disabled={loading}
                     className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                     <span className="material-icons-outlined text-sm">undo</span>
                     Reverter / Cancelar Compra
                  </button>
               )}
               {isCancelled && (
                  <button
                     onClick={() => handleAction('approved')}
                     disabled={loading}
                     className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                     <span className="material-icons-outlined text-sm">restore</span>
                     Reativar / Aprovar Compra
                  </button>
               )}
            </div>

            {/* Proof image (Centered) */}
            <div className="flex-1 overflow-y-auto bg-black/20 p-4 flex items-center justify-center min-h-[200px]">
               {purchase.proof_url ? (
                  <img
                     src={purchase.proof_url}
                     alt="Comprovante"
                     className="w-full h-auto object-contain rounded-lg border border-slate-700 shadow-lg"
                  />
               ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                     <span className="material-icons-outlined text-4xl mb-2 opacity-50">image_not_supported</span>
                     <p className="text-xs">Nenhum comprovante anexado</p>
                  </div>
               )}
            </div>

            {/* Bottom Download Button */}
            {purchase.proof_url && (
               <div className="p-3 border-t border-slate-700 bg-[#181818]">
                  <a
                     href={purchase.proof_url}
                     download={`comprovante-${purchase.id}`}
                     target="_blank"
                     rel="noreferrer"
                     className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-300 bg-[#252525] border border-slate-600 hover:bg-[#2A2A2A] hover:text-white rounded-lg py-2.5 transition-colors"
                  >
                     <span className="material-icons-outlined text-sm">download</span>
                     Baixar Comprovante Original
                  </a>
               </div>
            )}
         </div>
      </div>
   );
}

// ─── Purchase Card ───────────────────────────────────────────
function PurchaseCard({
   purchase,
   onAnalyze,
   isMenuOpen,
   setIsMenuOpen,
   onStatusChange,
   onCheckIn,
   onUpdateValue
}: {
   purchase: Purchase;
   onAnalyze: (p: Purchase) => void;
   isMenuOpen: boolean;
   setIsMenuOpen: (open: boolean) => void;
   onStatusChange: (id: string, status: PurchaseStatus) => Promise<void>;
   onCheckIn: (id: string, checkedIn: boolean) => Promise<void>;
   onUpdateValue: (id: string, value: number) => Promise<void>;
}) {
   const [copySuccess, setCopySuccess] = useState(false);
   const [showData, setShowData] = useState(false);
   const [whatsAppLoading, setWhatsAppLoading] = useState(false);
   const [whatsAppFeedback, setWhatsAppFeedback] = useState<'success' | 'error' | null>(null);
   const [checkInLoading, setCheckInLoading] = useState(false);
   const [isEditingValue, setIsEditingValue] = useState(false);
   const [newValue, setNewValue] = useState(purchase.total_value.toString());

   const isApproved = purchase.status === 'approved';

   const customer = purchase.clientes;
   const maskedPhone = customer?.phone
      ? `(**) *****-${customer.phone.slice(-4)}`
      : '(**)  *****-****';
   const maskedEmail = customer?.email
      ? customer.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      : '---';

   const handleStatusCycle = async () => {
      const cycle: Record<PurchaseStatus, PurchaseStatus> = {
         cancelled: 'pending',
         pending: 'approved',
         approved: 'cancelled'
      };
      const nextStatus = cycle[purchase.status];
      await onStatusChange(purchase.id, nextStatus);
   };

   const handleSaveValue = async () => {
      const val = parseFloat(newValue.replace(',', '.'));
      if (isNaN(val)) return;
      await onUpdateValue(purchase.id, val);
      setIsEditingValue(false);
   };

   const handleCheckInClick = async () => {
      setCheckInLoading(true);
      try {
         await onCheckIn(purchase.id, !purchase.checked_in);
      } finally {
         setCheckInLoading(false);
      }
   };

   const handleWhatsAppClick = () => {
      if (!customer?.phone) {
         setWhatsAppFeedback('error');
         setTimeout(() => setWhatsAppFeedback(null), 3000);
         return;
      }

      setWhatsAppLoading(true);
      const validPhone = validatePhone(customer.phone);

      if (!validPhone) {
         setWhatsAppLoading(false);
         setWhatsAppFeedback('error');
         alert('Número de telefone inválido para envio via WhatsApp.');
         setTimeout(() => setWhatsAppFeedback(null), 3000);
         return;
      }

      try {
         const message = generateWhatsAppMessage(purchase, window.location.origin);
         logAudit('whatsapp_send_attempt', { purchaseId: purchase.id, status: purchase.status, phone: validPhone });

         // Pequeno delay para feedback visual
         setTimeout(() => {
            openWhatsApp(validPhone, message);
            setWhatsAppLoading(false);
            setWhatsAppFeedback('success');
            setTimeout(() => setWhatsAppFeedback(null), 3000);
         }, 500);
      } catch (error) {
         console.error('Erro ao enviar WhatsApp:', error);
         setWhatsAppLoading(false);
         setWhatsAppFeedback('error');
      }
   };

   const formattedDate = new Date(purchase.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
   });

   const displayPhone = showData && customer?.phone ? customer.phone : maskedPhone;
   const displayEmail = showData && customer?.email ? customer.email : maskedEmail;

   return (
      <div
         className={`bg-[#1E1E1E] rounded-xl border border-slate-800 border-t-2 border-t-[#6366F1]/30 relative overflow-hidden group ${isMenuOpen ? 'z-50' : 'z-0'}`}
         style={{ isolation: 'isolate' }}
      >
         <div className="flex items-center justify-between px-5 py-4">
            <StatusBadge status={purchase.status} onClick={handleStatusCycle} />
            <div className="flex items-center gap-2 relative">
               <button
                  onClick={() => setShowData(!showData)}
                  className={`text-slate-400 hover:text-[#6366F1] transition-colors p-1.5 rounded-lg hover:bg-white/5 ${showData ? 'text-[#6366F1]' : ''}`}
                  title={showData ? "Ocultar Dados" : "Mostrar Dados"}
               >
                  <span className="material-icons-outlined text-lg">{showData ? 'visibility_off' : 'visibility'}</span>
               </button>

               {purchase.proof_url && (
                  <button
                     onClick={() => onAnalyze(purchase)}
                     className="text-orange-500 hover:text-orange-400 transition-colors p-1.5 rounded-lg hover:bg-orange-500/10"
                     title="Ver Comprovante"
                  >
                     <span className="material-icons-outlined text-lg">receipt_long</span>
                  </button>
               )}

               <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`text-slate-400 hover:text-[#6366F1] transition-all p-1.5 rounded-lg hover:bg-white/5 ${isMenuOpen ? 'bg-white/10 text-white' : ''}`}
               >
                  <span className="material-icons-outlined text-lg">more_vert</span>
               </button>
            </div>
         </div>

         {/* Dropdown Sidebar Menu */}
         <div className={`absolute inset-0 z-[60] bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMenuOpen(false)} />

         <div className={`absolute top-0 right-0 h-full w-[180px] bg-[#181818] border-l border-slate-800 shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="h-full flex flex-col relative z-[80]">
               <div className="p-2 border-b border-white/5 flex justify-between items-center bg-[#1E1E1E]">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Opções</span>
                  <button onClick={() => setIsMenuOpen(false)} className="text-slate-500 hover:text-white p-0.5 hover:bg-white/5 rounded transition-colors">
                     <span className="material-icons-outlined text-xs">close</span>
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className="p-1 space-y-0.5">
                     <button
                        onClick={() => {
                           const link = `${window.location.origin}/r/${purchase.id}`;
                           navigator.clipboard.writeText(link);
                           setCopySuccess(true);
                           setTimeout(() => setCopySuccess(false), 2000);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-300 hover:text-white hover:bg-white/5 rounded-md transition-colors group"
                     >
                        <span className="material-icons-outlined text-xs text-slate-500 group-hover:text-[#6366F1] transition-colors">{copySuccess ? 'check_circle' : 'open_in_new'}</span>
                        <span>{copySuccess ? 'Copiado!' : 'Link da compra'}</span>
                     </button>
                     <button
                        onClick={handleWhatsAppClick}
                        disabled={whatsAppLoading}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-[10px] rounded-md transition-colors group ${whatsAppFeedback === 'success'
                              ? 'text-emerald-400 bg-emerald-400/10'
                              : whatsAppFeedback === 'error'
                                 ? 'text-red-400 bg-red-400/10'
                                 : 'text-slate-300 hover:text-white hover:bg-white/5'
                           }`}
                     >
                        {whatsAppLoading ? (
                           <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                           <span className={`material-icons-outlined text-xs transition-colors ${whatsAppFeedback === 'success' ? 'text-emerald-400' :
                                 whatsAppFeedback === 'error' ? 'text-red-400' :
                                    'text-slate-500 group-hover:text-emerald-500'
                              }`}>
                              {whatsAppFeedback === 'success' ? 'check' : whatsAppFeedback === 'error' ? 'error_outline' : 'messenger_outline'}
                           </span>
                        )}
                        <span>
                           {whatsAppLoading ? 'Enviando...' :
                              whatsAppFeedback === 'success' ? 'Enviado!' :
                                 whatsAppFeedback === 'error' ? 'Erro' :
                                    'Entrar em contato'}
                        </span>
                     </button>
                  </div>

                  <div className="p-2 border-y border-white/5 bg-white/[0.01]">
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
                  </div>
                  <div className="p-1 space-y-0.5">
                     <button
                        onClick={() => { onStatusChange(purchase.id, 'approved'); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-300 hover:text-emerald-400 hover:bg-emerald-400/5 rounded-md transition-colors group"
                     >
                        <span className="material-icons-outlined text-xs text-slate-500 group-hover:text-emerald-500 transition-colors">check_circle_outline</span>
                        <span>Aprovar compra</span>
                     </button>
                     <button
                        onClick={() => { onStatusChange(purchase.id, 'cancelled'); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-300 hover:text-red-400 hover:bg-red-400/5 rounded-md transition-colors group"
                     >
                        <span className="material-icons-outlined text-xs text-slate-500 group-hover:text-red-500 transition-colors">highlight_off</span>
                        <span>Cancelar compra</span>
                     </button>
                  </div>
               </div>
            </div>
         </div>

         <div className="px-5 pb-5">
            <div className="flex flex-wrap items-center gap-3 mb-4">
               <p 
                  className="font-extrabold text-[#6366F1] text-base uppercase tracking-tight cursor-pointer hover:underline underline-offset-4"
                  onClick={() => onAnalyze(purchase)}
                  title="Ver informações do passageiro"
               >
                  {customer?.name || 'Comprador'}
               </p>
               
               {(purchase.status === 'pending' || purchase.status === 'approved') && (
                  <button
                     onClick={handleCheckInClick}
                     disabled={checkInLoading}
                     className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-all shadow-sm ${
                        purchase.checked_in 
                           ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                           : 'bg-[#6366F1] text-white hover:bg-[#5a5cdb] border border-[#6366F1]'
                     }`}
                  >
                     {checkInLoading ? (
                        <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                     ) : (
                        <span className="material-icons-outlined text-sm">{purchase.checked_in ? 'check_circle' : 'how_to_reg'}</span>
                     )}
                     {purchase.checked_in ? 'CHECK-IN REALIZADO' : 'FAZER CHECK-IN'}
                  </button>
               )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
               <div className="space-y-3">
                  <div className="flex items-center gap-2.5 text-slate-300">
                     <span className="material-icons-outlined text-base text-[#6366F1]">mail_outline</span>
                     <span className="truncate">{displayEmail}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                     <span className="material-icons-outlined text-base text-[#6366F1]">confirmation_number</span>
                     <span>{purchase.tickets?.length || 0} passagem{(purchase.tickets?.length || 0) !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                     <span className="material-icons-outlined text-base text-[#6366F1]">attach_money</span>
                     {isEditingValue && !isApproved ? (
                        <div className="flex items-center gap-1">
                           <input 
                              type="text" 
                              value={newValue} 
                              onChange={(e) => setNewValue(e.target.value)}
                              className="bg-[#181818] border border-slate-700 text-white text-[10px] px-1 py-0.5 rounded w-16 outline-none focus:border-[#6366F1]"
                              autoFocus
                           />
                           <button onClick={handleSaveValue} className="text-emerald-500 hover:text-emerald-400">
                              <span className="material-icons-outlined text-xs">check</span>
                           </button>
                           <button onClick={() => setIsEditingValue(false)} className="text-red-500 hover:text-red-400">
                              <span className="material-icons-outlined text-xs">close</span>
                           </button>
                        </div>
                     ) : (
                        <span 
                           className={`font-bold transition-colors ${!isApproved ? 'cursor-pointer hover:text-white' : 'cursor-default'}`} 
                           onClick={() => !isApproved && setIsEditingValue(true)}
                           title={isApproved ? "Valor não editável após aprovado" : "Clique para editar valor"}
                        >
                           R$ {Number(purchase.total_value).toFixed(2).replace('.', ',')}
                        </span>
                     )}
                  </div>
               </div>
               <div className="space-y-3">
                  <div className="flex items-center gap-2.5 text-slate-300">
                     <span className="material-icons-outlined text-base text-[#6366F1]">phone</span>
                     <span>{displayPhone}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                     <span className="material-icons-outlined text-base text-[#6366F1]">calendar_today</span>
                     <span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                     <span className="material-icons-outlined text-base text-[#6366F1]">payments</span>
                     <span>Pago via PIX Manual</span>
                  </div>
               </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/5">
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Poltronas Compradas</p>
               <div className="flex flex-wrap gap-1.5">
                  <div className="bg-[#181818] border border-slate-800 text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-md">
                     {String(purchase.tickets?.length || 0).padStart(2, '0')}
                  </div>
                  {purchase.tickets?.length > 0 && (
                     <div className="flex flex-wrap gap-1">
                        {purchase.tickets.sort((a, b) => a - b).map((t) => (
                           <span key={t} className="bg-white/5 text-slate-400 text-[9px] px-1.5 py-0.5 rounded border border-white/5">
                              {String(t).padStart(2, '0')}
                           </span>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div >
   );
}

// ─── Sales History View ──────────────────────────────────────
function SalesHistoryView({
   campaignId,
   purchases,
   loading,
   refreshPurchases,
   handleStatusChange,
   handleCheckIn,
   handleUpdateValue
}: {
   campaignId: string,
   purchases: Purchase[],
   loading: boolean,
   refreshPurchases: () => void,
   handleStatusChange: (id: string, status: PurchaseStatus) => Promise<void>,
   handleCheckIn: (id: string, checkedIn: boolean) => Promise<void>,
   handleUpdateValue: (id: string, value: number) => Promise<void>
}) {
   const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
   const [statusFilter, setStatusFilter] = useState<'all' | PurchaseStatus | 'checkin'>('all');
   const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

   const filtered = (() => {
      if (statusFilter === 'all') return purchases;
      if (statusFilter === 'checkin') return purchases.filter(p => p.status === 'pending' || p.status === 'approved');
      return purchases.filter(p => p.status === statusFilter);
   })() as Purchase[];

   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Histórico de vendas</h2>
            <div className="flex gap-2">
               <button onClick={refreshPurchases} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-[#1E1E1E] border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors">
                  <span className="material-icons-round text-sm">refresh</span>
                  Atualizar
               </button>
               <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-[#1E1E1E] border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors">
                  <span className="material-icons-outlined text-sm">tune</span>
                  Filtros
               </button>
               <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-[#1E1E1E] border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors">
                  <span className="material-icons-outlined text-sm">upload</span>
                  Exportar
               </button>
            </div>
         </div>

         {/* Quick filter chips */}
         <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'cancelled', 'checkin'] as const).map((f) => {
               const labels: Record<string, string> = { 
                  all: 'Todos', 
                  pending: 'Pendentes', 
                  approved: 'Aprovados', 
                  cancelled: 'Cancelados',
                  checkin: 'Elegíveis Check-in'
               };
               return (
                  <button
                     key={f}
                     onClick={() => setStatusFilter(f)}
                     className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${statusFilter === f ? 'bg-[#6366F1] border-[#6366F1] text-white' : 'bg-[#1E1E1E] border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                     {labels[f]}
                  </button>
               );
            })}
         </div>

         {loading ? (
            <div className="text-slate-500 text-sm text-center py-10">Carregando pedidos...</div>
         ) : filtered.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-10">
               <span className="material-icons-outlined text-4xl block mb-2 text-slate-700">receipt_long</span>
               Nenhum pedido encontrado.
            </div>
         ) : (
            <div className="space-y-4">
               {filtered.map((p) => (
                  <div
                     key={p.id}
                     className={`relative transition-all duration-200 ${activeMenuId === p.id ? 'z-50' : 'z-0'}`}
                  >
                     <PurchaseCard
                        purchase={p}
                        onAnalyze={(purchase: Purchase) => setSelectedPurchase(purchase)}
                        onStatusChange={handleStatusChange}
                        onCheckIn={handleCheckIn}
                        onUpdateValue={handleUpdateValue}
                        isMenuOpen={activeMenuId === p.id}
                        setIsMenuOpen={(open) => setActiveMenuId(open ? p.id : null)}
                     />
                  </div>
               ))}
            </div>
         )}

         {selectedPurchase && (
            <PaymentModal
               purchase={selectedPurchase}
               onClose={() => setSelectedPurchase(null)}
               onStatusChange={handleStatusChange}
            />
         )}
      </div>
   );
}

// ─── Boarding View ──────────────────────────────────────────
function BoardingView({
   campaignId,
   purchases,
   loading,
   onAnalyze,
   handleStatusChange,
   handleUpdateValue
}: {
   campaignId: string,
   purchases: Purchase[],
   loading: boolean,
   onAnalyze: (p: Purchase) => void,
   handleStatusChange: (id: string, status: PurchaseStatus) => Promise<void>,
   handleUpdateValue: (id: string, value: number) => Promise<void>
}) {
   const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
   const [statusFilter, setStatusFilter] = useState<'all' | PurchaseStatus>('all');
   const [notifiedClients, setNotifiedClients] = useState<Set<string>>(new Set());

   useEffect(() => {
      let watchId: number;
      if (navigator.geolocation) {
         watchId = navigator.geolocation.watchPosition(
            (pos) => {
               const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
               setCurrentPos(newPos);
               
               // Update vessel location in DB for client tracking
               supabase
                  .from('transportes')
                  .update({ 
                     vessel_lat: pos.coords.latitude, 
                     vessel_lng: pos.coords.longitude 
                  })
                  .eq('id', campaignId)
                  .then(({ error }) => {
                     if (error) console.error('Error updating vessel location:', error);
                  });
            },
            (err) => console.error("Error watching location:", err),
            { enableHighAccuracy: true }
         );
      }
      return () => {
         if (watchId) navigator.geolocation.clearWatch(watchId);
      };
   }, [campaignId]);

   // Proximity check logic
   useEffect(() => {
      if (!currentPos) return;

      const newNotified = new Set(notifiedClients);
      let playedSound = false;

      boardingPurchases.forEach(p => {
         const bLat = (p.boarding_lat !== undefined && p.boarding_lat !== null) ? p.boarding_lat : p.clientes?.boarding_lat;
         const bLng = (p.boarding_lng !== undefined && p.boarding_lng !== null) ? p.boarding_lng : p.clientes?.boarding_lng;
         
         if (bLat && bLng && !newNotified.has(p.id)) {
            const dist = haversineDistance(currentPos[0], currentPos[1], bLat, bLng);
            if (dist <= 2) {
               playSound('proximity');
               newNotified.add(p.id);
               playedSound = true;
            }
         }
      });

      if (playedSound) {
         setNotifiedClients(newNotified);
      }
   }, [currentPos, purchases]);

   const boardingPurchases = purchases.filter(p => {
      const lat = p.boarding_lat !== undefined && p.boarding_lat !== null ? p.boarding_lat : p.clientes?.boarding_lat;
      const lng = p.boarding_lng !== undefined && p.boarding_lng !== null ? p.boarding_lng : p.clientes?.boarding_lng;
      return lat !== undefined && lat !== null && lng !== undefined && lng !== null;
   });
   const filtered = statusFilter === 'all' ? boardingPurchases : boardingPurchases.filter(p => p.status === statusFilter);

   if (loading) return <div className="text-center p-10 text-slate-500">Carregando dados de embarque...</div>;

   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Embarque Trajeto</h2>
            <div className="text-[10px] text-slate-400 bg-[#1E1E1E] border border-slate-800 px-2 py-1 rounded-md flex items-center gap-1">
               <span className="material-icons-outlined text-xs">info</span>
               <span>Clientes que embarcam no trajeto</span>
            </div>
         </div>

         {/* Filter pills exactly like the image */}
         <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'cancelled'] as const).map((f) => {
               const labels: Record<string, string> = { all: 'Todos', pending: 'Pendentes', approved: 'Aprovados', cancelled: 'Cancelados' };
               return (
                  <button
                     key={f}
                     onClick={() => setStatusFilter(f)}
                     className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${statusFilter === f ? 'bg-[#6366F1] text-white shadow-lg shadow-indigo-500/20' : 'bg-[#1E1E1E] text-slate-300 hover:bg-[#252525]'}`}
                  >
                     {labels[f]}
                  </button>
               );
            })}
         </div>

         {filtered.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-10">
               <span className="material-icons-outlined text-4xl block mb-2 text-slate-700">directions_boat</span>
               Nenhum cliente para embarque no trajeto encontrado.
            </div>
         ) : (
            <div className="space-y-4">
               {filtered.map((p) => {
                  const bLat = (p.boarding_lat !== undefined && p.boarding_lat !== null) ? p.boarding_lat : p.clientes?.boarding_lat;
                  const bLng = (p.boarding_lng !== undefined && p.boarding_lng !== null) ? p.boarding_lng : p.clientes?.boarding_lng;
                  const bAddr = p.boarding_address || p.clientes?.boarding_address;

                  return (
                     <div key={p.id} className="bg-[#1E1E1E] rounded-xl border border-slate-800 border-t-2 border-t-[#6366F1]/50 overflow-hidden flex flex-col md:flex-row h-full group">
                        <div className="flex-1 p-5 relative">
                           {/* Header Actions */}
                           <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => onAnalyze(p)} className="text-[#6366F1] hover:bg-[#6366F1]/10 p-1 rounded-md transition-colors">
                                 <span className="material-icons-outlined text-lg">visibility</span>
                              </button>
                              <button className="text-[#6366F1] hover:bg-[#6366F1]/10 p-1 rounded-md transition-colors">
                                 <span className="material-icons-outlined text-lg">more_vert</span>
                              </button>
                           </div>

                           <div className="mb-4">
                              <StatusBadge status={p.status} onClick={async () => {
                                 const cycle: Record<PurchaseStatus, PurchaseStatus> = {
                                    cancelled: 'pending',
                                    pending: 'approved',
                                    approved: 'cancelled'
                                 };
                                 await handleStatusChange(p.id, cycle[p.status]);
                              }} />
                           </div>
                           
                           <p 
                              className="font-extrabold text-[#6366F1] text-base mb-4 uppercase tracking-tight cursor-pointer hover:underline underline-offset-4"
                              onClick={() => onAnalyze(p)}
                              title="Ver informações do passageiro"
                           >
                              {p.clientes?.name || 'Comprador'}
                           </p>
                           
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                              <div className="space-y-3">
                                 <div className="flex items-center gap-2.5 text-slate-300">
                                    <span className="material-icons-outlined text-base text-[#6366F1]">mail_outline</span>
                                    <span className="truncate">{p.clientes?.email || 'N/A'}</span>
                                 </div>
                                 <div className="flex items-center gap-2.5 text-slate-300">
                                    <span className="material-icons-outlined text-base text-[#6366F1]">confirmation_number</span>
                                    <span>{p.tickets?.length || 0} passagem{(p.tickets?.length || 0) !== 1 ? 's' : ''}</span>
                                 </div>
                                 <div className="flex items-center gap-2.5 text-slate-300">
                                    <span className="material-icons-outlined text-base text-[#6366F1]">attach_money</span>
                                    <span className="font-bold">R$ {Number(p.total_value).toFixed(2).replace('.', ',')}</span>
                                 </div>
                              </div>
                              <div className="space-y-3">
                                 <div className="flex items-center gap-2.5 text-slate-300">
                                    <span className="material-icons-outlined text-base text-[#6366F1]">phone</span>
                                    <span>{p.clientes?.phone || 'N/A'}</span>
                                 </div>
                                 <div className="flex items-center gap-2.5 text-slate-300">
                                    <span className="material-icons-outlined text-base text-[#6366F1]">calendar_today</span>
                                    <span>{new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                 </div>
                                 <div className="flex items-center gap-2.5 text-slate-300">
                                    <span className="material-icons-outlined text-base text-[#6366F1]">payments</span>
                                    <span>Pago via PIX Manual</span>
                                 </div>
                              </div>
                           </div>

                           {/* Boarding Info */}
                           {bAddr && (
                              <div className="mt-5 bg-white/[0.03] p-3 rounded-lg border border-white/5">
                                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Local de Embarque</p>
                                 <div className="flex items-start gap-2 text-xs text-slate-200">
                                    <span className="material-icons-outlined text-sm text-[#6366F1] mt-0.5">place</span>
                                    <span className="leading-relaxed">{bAddr}</span>
                                 </div>
                              </div>
                           )}

                           {/* Tickets count like the image */}
                           <div className="mt-5 pt-4 border-t border-white/5">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Poltronas Compradas</p>
                              <div className="flex flex-wrap gap-1.5">
                                 <div className="bg-[#181818] border border-slate-800 text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-md w-fit">
                                    {String(p.tickets?.length || 0).padStart(2, '0')}
                                 </div>
                                 {p.tickets?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                       {p.tickets.sort((a, b) => a - b).map((t) => (
                                          <span key={t} className="bg-white/5 text-slate-400 text-[9px] px-1.5 py-0.5 rounded border border-white/5">
                                             {String(t).padStart(2, '0')}
                                          </span>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>

                        <div className="w-full md:w-[320px] h-[240px] md:h-auto relative bg-black/20 group/map">
                           {bLat !== undefined && bLat !== null && bLng !== undefined && bLng !== null ? (
                              <MapContainer
                                 center={[bLat, bLng]}
                                 zoom={13}
                                 style={{ height: '100%', width: '100%' }}
                                 zoomControl={false}
                              >
                                 <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                 <Marker position={[bLat, bLng]} />
                                 {currentPos && (
                                    <>
                                       <Marker 
                                          position={currentPos} 
                                          icon={L.icon({
                                             iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                             shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                             iconSize: [25, 41],
                                             iconAnchor: [12, 41],
                                             popupAnchor: [1, -34],
                                             shadowSize: [41, 41]
                                          })}
                                       />
                                       <Polyline 
                                          positions={[currentPos, [bLat, bLng]]}
                                          color="#6366F1"
                                          weight={3}
                                          dashArray="10, 10"
                                          opacity={0.8}
                                       />
                                    </>
                                 )}
                                 <MapAutoZoom currentPos={currentPos} boardingPos={[bLat, bLng]} />
                              </MapContainer>
                           ) : (
                              <div className="flex items-center justify-center h-full text-slate-600">
                                 <span className="material-icons-outlined text-4xl">map</span>
                              </div>
                           )}
                           <div className="absolute top-3 right-3 z-[400] bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-[9px] text-white font-bold flex items-center gap-2 border border-white/10 shadow-xl">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                              <span className="uppercase tracking-widest">Sua Localização</span>
                           </div>
                           
                           {/* Map hint */}
                           <div className="absolute bottom-3 left-3 z-[400] bg-[#6366F1] text-white px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest shadow-lg opacity-0 group-hover/map:opacity-100 transition-opacity">
                              Rota em linha reta
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>
   );
}

function MapAutoZoom({ currentPos, boardingPos }: { currentPos: [number, number] | null, boardingPos: [number, number] }) {
   const map = useMap();
   useEffect(() => {
      if (currentPos) {
         const bounds = L.latLngBounds([currentPos, boardingPos]);
         map.fitBounds(bounds, { padding: [30, 30] });
      }
   }, [currentPos, boardingPos, map]);
   return null;
}

// ─── Main CampaignManager ────────────────────────────────────
export default function CampaignManager() {
   const { id } = useParams();
   const { getCampaign } = useCampaign();
   const campaign = getCampaign(id || '');
   const [showBalance, setShowBalance] = useState(false);
   const [activeTab, setActiveTab] = useState<'details' | 'sales' | 'ranking' | 'raffle' | 'boarding'>('details');

   // ─── Real Data Fetching ──────────────────────────────────────
   const [purchases, setPurchases] = useState<Purchase[]>([]);
   const [loadingPurchases, setLoadingPurchases] = useState(true);
   const [newPurchaseAlert, setNewPurchaseAlert] = useState<{ name: string; id: string } | null>(null);

   useEffect(() => {
      if (!campaign?.id) return;

      // Realtime listener for new purchases and check-ins
      const channel = supabase
         .channel(`campaign-${campaign.id}`)
         .on(
            'postgres_changes',
            {
               event: '*',
               schema: 'public',
               table: 'historico_vendas',
               filter: `transporte_id=eq.${campaign.id}`
            },
            async (payload) => {
               console.log('Realtime change detected:', payload);
               
               if (payload.eventType === 'INSERT') {
                  playSound('new_purchase');
                  // Fetch the customer name for the alert
                  const { data: customer } = await supabase
                     .from('clientes')
                     .select('name')
                     .eq('id', payload.new.cliente_id)
                     .single();
                  
                  setNewPurchaseAlert({ name: customer?.name || 'Novo Cliente', id: payload.new.id });
                  setTimeout(() => setNewPurchaseAlert(null), 10000);
                  fetchPurchases();
               }

               if (payload.eventType === 'UPDATE') {
                  // If checked_in changed to true
                  if (payload.new.checked_in && !payload.old.checked_in) {
                     playSound('checkin');
                  }
                  // Optional: Refresh if status changed
                  if (payload.new.status !== payload.old.status) {
                     fetchPurchases();
                  }
               }
            }
         )
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, [campaign?.id]);

   const fetchPurchases = async () => {
      if (!campaign?.id) return;
      setLoadingPurchases(true);
      try {
         const { data } = await supabase
            .from('historico_vendas')
            .select('*, checked_in, clientes(name, phone, email, boarding_address, boarding_lat, boarding_lng)')
            .eq('transporte_id', campaign.id)
            .order('created_at', { ascending: false });

         const rawPurchases = (data || []) as Purchase[];

         // ─── Logic to check expiration ───
         const payMinutes = parsePaymentTime(campaign.paymentTime || '1 hora');
         const now = new Date();
         const expiredIds: string[] = [];

         const updatedPurchases = rawPurchases.map(p => {
            if (p.status === 'pending') {
               const createdAt = new Date(p.created_at);
               const expiresAt = new Date(createdAt.getTime() + payMinutes * 60000);
               if (now > expiresAt) {
                  expiredIds.push(p.id);
                  return { ...p, status: 'cancelled' as PurchaseStatus };
               }
            }
            return p;
         });

         setPurchases(updatedPurchases);

         // Update DB in background if there are expired ones
         if (expiredIds.length > 0) {
            supabase
               .from('historico_vendas')
               .update({ status: 'cancelled' })
               .in('id', expiredIds)
               .then(({ error }) => {
                  if (error) console.error('Error auto-cancelling expired payments:', error);
                  else console.log(`Auto-cancelled ${expiredIds.length} expired payments.`);
               });
         }
      } catch (err) {
         console.error('Error fetching purchases:', err);
      } finally {
         setLoadingPurchases(false);
      }
   };

   useEffect(() => {
      fetchPurchases();
   }, [campaign?.id]);

   const handleStatusChange = async (pid: string, newStatus: PurchaseStatus) => {
      try {
         // 1. Atualiza no Banco de Dados primeiro
         const { error } = await supabase
            .from('historico_vendas')
            .update({ status: newStatus })
            .eq('id', pid);

         if (error) throw error;

         // 2. Se salvou no banco, atualiza o estado local para refletir na UI
         setPurchases((prev) =>
            prev.map((p) => (p.id === pid ? { ...p, status: newStatus } : p))
         );
      } catch (err) {
         console.error('Erro ao atualizar status no banco:', err);
         alert('Erro ao salvar alteração no banco de dados. Tente novamente.');
      }
   };

   const handleCheckIn = async (pid: string, checkedIn: boolean) => {
      try {
         const { error } = await supabase
            .from('historico_vendas')
            .update({ checked_in: checkedIn })
            .eq('id', pid);

         if (error) throw error;
         setPurchases((prev) =>
            prev.map((p) => (p.id === pid ? { ...p, checked_in: checkedIn } : p))
         );
      } catch (err) {
         console.error('Error updating check-in:', err);
         alert('Erro ao realizar check-in. Verifique se a coluna "checked_in" existe no seu banco de dados.');
      }
   };

   const handleUpdateValue = async (pid: string, value: number) => {
      try {
         const { error } = await supabase
            .from('historico_vendas')
            .update({ total_value: value })
            .eq('id', pid);

         if (error) throw error;
         setPurchases((prev) =>
            prev.map((p) => (p.id === pid ? { ...p, total_value: value } : p))
         );
      } catch (err) {
         console.error('Error updating value:', err);
         alert('Erro ao atualizar valor no banco de dados.');
      }
   };

   if (!campaign) {
      return <div className="text-center p-10 text-slate-500">Embarcação não encontrada</div>;
   }

   // ─── Computed Stats ──────────────────────────────────────────
   const approvedPurchases = purchases.filter(p => p.status === 'approved');
   const pendingPurchases = purchases.filter(p => p.status === 'pending');

   const totalApprovedValue = approvedPurchases.reduce((sum, p) => sum + Number(p.total_value), 0);
   const totalPendingValue = pendingPurchases.reduce((sum, p) => sum + Number(p.total_value), 0);

   const ticketsApproved = approvedPurchases.reduce((sum, p) => sum + (p.tickets?.length || 0), 0);
   const ticketsPending = pendingPurchases.reduce((sum, p) => sum + (p.tickets?.length || 0), 0);

   const ticketsTotal = campaign.ticketQuantity || 0;
   const ticketsAvailable = ticketsTotal - (ticketsApproved + ticketsPending);

   const progress = ticketsTotal > 0 ? (ticketsApproved / ticketsTotal) * 100 : 0;

   // ─── Chart Data (last 7 days) ────────────────────────────────
   const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
   }).reverse();

   const chartData = last7Days.map(date => {
      const dayApproved = approvedPurchases.filter(p => p.created_at.startsWith(date));
      const value = dayApproved.reduce((sum, p) => sum + (p.tickets?.length || 0), 0);
      return {
         name: date.split('-').reverse().slice(0, 2).join('/'),
         value
      };
   });

   const menuItems = [
      { icon: 'info', label: 'Detalhes da Campanha', tab: 'details' as const },
      { icon: 'show_chart', label: 'Histórico de Vendas', tab: 'sales' as const },
      { icon: 'star', label: 'Embarque Trajeto', tab: 'boarding' as const },
      { icon: 'emoji_events', label: 'Passagens Premiados', tab: null },
      { icon: 'card_giftcard', label: 'Caixas/Roletas Premiadas', tab: null },
      { icon: 'bar_chart', label: 'Maior ou Menor Poltrona', tab: null },
      { icon: 'schedule', label: 'Horário Premiado', tab: null },
      { icon: 'groups', label: 'Ranking', tab: 'ranking' as const },
      { icon: 'emoji_events', label: 'Finalizar Embarque', tab: 'raffle' as const },
   ];

   return (
      <div className="bg-[#F9FAFB] dark:bg-[#121212] text-slate-900 dark:text-slate-100 min-h-screen font-sans flex relative">
         {/* New Purchase Visual Alert */}
         {newPurchaseAlert && (
            <div className="fixed top-20 right-6 z-[9999] animate-in slide-in-from-right duration-500">
               <div className="bg-[#6366F1] text-white p-4 rounded-2xl shadow-2xl shadow-indigo-500/40 flex items-center gap-4 border border-white/20 backdrop-blur-md">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                     <span className="material-icons-round text-2xl">shopping_cart</span>
                  </div>
                  <div>
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Nova Venda / Reserva!</p>
                     <p className="text-sm font-black truncate max-w-[150px]">{newPurchaseAlert.name}</p>
                  </div>
                  <button 
                     onClick={() => {
                        setActiveTab('sales');
                        setNewPurchaseAlert(null);
                     }}
                     className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors"
                  >
                     <span className="material-icons-round">visibility</span>
                  </button>
               </div>
            </div>
         )}

         <div className="hidden lg:block h-screen sticky top-0">
            <Sidebar />
         </div>
         <div className="flex-1 flex flex-col min-h-screen relative">
            <Header />
            <main className="px-4 py-2 space-y-6 pb-24 lg:pb-8 lg:px-8 max-w-6xl w-full mx-auto">
               <div className="flex items-center gap-2 mb-4">
                  <h1 className="text-xl font-bold">Gerenciador</h1>
               </div>

               {/* Grid Menu */}
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {menuItems.map((item, index) => {
                     const isActive = item.tab ? activeTab === item.tab : false;
                     return (
                        <div
                           key={index}
                           onClick={() => item.tab && setActiveTab(item.tab)}
                           className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-colors ${isActive ? 'bg-[#1E1E1E] border-[#6366F1] text-[#6366F1]' : 'bg-[#1E1E1E] border-slate-800 text-slate-400 hover:border-slate-600'}`}
                        >
                           <span className="material-icons-outlined mb-1">{item.icon}</span>
                           <span className="text-[10px] text-center font-medium leading-tight">{item.label}</span>
                        </div>
                     );
                  })}
               </div>

               {/* ── Sales History Tab ── */}
               {activeTab === 'sales' && (
                  <SalesHistoryView
                     campaignId={campaign.id}
                     purchases={purchases}
                     loading={loadingPurchases}
                     refreshPurchases={fetchPurchases}
                     handleStatusChange={handleStatusChange}
                     handleCheckIn={handleCheckIn}
                     handleUpdateValue={handleUpdateValue}
                  />
               )}

               {/* ── Ranking Tab ── */}
               {activeTab === 'ranking' && (
                  <RankingManager campaign={campaign} />
               )}

               {/* ── Raffle Tab ── */}
               {activeTab === 'raffle' && (
                  <RaffleManager campaign={campaign} />
               )}

               {/* ── Boarding Tab ── */}
               {activeTab === 'boarding' && (
                  <BoardingView
                     purchases={purchases}
                     loading={loadingPurchases}
                     onAnalyze={(purchase: Purchase) => setSelectedPurchase(purchase)}
                     handleStatusChange={handleStatusChange}
                     handleUpdateValue={handleUpdateValue}
                  />
               )}

               {/* ── Details Tab ── */}
               {activeTab === 'details' && (
                  <>
                     {/* Campaign Details Card */}
                     <div className="space-y-2">
                        <h2 className="text-lg font-bold">Detalhes</h2>
                        <div className="bg-[#1E1E1E] rounded-xl border border-slate-800 p-4 flex flex-col md:flex-row items-center gap-4">
                           <div className="w-24 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0">
                              {(() => {
                                 let imgUrl = campaign.image || '';
                                 if (imgUrl.startsWith('[') || imgUrl.startsWith('{')) {
                                    try {
                                       const parsed = JSON.parse(imgUrl);
                                       imgUrl = Array.isArray(parsed) ? parsed[0] : imgUrl;
                                    } catch (e) { }
                                 }
                                 return (
                                    <img
                                       src={imgUrl || 'https://via.placeholder.com/400x400?text=Sem+Imagem'}
                                       alt={campaign.title}
                                       className="w-full h-full object-contain p-1"
                                       referrerPolicy="no-referrer"
                                    />
                                 );
                              })()}
                           </div>
                           <div className="flex-1 w-full">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <span className="text-xs text-slate-500 uppercase font-bold">Título</span>
                                    <h3 className="text-lg font-bold text-white">{campaign.title}</h3>
                                 </div>
                                 <div className="flex gap-2">
                                    <Link to={`/campaigns/${campaign.id}/setup`} className="bg-[#181818] hover:bg-[#252525] border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                                       <span className="material-icons-outlined text-sm">edit</span> Editar
                                    </Link>
                                    <Link to={`/passagens/${campaign.slug}`} target="_blank" className="bg-[#181818] hover:bg-[#252525] border border-slate-700 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors">
                                       <span className="material-icons-outlined text-sm">open_in_new</span>
                                    </Link>
                                    <button className="bg-[#181818] hover:bg-[#252525] border border-slate-700 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors">
                                       <span className="material-icons-outlined text-sm">share</span>
                                    </button>
                                    <button className="bg-[#181818] hover:bg-[#252525] border border-slate-700 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors">
                                       <span className="material-icons-outlined text-sm">settings</span>
                                    </button>
                                 </div>
                              </div>
                              <div className="mt-4">
                                 <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">Progresso</span>
                                    <span className="bg-[#6366F1] text-white px-1.5 rounded text-[10px] font-bold">{progress.toFixed(0)}%</span>
                                 </div>
                                 <div className="w-full bg-slate-800 rounded-full h-2">
                                    <div className="bg-gradient-to-r from-[#6366F1] to-[#818cf8] h-2 rounded-full relative" style={{ width: `${progress}%` }}>
                                       <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg" />
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Faturamento e Reservas */}
                     <div className="bg-[#1E1E1E] rounded-xl border border-slate-800 overflow-hidden">
                        <div className="p-4 border-b border-slate-800">
                           <h2 className="text-lg font-bold text-white">Faturamento e Reservas</h2>
                           <p className="text-xs text-slate-500">Visualize o faturamento e as reservas da sua passagem ao longo do tempo</p>
                        </div>
                        <div className="p-4 space-y-6">
                           <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs text-slate-500">Faturamento</span>
                                 <button onClick={() => setShowBalance(!showBalance)} className="text-slate-500 hover:text-white">
                                    <span className="material-icons-outlined text-sm">visibility</span>
                                 </button>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 {[
                                    { icon: '$', color: 'text-emerald-500', label: 'Total aprovado', value: showBalance ? `R$ ${totalApprovedValue.toFixed(2).replace('.', ',')}` : 'R$ ****' },
                                    { icon: '$', color: 'text-orange-500', label: 'Total pendente', value: showBalance ? `R$ ${totalPendingValue.toFixed(2).replace('.', ',')}` : 'R$ ****' },
                                    { icon: 'check_circle', color: 'text-blue-500', label: 'Passagens aprovados', value: ticketsApproved.toString(), isIcon: true },
                                    { icon: 'confirmation_number', color: 'text-orange-500', label: 'Passagens pendentes', value: ticketsPending.toString(), isIcon: true },
                                 ].map((stat) => (
                                    <div key={stat.label} className="bg-[#181818] border border-slate-800 rounded-lg p-3 flex items-center gap-2">
                                       {stat.isIcon ? (
                                          <span className={`material-icons-outlined ${stat.color} text-sm`}>{stat.icon}</span>
                                       ) : (
                                          <span className={`${stat.color} font-bold`}>{stat.icon}</span>
                                       )}
                                       <div>
                                          <p className="text-[10px] text-slate-500">{stat.label}</p>
                                          <p className={`${stat.color} font-bold text-sm`}>{stat.value}</p>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>

                           <div>
                              <p className="text-xs text-slate-500 mb-2">Compras e reservas</p>
                              <div className="grid grid-cols-4 text-center border-b border-slate-800 pb-2 mb-2">
                                 {['Passagens', 'Disponíveis', 'Reservados', 'Comprados'].map((h) => (
                                    <span key={h} className="text-xs text-slate-500">{h}</span>
                                 ))}
                              </div>
                              <div className="grid grid-cols-4 text-center">
                                 <span className="text-xl font-bold text-white">{ticketsTotal}</span>
                                 <span className="text-xl font-bold text-white">{ticketsAvailable}</span>
                                 <span className="text-xl font-bold text-white">{ticketsPending}</span>
                                 <span className="text-xl font-bold text-white">{ticketsApproved}</span>
                              </div>
                           </div>

                           <div>
                              <div className="flex justify-between items-center mb-4">
                                 <p className="text-xs text-slate-500">Vendas p/dia</p>
                                 <div className="bg-[#181818] border border-slate-800 rounded px-2 py-1 flex items-center gap-1 text-xs text-white">
                                    <span className="material-icons-outlined text-sm">calendar_today</span>
                                    {chartData[0].name.replace('/', '-')} - {chartData[chartData.length - 1].name.replace('/', '-')}
                                 </div>
                              </div>
                              <div className="h-64 w-full bg-[#181818] rounded-xl p-4">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                       <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                       <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} orientation="right" />
                                       <Tooltip
                                          contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#334155', color: '#fff' }}
                                          itemStyle={{ color: '#fff' }}
                                          cursor={{ fill: 'transparent' }}
                                       />
                                       <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                          {chartData.map((_, i) => <Cell key={i} fill="#6366F1" />)}
                                       </Bar>
                                    </BarChart>
                                 </ResponsiveContainer>
                              </div>
                           </div>
                        </div>
                     </div>
                  </>
               )}
            </main>
         </div>
      </div>
   );
}
