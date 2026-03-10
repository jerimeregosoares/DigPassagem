import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useCampaign } from '../context/CampaignContext';
import { supabase } from '../lib/supabaseClient';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ─── Utils & Assets ──────────────────────────────────────────
const NOTIFICATION_SOUNDS = {
   proximity: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
};

function playSound(type: keyof typeof NOTIFICATION_SOUNDS) {
   const audio = new Audio(NOTIFICATION_SOUNDS[type]);
   audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
}

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper: Haversine Distance in KM (Moved outside component for global access)
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

// ─── Location Picker Modal ──────────────────────────────────
   function LocationPickerModal({
      isOpen,
      onClose,
      onConfirm,
      initialLat,
      initialLng,
      originLat,
      originLng,
      routeTotalKm
   }: {
      isOpen: boolean;
      onClose: () => void;
      onConfirm: (lat: number, lng: number) => void;
      initialLat?: number | null;
      initialLng?: number | null;
      originLat?: number;
      originLng?: number;
      routeTotalKm?: number;
   }) {
      const [position, setPosition] = useState<[number, number] | null>(
         initialLat && initialLng ? [initialLat, initialLng] : null
      );
      const [loadingLocation, setLoadingLocation] = useState(false);
      const [distanceInfo, setDistanceInfo] = useState<string | null>(null);

      // Calcular distância ao mudar posição
      useEffect(() => {
         if (position && originLat && originLng) {
            const dist = haversineDistance(originLat, originLng, position[0], position[1]);
            let info = `Distância da Origem: ${dist.toFixed(2)} km`;
            
            if (routeTotalKm && routeTotalKm > 0) {
               const percent = Math.min((dist / routeTotalKm) * 100, 60);
               const discount = percent.toFixed(0);
               info += ` • Desconto Estimado: ${discount}%`;
            }
            setDistanceInfo(info);
         } else {
            setDistanceInfo(null);
         }
      }, [position, originLat, originLng, routeTotalKm]);

      // Component to handle map clicks
      function LocationMarker() {
         useMapEvents({
            click(e) {
               setPosition([e.latlng.lat, e.latlng.lng]);
            },
         });

         return position === null ? null : (
            <Marker position={position}></Marker>
         );
      }

   // Component to center map on position change
   function MapUpdater({ center }: { center: [number, number] | null }) {
      const map = useMap();
      useEffect(() => {
         if (center) {
            map.flyTo(center, 16);
         }
      }, [center, map]);
      return null;
   }

   const handleGetCurrentLocation = (showError = true) => {
      setLoadingLocation(true);
      if ('geolocation' in navigator) {
         navigator.geolocation.getCurrentPosition(
            (pos) => {
               setPosition([pos.coords.latitude, pos.coords.longitude]);
               setLoadingLocation(false);
            },
            (err) => {
               console.error(err);
               if (showError) {
                  // Check for insecure origin (HTTP on non-localhost)
                  const isSecure = window.location.protocol === 'https:' || 
                                   window.location.hostname === 'localhost' || 
                                   window.location.hostname === '127.0.0.1';
                                   
                  if (!isSecure) {
                     alert('A geolocalização automática foi bloqueada pelo navegador porque o site não está usando HTTPS. Por favor, clique no mapa para selecionar o local manualmente.');
                  } else {
                     alert('Não foi possível obter sua localização. Verifique se a permissão foi concedida nas configurações do navegador.');
                  }
               }
               setLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
         );
      } else {
         if (showError) alert('Geolocalização não suportada neste navegador.');
         setLoadingLocation(false);
      }
   };

   // Auto-get location if no initial position (Silent mode)
   useEffect(() => {
      if (isOpen && !position) {
         handleGetCurrentLocation(false);
      }
   }, [isOpen]);

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
         <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-icons-round text-[#6366F1]">location_on</span>
                  Selecione o local de embarque
               </h3>
               <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                  <span className="material-icons-round text-slate-500">close</span>
               </button>
            </div>
            
            <div className="flex-1 relative bg-slate-100">
               <MapContainer 
                  center={position || [-15.793889, -47.882778]} // Default: Brasilia or User Location
                  zoom={position ? 16 : 4} 
                  style={{ height: '100%', width: '100%' }}
               >
                  <TileLayer
                     attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                     url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker />
                  <MapUpdater center={position} />
               </MapContainer>

               {/* Floating Controls */}
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-[400] w-full max-w-sm px-4">
                  <button
                     onClick={() => handleGetCurrentLocation(true)}
                     disabled={loadingLocation}
                     className="bg-white text-slate-700 p-3 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center"
                     title="Minha Localização"
                  >
                     {loadingLocation ? (
                        <span className="material-icons-round animate-spin text-indigo-500">sync</span>
                     ) : (
                        <span className="material-icons-round text-indigo-500">my_location</span>
                     )}
                  </button>
                  <button
                     onClick={() => {
                        if (position) {
                           onConfirm(position[0], position[1]);
                           onClose();
                        } else {
                           alert('Clique no mapa para selecionar um local.');
                        }
                     }}
                     disabled={!position}
                     className="flex-1 bg-[#6366F1] hover:bg-[#5558dd] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                     <span className="material-icons-round">check</span>
                     Confirmar Localização
                  </button>
               </div>

               {/* Instruction Badge */}
               <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-[400] w-full px-4 pointer-events-none">
                  <div className="bg-white/90 backdrop-blur text-slate-700 text-xs font-bold px-4 py-2 rounded-full shadow-md border border-slate-200">
                     Clique no mapa ou arraste para ajustar
                  </div>
                  {distanceInfo && (
                     <div className="bg-indigo-600/90 backdrop-blur text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-in slide-in-from-top-2 border border-indigo-500">
                        {distanceInfo}
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}

// ─── Helpers ────────────────────────────────────────────────
function formatPhone(value: string) {
   const digits = value.replace(/\D/g, '').slice(0, 11);
   if (digits.length <= 2) return `(${digits}`;
   if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
   if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
   return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function maskPhone(phone: string) {
   const d = phone.replace(/\D/g, '');
   if (d.length < 11) return phone;
   return `(**) *****-${d.slice(7)}`;
}

function isPhoneComplete(phone: string) {
   return phone.replace(/\D/g, '').length === 11;
}

function formatCpf(value: string) {
   const digits = value.replace(/\D/g, '').slice(0, 11);
   return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function validateCpf(cpf: string) {
   const clean = cpf.replace(/\D/g, '');
   if (clean.length !== 11) return false;
   if (/^(\d)\1+$/.test(clean)) return false; // todos digitos iguais

   let sum = 0;
   let remainder;

   for (let i = 1; i <= 9; i++)
      sum = sum + parseInt(clean.substring(i - 1, i)) * (11 - i);

   remainder = (sum * 10) % 11;

   if ((remainder === 10) || (remainder === 11)) remainder = 0;
   if (remainder !== parseInt(clean.substring(9, 10))) return false;

   sum = 0;
   for (let i = 1; i <= 10; i++)
      sum = sum + parseInt(clean.substring(i - 1, i)) * (12 - i);

   remainder = (sum * 10) % 11;

   if ((remainder === 10) || (remainder === 11)) remainder = 0;
   if (remainder !== parseInt(clean.substring(10, 11))) return false;

   return true;
}

function formatCpfOrPhone(value: string) {
   const digits = value.replace(/\D/g, '');
   if (digits.length > 11) {
      // CNPJ ou erro, mas vamos assumir CPF formatado
      return formatCpf(digits);
   }
   // Tenta inferir se é CPF ou Telefone pelo contexto ou deixa o usuário escolher
   // Para simplificar a UX, se tiver 11 digitos, formatamos como CPF se começar com 0, 1, 2... 
   // Mas telefones também têm 11. 
   // Vamos formatar como telefone por padrão se <= 11, a menos que o usuário explicitamente selecione CPF.
   // Melhor: Vamos formatar apenas como números se for ambíguo, ou usar duas máscaras.
   // Vou usar uma lógica simples: Se < 11 -> Telefone parcial. Se 11 -> Telefone.
   // O usuário terá um seletor "Buscar por: [Telefone] [CPF]" no modal.
   return formatPhone(value);
}

function getTicketPrice(value: string) {
   return Number((value || '0').replace(',', '.')) || 0;
}

function formatDateTime(isoString: string) {
   if (!isoString) return '';
   try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleString('pt-BR', {
         day: '2-digit',
         month: '2-digit',
         hour: '2-digit',
         minute: '2-digit'
      });
   } catch (e) {
      return isoString;
   }
}

function parsePaymentTime(pt: string): number {
   // e.g. "1 hora" => 60, "30 minutos" => 30
   if (!pt) return 60;
   const m = pt.match(/(\d+)/);
   const n = m ? parseInt(m[1]) : 1;
   if (pt.toLowerCase().includes('hora')) return n * 60;
   return n;
}

function calculateAgeInfo(birthDate: string) {
   if (!birthDate) return null;
   
   // Parse manual para evitar problemas de fuso horário (UTC vs Local)
   // birthDate vem como "YYYY-MM-DD"
   const [y, m, d] = birthDate.split('-').map(Number);
   const birth = new Date(y, m - 1, d); // Cria data local
   const now = new Date();

   let years = now.getFullYear() - birth.getFullYear();
   let months = now.getMonth() - birth.getMonth();
   let days = now.getDate() - birth.getDate();

   if (days < 0) {
      months--;
      const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += lastMonth.getDate();
   }
   if (months < 0) {
      years--;
      months += 12;
   }

   // Ajuste simples para o cálculo de totalDays aproximado
   const totalMonths = years * 12 + months;
   const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));

   if (years === 0 && months === 0) {
      return { text: `${totalDays} ${totalDays === 1 ? 'DIA' : 'DIAS'}`, years, totalMonths, totalDays };
   }
   if (years === 0) {
      return { text: `${months} ${months === 1 ? 'MÊS' : 'MESES'}`, years, totalMonths, totalDays };
   }
   return {
      text: `${years} ANOS${months > 0 ? ` E ${months} ${months === 1 ? 'MÊS' : 'MESES'}` : ''}`,
      years,
      totalMonths,
      totalDays
   };
}

// ─── Terms Modal ─────────────────────────────────────────────
function TermsModal({ description, onClose }: { description: string; onClose: () => void }) {
   return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
         <div
            className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
         >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-black text-slate-900 mb-3">Termos e Condições</h3>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
               {description ||
                  'Ao participar desta campanha, você declara que tem 18 anos ou mais e que está ciente das regras desta promoção específica. Sua participação não gera vínculo direto com a plataforma DigPassagem. Todos os dados fornecidos serão tratados com responsabilidade.'}
            </p>
            <button
               onClick={onClose}
               className="mt-6 w-full bg-[#6366F1] text-white font-bold py-3 rounded-xl"
            >
               Entendido
            </button>
         </div>
      </div>
   );
}

function CustomerSelectionModal({
   isOpen,
   onClose,
   customers,
   onSelect,
   onRegisterNew
}: {
   isOpen: boolean;
   onClose: () => void;
   customers: any[];
   onSelect: (customer: any) => void;
   onRegisterNew?: () => void;
}) {
   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
         <div className="bg-white w-full max-w-md rounded-2xl p-6 m-4 shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-icons-round text-[#6366F1]">people</span>
                  Selecione seu cadastro
               </h3>
               <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <span className="material-icons-round text-slate-500">close</span>
               </button>
            </div>

            <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm mb-4 flex gap-2">
               <span className="material-icons-round text-base mt-0.5">info</span>
               <p>Encontramos cadastros com este telefone. Identifique o seu ou crie um novo.</p>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar mb-4">
               {customers.map((c) => (
                  <button
                     key={c.id}
                     onClick={() => onSelect(c)}
                     className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#6366F1] hover:bg-slate-50 transition-all group relative overflow-hidden"
                  >
                     <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold group-hover:bg-[#6366F1] group-hover:text-white transition-colors">
                           {c.name ? c.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                           <div className="font-bold text-slate-800 group-hover:text-[#6366F1] transition-colors">{c.name}</div>
                           <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                                 CPF: {c.cpf ? `***.${c.cpf.substr(4, 3)}.${c.cpf.substr(8, 3)}-**` : 'Não informado'}
                              </span>
                           </div>
                        </div>
                        <div className="ml-auto">
                           <span className="material-icons-round text-slate-300 group-hover:text-[#6366F1] transition-colors">chevron_right</span>
                        </div>
                     </div>
                  </button>
               ))}
            </div>

            {onRegisterNew && (
               <button
                  onClick={onRegisterNew}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-slate-200"
               >
                  <span className="material-icons-round text-slate-500">person_add</span>
                  Não sou nenhum destes, quero cadastrar
               </button>
            )}
         </div>
      </div>
   );
}

// ─── Countdown Timer ─────────────────────────────────────────
function CountdownTimer({ minutes, createdAt, onExpire }: { minutes: number; createdAt?: Date | null; onExpire?: () => void }) {
   const [secondsLeft, setSecondsLeft] = useState(minutes * 60);

   useEffect(() => {
      if (createdAt) {
         const now = new Date();
         const diffMs = now.getTime() - createdAt.getTime();
         const diffSec = Math.floor(diffMs / 1000);
         const totalSec = minutes * 60;
         const remaining = Math.max(0, totalSec - diffSec);
         setSecondsLeft(remaining);
      }
   }, [createdAt, minutes]);

   useEffect(() => {
      if (secondsLeft <= 0) {
         if (onExpire) onExpire();
         return;
      }
      const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
      return () => clearTimeout(t);
   }, [secondsLeft, onExpire]);

   const m = Math.floor(secondsLeft / 60);
   const s = secondsLeft % 60;
   const expired = secondsLeft <= 0;
   return (
      <div
         className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${expired
            ? 'bg-red-50 text-red-500 border-red-200'
            : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}
      >
         <span className="material-icons-outlined text-base">timer</span>
         {expired ? 'Tempo expirado' : `${m}min ${String(s).padStart(2, '0')}s`}
      </div>
   );
}

// ─── History Modal ────────────────────────────────────────────
function HistoryModal({
   isOpen,
   onClose,
   history
}: {
   isOpen: boolean;
   onClose: () => void;
   history: any[]
}) {
   if (!isOpen) return null;
   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
         <div
            className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
         >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800">Minhas Transações</h3>
               <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                  <span className="material-icons-round text-slate-500">close</span>
               </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
               {history.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-4">Nenhuma transação encontrada nesta campanha.</p>
               ) : (
                  history.map((item) => (
                     <div key={item.id} className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                           <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                              item.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                 'bg-red-100 text-red-600'
                              }`}>
                              {item.status === 'approved' ? 'Aprovado' : item.status === 'pending' ? 'Pendente' : 'Cancelado'}
                           </span>
                           <span className="text-xs text-slate-400">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                           </span>
                        </div>
                        {item.trip_date && (
                           <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg w-fit">
                              <span className="material-icons-round text-xs">event</span>
                              VIAGEM: {new Date(item.trip_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                           </div>
                        )}
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-xs text-slate-500 mb-1">Poltronas:</p>
                              <div className="flex flex-wrap gap-1">
                                 {item.tickets.map((t: number) => (
                                    <span key={t} className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                       {String(t).padStart(2, '0')}
                                    </span>
                                 ))}
                              </div>
                           </div>
                           <p className="font-bold text-slate-700 text-sm">
                              R$ {item.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                           </p>
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>
      </div>
   );
}

// ─── Main Component ──────────────────────────────────────────

export default function RafflePage() {
   const { slug } = useParams();
   const location = useLocation();
   const navigate = useNavigate();
   const { getCampaign } = useCampaign();

   const [campaign, setCampaign] = useState<any>(null);
   const [isRegulationOpen, setIsRegulationOpen] = useState(false);
   const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
   const [currentImageIndex, setCurrentImageIndex] = useState(0);
   const [direction, setDirection] = useState(0);
   const [isPaused, setIsPaused] = useState(false);

   // Local state for payment config (fetched from campaign owner)
   const [pixConfig, setPixConfig] = useState<{ keyType: string; pixKey: string } | null>(null);
   const [n8nConfig, setN8NConfig] = useState<{ createUrl: string; checkUrl: string; isActive: boolean }>({ createUrl: '', checkUrl: '', isActive: false });
   const [activeMethod, setActiveMethod] = useState<'pixManual' | 'n8n' | null>(null);

   // ── Checkout state ──────────────────────────────────────────
   const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(0); // 7=N8N Payment
   const [phone, setPhone] = useState('');
   const [name, setName] = useState('');
   const [email, setEmail] = useState('');
   const [cpf, setCpf] = useState('');
   const [termsAccepted, setTermsAccepted] = useState(false);
   const [showTermsModal, setShowTermsModal] = useState(false);
   const [existingCustomer, setExistingCustomer] = useState<any>(null);
   const [lookingUp, setLookingUp] = useState(false);
   const [copied, setCopied] = useState(false);
   const [errors, setErrors] = useState<Record<string, string>>({});
   const [submitting, setSubmitting] = useState(false);
   const [isGeneratingPix, setIsGeneratingPix] = useState(false);
   const [paymentData, setPaymentData] = useState<any>(null);
   const [showHistory, setShowHistory] = useState(false);
   const [customerHistory, setCustomerHistory] = useState<any[]>([]);
   const [showPhoneModal, setShowPhoneModal] = useState(false);
   const [birthDate, setBirthDate] = useState('');
   const [birthDateInput, setBirthDateInput] = useState('');

   // Boarding State
   const [boardingOnRoute, setBoardingOnRoute] = useState<boolean | null>(null);
   const [boardingAddress, setBoardingAddress] = useState('');
   const [boardingMapLink, setBoardingMapLink] = useState(''); // Mantido para compatibilidade, mas não usado na UI nova
   const [boardingLat, setBoardingLat] = useState<number | null>(null);
   const [boardingLng, setBoardingLng] = useState<number | null>(null);
   const [showLocationPicker, setShowLocationPicker] = useState(false);

   useEffect(() => {
      if (birthDate) {
         const [y, m, d] = birthDate.split('-');
         if (y && m && d) {
            setBirthDateInput(`${d}/${m}/${y}`);
         }
      } else {
         setBirthDateInput('');
      }
   }, [birthDate]);

   const [responsibleId, setResponsibleId] = useState<string | null>(null);
   const [responsibleName, setResponsibleName] = useState('');
   const [relationship, setRelationship] = useState('');
   const [responsibleSearch, setResponsibleSearch] = useState('');
   const [responsibleOptions, setResponsibleOptions] = useState<any[]>([]);
   const [searchingResponsible, setSearchingResponsible] = useState(false);
   const [isRegisteringResponsible, setIsRegisteringResponsible] = useState(false);
   const [newResponsibleName, setNewResponsibleName] = useState('');
   const [newResponsiblePhone, setNewResponsiblePhone] = useState('');

   const ageInfo = calculateAgeInfo(birthDate);
   const isMinor = ageInfo ? ageInfo.years < 18 : false;
   const isLapChild = ageInfo ? ageInfo.years < 6 : false;
   const isHalfPrice = ageInfo ? (ageInfo.years >= 6 && ageInfo.years < 12) : false;

   const handleResponsibleSearch = async (val: string) => {
      setResponsibleSearch(val);
      if (val.length < 3) {
         setResponsibleOptions([]);
         return;
      }

      setSearchingResponsible(true);
      try {
         const clean = val.replace(/\D/g, '');
         let query = supabase.from('clientes').select('*');

         if (clean.length >= 8) {
            // Busca por CPF ou Telefone se parecer número
            const formatted = formatCpf(clean);
            query = query.or(`cpf.eq.${clean},cpf.eq.${formatted},phone.eq.${clean}`);
         } else {
            // Busca por Nome
            query = query.ilike('name', `%${val}%`);
         }

         const { data } = await query.limit(5);
         // Filter to only show adults
         const adults = (data || []).filter(c => {
            if (!c.birth_date) return true; // Assume adulto se não informado
            const age = calculateAgeInfo(c.birth_date);
            return age && age.years >= 18;
         });
         setResponsibleOptions(adults);
      } catch (e) {
         console.error(e);
      } finally {
         setSearchingResponsible(false);
      }
   };

   const handleCreateResponsible = async () => {
      if (!newResponsibleName || !isPhoneComplete(newResponsiblePhone)) {
         alert('Informe o nome completo e telefone com DDD do responsável.');
         return;
      }

      setSearchingResponsible(true);
      try {
         const { data, error } = await supabase
            .from('clientes')
            .insert({
               name: newResponsibleName.trim().toUpperCase(),
               phone: newResponsiblePhone.replace(/\D/g, '')
            })
            .select()
            .single();

         if (error) throw error;

         setResponsibleId(data.id);
         setResponsibleName(data.name);
         setIsRegisteringResponsible(false);
         setNewResponsibleName('');
         setNewResponsiblePhone('');
      } catch (err) {
         console.error('Erro ao criar responsável:', err);
         alert('Erro ao cadastrar responsável. Tente novamente.');
      } finally {
         setSearchingResponsible(false);
      }
   };

   // Debug para monitorar mudanças no estado do modal
   useEffect(() => {
      console.log('Estado do showPhoneModal mudou para:', showPhoneModal);
   }, [showPhoneModal]);
   const [consultPhone, setConsultPhone] = useState('');
   const [consultCustomer, setConsultCustomer] = useState<any>(null);
   const [consultCustomers, setConsultCustomers] = useState<any[]>([]); // Lista para seleção
   const [showConsultSelectionModal, setShowConsultSelectionModal] = useState(false); // Controle do modal de seleção
   const [consultHistory, setConsultHistory] = useState<any[]>([]);
   const [loadingHistory, setLoadingHistory] = useState(false);
   const [proofFile, setProofFile] = useState<File | null>(null);
   const [proofPreview, setProofPreview] = useState<string | null>(null);
   const [currentPurchaseId, setCurrentPurchaseId] = useState<string | null>(null);
   const [uploading, setUploading] = useState(false);
   const [ticketsStatus, setTicketsStatus] = useState<Record<number, { status: string; expiresAt: Date }>>({});
   const [fetchingTickets, setFetchingTickets] = useState(true);
   const [socialNetworks, setSocialNetworks] = useState<any>(null);
   const [organizerPhone, setOrganizerPhone] = useState('');
   const [purchaseCreatedAt, setPurchaseCreatedAt] = useState<Date | null>(null);
   const [showPurchaseSelectionModal, setShowPurchaseSelectionModal] = useState(false);
   const [purchaseCandidates, setPurchaseCandidates] = useState<any[]>([]);

   // ─── Uniqueness Validation State ─────────────────────────────
   const [isCheckingUniqueness, setIsCheckingUniqueness] = useState(false);
   const [selectedTripIndex, setSelectedTripIndex] = useState<number>(0);
   const [isTripDropdownOpen, setIsTripDropdownOpen] = useState(false);
   const [isReturnTripDropdownOpen, setIsReturnTripDropdownOpen] = useState(false);
   const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
   const [isReturnDateDropdownOpen, setIsReturnDateDropdownOpen] = useState(false);
   const [selectedReturnTripIndex, setSelectedReturnTripIndex] = useState<number>(0);
   const [uniquenessErrors, setUniquenessErrors] = useState<{ phone?: string, cpf?: string }>({});
   const [selectedTripDate, setSelectedTripDate] = useState<string>('');
   const [selectedReturnDate, setSelectedReturnDate] = useState<string>('');
   const [tripLegs, setTripLegs] = useState({ ida: true, volta: false });

   const weekdayMap: Record<string, number> = {
      'DOMINGO': 0,
      'SEGUNDA-FEIRA': 1,
      'TERÇA-FEIRA': 2,
      'QUARTA-FEIRA': 3,
      'QUINTA-FEIRA': 4,
      'SEXTA-FEIRA': 5,
      'SÁBADO': 6,
      'SEGUNDA': 1,
      'TERÇA': 2,
      'QUARTA': 3,
      'QUINTA': 4,
      'SEXTA': 5
   };

   const getAvailableDates = (dayOfWeekStr: string) => {
      const dayNum = weekdayMap[dayOfWeekStr.toUpperCase()] ?? 1;
      const dates = [];
      const today = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 6);

      let current = new Date(today);
      // Ajusta para o próximo dia da semana correspondente
      while (current.getDay() !== dayNum) {
         current.setDate(current.getDate() + 1);
      }

      while (current <= end) {
         dates.push(new Date(current));
         current.setDate(current.getDate() + 7);
      }
      return dates;
   };

   // ─── Discount Logic (Linear Distance) ────────────────────────
   const [discountPercentage, setDiscountPercentage] = useState(0);
   const [originalTicketValue, setOriginalTicketValue] = useState(0);
   const [finalTicketValue, setFinalTicketValue] = useState(0);
   const [originName, setOriginName] = useState('');

   useEffect(() => {
      if (!campaign || !campaign.ticket_value) return;

      const basePrice = getTicketPrice(campaign.ticket_value);
      
      // Update Original Ticket Value only if it changed
      setOriginalTicketValue(prev => prev !== basePrice ? basePrice : prev);

      // Reset discount if boarding not on route or missing coordinates
      if (boardingOnRoute !== true || !boardingLat || !boardingLng || !campaign.locations || campaign.locations.length === 0) {
         setDiscountPercentage(0);
         setFinalTicketValue(basePrice);
         return;
      }

      // Extract Route Total Distance
      let routeTotalKm = 0;
      if (campaign.route_distance) {
         // Tenta extrair número de string "180km" ou "180"
         const match = String(campaign.route_distance).match(/(\d+([.,]\d+)?)/);
         if (match) {
            routeTotalKm = parseFloat(match[1].replace(',', '.'));
         }
      }

      // Extract Origin Coordinates
      // Priority 1: From selected itinerary location (tripLegs and selectedTripDate logic)
      // Priority 2: From campaign locations[0] (default/legacy)
      let originLat = 0;
      let originLng = 0;
      let originName = '';

      // Tenta encontrar o ID do local de partida no itinerário da data selecionada
      if (campaign.itinerary && selectedTripDate) {
         // Encontra o item do itinerário que corresponde ao dia da semana selecionado
         const dateObj = new Date(selectedTripDate + 'T00:00:00'); // Garante data local
         const dayOfWeek = dateObj.getDay(); // 0-6
         
         const weekDays = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
         const currentDayName = weekDays[dayOfWeek];

         const itineraryItem = campaign.itinerary.find((it: any) => {
             return it.dayOfWeek.toUpperCase().includes(currentDayName.split('-')[0]); 
         });

         if (itineraryItem && itineraryItem.locationId && campaign.locations) {
            const loc = campaign.locations.find((l: any) => l.id === itineraryItem.locationId);
            if (loc && loc.lat && loc.lng) {
               originLat = parseFloat(loc.lat);
               originLng = parseFloat(loc.lng);
               originName = loc.name;
            }
         }
      }

      // Fallback para o primeiro local se não encontrou específico
      if ((originLat === 0 && originLng === 0) && campaign.locations && campaign.locations.length > 0) {
         const firstLoc = campaign.locations[0];
         if (firstLoc.lat && firstLoc.lng) {
            originLat = parseFloat(firstLoc.lat);
            originLng = parseFloat(firstLoc.lng);
            originName = firstLoc.name;
         }
      }

      if (originLat === 0 || originLng === 0 || isNaN(originLat) || isNaN(originLng)) {
         setDiscountPercentage(0);
         setFinalTicketValue(basePrice);
         return;
      }

      // Calculate Distance Traveled from Origin to Boarding Point
      const traveledKm = haversineDistance(originLat, originLng, boardingLat, boardingLng);

      // Reverter para cálculo simples usando routeTotalKm (180km) como 100%
      // conforme instrução: "veja na tabela transportes coluna route_distance... divida esse valor por 100 e o resultado é igual a 1% da distancia"
      // Basicamente: Percentual = (DistanciaPercorrida / routeTotalKm) * 100
      
      let percent = 0;
      if (routeTotalKm > 0) {
          percent = (traveledKm / routeTotalKm) * 100;
      }

      // Clamp: Min 0%, Max 60%
      if (percent < 0) percent = 0;
      if (percent > 60) percent = 60;

      setDiscountPercentage(percent);
      setOriginName(originName);
      
      // Calculate Final Price and update state
      const discountAmount = basePrice * (percent / 100);
      const newFinalPrice = basePrice - discountAmount;
      setFinalTicketValue(newFinalPrice);

   }, [campaign, boardingOnRoute, boardingLat, boardingLng, selectedTripDate]); // Add selectedTripDate dependency

   // ─── Realtime Notifications State ────────────────────────────
   const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'success' | 'warning' }[]>([]);
   const [vesselLocation, setVesselLocation] = useState<[number, number] | null>(null);
   const [proximityNotified, setProximityNotified] = useState(false);

   // Realtime listener for vessel location (Proximity Alert)
   useEffect(() => {
      if (!campaign?.id || !boardingLat || !boardingLng || boardingOnRoute !== true) return;

      const channel = supabase
         .channel(`vessel-tracking-${campaign.id}`)
         .on(
            'postgres_changes',
            {
               event: 'UPDATE',
               schema: 'public',
               table: 'transportes',
               filter: `id=eq.${campaign.id}`
            },
            (payload) => {
               if (payload.new.vessel_lat && payload.new.vessel_lng) {
                  const newLoc: [number, number] = [payload.new.vessel_lat, payload.new.vessel_lng];
                  setVesselLocation(newLoc);
                  
                  const dist = haversineDistance(newLoc[0], newLoc[1], boardingLat, boardingLng);
                  if (dist <= 2 && !proximityNotified) {
                     playSound('proximity');
                     addNotification('A embarcação está a menos de 2km do seu ponto de embarque!', 'warning');
                     setProximityNotified(true);
                  } else if (dist > 2.5) {
                     // Reset notification if boat moves away (with hysteresis)
                     setProximityNotified(false);
                  }
               }
            }
         )
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, [campaign?.id, boardingLat, boardingLng, boardingOnRoute, proximityNotified]);

   const addNotification = (message: string, type: 'success' | 'warning' = 'success') => {
      console.log('[DEBUG] Adicionando notificação:', message);
      const id = Math.random().toString(36).substring(7);
      setNotifications(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
         setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
   };

   // ─── Edit State ──────────────────────────────────────────────
   const [isEditing, setIsEditing] = useState(false);
   const [hasChanges, setHasChanges] = useState(false);
   const [isUpdating, setIsUpdating] = useState(false);
   const [originalData, setOriginalData] = useState<{ 
      phone: string, 
      email: string,
      boardingOnRoute?: boolean | null,
      boardingAddress?: string,
      boardingMapLink?: string,
      boardingLat?: number | null,
      boardingLng?: number | null
   }>({ phone: '', email: '' });

   useEffect(() => {
      if (step !== 2) {
         setUniquenessErrors({});
         return;
      }

      const check = async () => {
         setIsCheckingUniqueness(true);
         const errors: { phone?: string, cpf?: string } = {};

         const cleanPhone = phone.replace(/\D/g, '');
         const cleanCpf = cpf.replace(/\D/g, '');

         try {
            // Check Phone Uniqueness
            /* REMOVIDO PARA PERMITIR DUPLICIDADE DE TELEFONE
            if (cleanPhone.length >= 10) {
               if (existingCustomer && cleanPhone === existingCustomer.phone) {
                   // OK
               } else {
                   let query = supabase.from('clientes').select('id').eq('phone', cleanPhone);
                   if (existingCustomer) query = query.neq('id', existingCustomer.id);
                   const { data } = await query.limit(1).maybeSingle();
                   if (data) errors.phone = 'Telefone já cadastrado em outra conta.';
               }
            }
            */

            // Check CPF Uniqueness
            if (cleanCpf.length === 11) {
               const formattedCpf = formatCpf(cleanCpf);

               if (existingCustomer && (cleanCpf === existingCustomer.cpf || formattedCpf === existingCustomer.cpf)) {
                  // OK
               } else {
                  // Busca sequencial para garantir que o .or() não falhe
                  let found = false;

                  // 1. Tenta Formatado
                  let query1 = supabase.from('clientes').select('id').eq('cpf', formattedCpf);
                  if (existingCustomer) query1 = query1.neq('id', existingCustomer.id);
                  const { data: d1 } = await query1.limit(1).maybeSingle();

                  if (d1) {
                     found = true;
                  } else {
                     // 2. Tenta Limpo
                     let query2 = supabase.from('clientes').select('id').eq('cpf', cleanCpf);
                     if (existingCustomer) query2 = query2.neq('id', existingCustomer.id);
                     const { data: d2 } = await query2.limit(1).maybeSingle();
                     if (d2) found = true;
                  }

                  if (found) errors.cpf = 'CPF já cadastrado em outra conta.';
               }
            }
         } catch (e) {
            console.error(e);
         } finally {
            setUniquenessErrors(errors);
            setIsCheckingUniqueness(false);
         }
      };

      const timer = setTimeout(check, 800);
      return () => clearTimeout(timer);
   }, [step, phone, cpf, existingCustomer]);

   // Monitorar mudanças nos campos editáveis para clientes existentes
   useEffect(() => {
      if (!existingCustomer) {
         setHasChanges(false);
         setIsEditing(false);
         return;
      }

      const phoneChanged = phone !== originalData.phone;
      const emailChanged = email !== originalData.email;
      const boardingChanged = (boardingOnRoute !== (originalData.boardingOnRoute ?? null)) || 
                              (boardingAddress !== (originalData.boardingAddress || '')) ||
                              (boardingLat !== (originalData.boardingLat ?? null)) ||
                              (boardingLng !== (originalData.boardingLng ?? null));

      setHasChanges(phoneChanged || emailChanged || boardingChanged);
   }, [phone, email, boardingOnRoute, boardingAddress, boardingMapLink, boardingLat, boardingLng, existingCustomer, originalData]);

   // Atualizar dados originais quando cliente é carregado
   useEffect(() => {
      if (existingCustomer) {
         setOriginalData({
            phone: formatPhone(existingCustomer.phone),
            email: existingCustomer.email || '',
            boardingOnRoute: existingCustomer.boarding_address ? true : null,
            boardingAddress: existingCustomer.boarding_address || '',
            boardingMapLink: existingCustomer.boarding_map_link || '',
            boardingLat: existingCustomer.boarding_lat || null,
            boardingLng: existingCustomer.boarding_lng || null
         });
      }
   }, [existingCustomer]);

   // Removido auto-seleção de data para forçar escolha do usuário (requisito lista suspensa/obrigatório)
   useEffect(() => {
      setSelectedTickets([]); // Limpa poltronas ao mudar de data ou campanha
   }, [selectedTripDate, selectedTripIndex]);

   // ─── Celebration State ─────────────────────────────────────
   const [winners, setWinners] = useState<any[]>([]);
   const [isCelebration, setIsCelebration] = useState(false);
   const [claimModalOpen, setClaimModalOpen] = useState(false);
   const [claimWinnerData, setClaimWinnerData] = useState<any>(null);
   const [claimPhoneInput, setClaimPhoneInput] = useState('');

   const phoneRef = useRef<HTMLInputElement>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   // Hook para confetti quando step === 6
   useEffect(() => {
      if (step === 6) {
         console.log('[DEBUG] Step 6 useEffect executado, iniciando confetti');
         const duration = 3000;
         const end = Date.now() + duration;

         (function frame() {
            confetti({
               particleCount: 4,
               angle: 60,
               spread: 55,
               origin: { x: 0 },
               colors: ['#22c55e', '#10b981', '#ffffff']
            });
            confetti({
               particleCount: 4,
               angle: 120,
               spread: 55,
               origin: { x: 1 },
               colors: ['#22c55e', '#10b981', '#ffffff']
            });

            if (Date.now() < end) {
               requestAnimationFrame(frame);
            }
         }());
      }
   }, [step]); // Executa sempre que step mudar

   // ─── Claim Prize Handler ────────────────────────────────────
   const handleOpenClaimModal = (winner: any) => {
      setClaimWinnerData(winner);
      setClaimPhoneInput('');
      setClaimModalOpen(true);
   };

   const handleConfirmClaim = () => {
      if (!claimWinnerData) return;

      const cleanUser = claimPhoneInput.replace(/\D/g, '');
      const cleanWinner = claimWinnerData.phone.replace(/\D/g, '');

      if (cleanUser === cleanWinner || (cleanWinner.length > 8 && cleanUser.endsWith(cleanWinner.slice(-8)))) {
         const supportPhone = socialNetworks?.whatsappSupport;
         const profilePhone = organizerPhone;
         const fallbackPhone = import.meta.env.VITE_SUPPORT_PHONE || '5511999999999';

         const extractPhone = (val: string) => {
            if (!val) return '';
            const match = val.match(/(?:wa\.me\/|phone=)(\d+)/);
            if (match) return match[1];
            if (val.includes('http')) return '';
            return val.replace(/\D/g, '');
         };

         const cleanSupport = extractPhone(supportPhone);
         const cleanProfile = extractPhone(profilePhone);

         let targetPhone = cleanSupport || cleanProfile || fallbackPhone;

         if (!targetPhone.startsWith('55') && (targetPhone.length === 10 || targetPhone.length === 11)) {
            targetPhone = '55' + targetPhone;
         }

         const msg = encodeURIComponent(`Olá! Sou o passageiro do destino ${claimWinnerData.prize} (Poltrona ${claimWinnerData.ticket}) na passagem ${campaign.title}. Gostaria de resgatar meu destino.`);

         window.open(`https://wa.me/${targetPhone}?text=${msg}`, '_blank');
         setClaimModalOpen(false);
      } else {
         alert('O telefone informado não corresponde ao do passageiro deste destino.');
      }
   };

   // ─── Top Level Image Parsing ────────────────────────────────
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

   const campaignImages = campaign ? parseImages(campaign.image || '') : [];
   const primaryImage = campaignImages[0] || 'https://via.placeholder.com/800x450?text=Sem+Imagem';

   // ─── Top Level Auto-play Effect ─────────────────────────────
   useEffect(() => {
      if (step !== 0) return;
      if (campaignImages.length <= 1 || isPaused) return;

      const timer = setInterval(() => {
         setDirection(1);
         setCurrentImageIndex((prev) => (prev + 1) % campaignImages.length);
      }, 4000);

      return () => clearInterval(timer);
   }, [campaignImages.length, isPaused, step]);

   const paginate = (newDirection: number) => {
      setDirection(newDirection);
      if (newDirection === 1) {
         setCurrentImageIndex((prev) => (prev + 1) % campaignImages.length);
      } else {
         setCurrentImageIndex((prev) => (prev === 0 ? campaignImages.length - 1 : prev - 1));
      }
   };

   // ─── Celebration Logic ──────────────────────────────────────
   const fetchWinners = async (results: any[], campaignId: string) => {
      const winnerData = [];
      let hasWinners = false;

      for (const res of results) {
         if (typeof res === 'object' && res !== null && 'ticket' in res) {
            if (res.status === 'valid') {
               winnerData.push({
                  prize: res.prize,
                  ticket: res.ticket,
                  name: res.winnerName || 'Passageiro',
                  phone: res.winnerPhone || '',
               });
               hasWinners = true;
            } else if (res.status === 'no_winner') {
               winnerData.push({
                  prize: res.prize,
                  ticket: res.ticket,
                  name: 'Acumulado / Sem Passageiro',
                  phone: '',
                  isNoWinner: true
               });
               hasWinners = true;
            }
         }
         else {
            const ticketVal = typeof res === 'string' ? res : String(res);
            const { data } = await supabase
               .from('historico_vendas')
               .select('*, clientes!inner(*)')
               .eq('transporte_id', campaignId)
               .contains('tickets', [parseInt(ticketVal)])
               .maybeSingle();

            if (data) {
               winnerData.push({
                  prize: `Destino`,
                  ticket: ticketVal,
                  name: data.clientes.name,
                  phone: data.clientes.phone,
               });
               hasWinners = true;
            } else {
               winnerData.push({
                  prize: `Destino`,
                  ticket: ticketVal,
                  name: 'Passageiro Externo',
                  phone: '',
               });
               hasWinners = true;
            }
         }
      }

      setWinners(winnerData);

      if (hasWinners) {
         setIsCelebration(true);
      }
   };

   const fetchSocialNetworks = async (userId: string) => {
      try {
         const { data, error } = await supabase
            .from('profiles')
            .select('social_networks, phone')
            .eq('id', userId)
            .maybeSingle();

         if (error) throw error;

         setSocialNetworks(data?.social_networks || {});
         if (data?.phone) {
            setOrganizerPhone(data.phone);
         }
      } catch (err) {
         console.error('Error fetching social networks:', err);
      }
   };

   const fetchPaymentConfig = async (userId: string) => {
      try {
         const { data, error } = await supabase
            .from('profiles')
            .select('payment_methods_config')
            .eq('id', userId)
            .maybeSingle();

         if (error) throw error;

         const config = data?.payment_methods_config;

         if (config) {
            // Load N8N Config
            if (config.n8nConfig) {
               setN8NConfig(config.n8nConfig);
            }

            // Load Pix Manual Config
            if (config.pixManual) {
               setPixConfig(config.pixManual);
            }

            // Determine Active Method
            if (config.n8nConfig?.isActive) {
               setActiveMethod('n8n');
            } else if (config.pixManual?.isActive) {
               setActiveMethod('pixManual');
            } else {
               setActiveMethod(null);
            }
         }
      } catch (err) {
         console.error('Error fetching payment config:', err);
      }
   };

   const fetchTicketsStatus = async (campaignId: string) => {
      setFetchingTickets(true);
      try {
         let query = supabase
            .from('historico_vendas')
            .select('tickets, status, created_at, trip_date, return_date, is_ida, is_volta')
            .eq('transporte_id', campaignId);

         const datesToCheck = [];
         if (tripLegs.ida && selectedTripDate) datesToCheck.push(selectedTripDate);
         if (tripLegs.volta && selectedReturnDate) datesToCheck.push(selectedReturnDate);

         if (datesToCheck.length > 0) {
            const dateList = datesToCheck.map(d => `"${d}"`).join(',');
            query = query.or(`trip_date.in.(${dateList}),return_date.in.(${dateList})`);
         } else {
            // Se não tem data selecionada, busca sem data (legado/padrão)
            query = query.is('trip_date', null);
         }

         const { data, error } = await query;

         if (error) throw error;

         const statusMap: Record<number, { status: string; expiresAt: Date }> = {};
         const payTimeStr = campaign?.paymentTime || '1 hora';
         const payMinutes = parsePaymentTime(payTimeStr);

         data?.forEach(p => {
            let isConflict = false;
            
            // Conflito na Ida
            if (tripLegs.ida && selectedTripDate) {
                if (p.is_ida && p.trip_date === selectedTripDate) isConflict = true;
                if (p.is_volta && p.return_date === selectedTripDate) isConflict = true;
            }
            
            // Conflito na Volta
            if (tripLegs.volta && selectedReturnDate) {
                if (p.is_ida && p.trip_date === selectedReturnDate) isConflict = true;
                if (p.is_volta && p.return_date === selectedReturnDate) isConflict = true;
            }
            
            // Legado (sem data)
            if (!p.trip_date) isConflict = true;

            if (isConflict) {
                const createdAt = new Date(p.created_at);
                const expiresAt = new Date(createdAt.getTime() + payMinutes * 60000);
                const now = new Date();

                if (p.status === 'approved' || (p.status === 'pending' && expiresAt > now)) {
                   p.tickets.forEach((t: number) => {
                      statusMap[t] = { status: p.status, expiresAt };
                   });
                }
            }
         });
         setTicketsStatus(statusMap);
      } catch (err) {
         console.error('Error fetching tickets status:', err);
      } finally {
         setFetchingTickets(false);
      }
   };

   useEffect(() => {
      if (campaign?.id) {
         fetchTicketsStatus(campaign.id);
      }
   }, [selectedTripDate, selectedReturnDate, tripLegs, campaign?.id]);

   useEffect(() => {
      if (slug) {
         const data = getCampaign(slug);
         if (data) {
            setCampaign(data);
            fetchSocialNetworks(data.user_id);
            fetchPaymentConfig(data.user_id);

            if (data.draw_results && Array.isArray(data.draw_results) && data.draw_results.length > 0) {
               fetchWinners(data.draw_results, data.id);
            }
         }
      }
   }, [slug, getCampaign]);

   // ─── Realtime Subscription ───────────────────────────────────
   useEffect(() => {
      if (!campaign?.id) return;

      console.log('Iniciando subscrição realtime para campanha:', campaign.id);

      const channel = supabase
         .channel(`public:historico_vendas:${campaign.id}`)
         .on(
            'postgres_changes',
            {
               event: '*',
               schema: 'public',
               table: 'historico_vendas',
               filter: `transporte_id=eq.${campaign.id}`,
            },
            async (payload) => {
               console.log('Realtime event received:', payload);
               const { eventType, new: newRecord, old: oldRecord } = payload;

               // Atualizar Status dos Passagens
               if (eventType === 'INSERT' || eventType === 'UPDATE') {
                  const record = newRecord as any;

                  // Filtrar por data da viagem selecionada (Ida ou Volta)
                  const recordTripDate = record.trip_date;
                  const recordReturnDate = record.return_date;
                  
                  let isRelevant = false;
                  
                  // Se conflita com minha Ida
                  if (tripLegs.ida && selectedTripDate) {
                      if (record.is_ida && recordTripDate === selectedTripDate) isRelevant = true;
                      if (record.is_volta && recordReturnDate === selectedTripDate) isRelevant = true;
                  }
                  
                  // Se conflita com minha Volta
                  if (tripLegs.volta && selectedReturnDate) {
                      if (record.is_ida && recordTripDate === selectedReturnDate) isRelevant = true;
                      if (record.is_volta && recordReturnDate === selectedReturnDate) isRelevant = true;
                  }
                  
                  // Compatibilidade com registros antigos (sem data)
                  if (!recordTripDate && !recordReturnDate) isRelevant = true;
                  
                  if (!isRelevant) return;

                  // Se foi cancelado, liberar os tickets
                  if (record.status === 'cancelled') {
                     setTicketsStatus((prev) => {
                        const next = { ...prev };
                        record.tickets.forEach((t: number) => {
                           delete next[t];
                        });
                        return next;
                     });
                  }
                  // Se está pendente ou aprovado, reservar/marcar
                  else if (record.status === 'pending' || record.status === 'approved') {
                     const payTimeStr = campaign?.paymentTime || '1 hora';
                     const payMinutes = parsePaymentTime(payTimeStr);
                     const createdAt = new Date(record.created_at);
                     const expiresAt = new Date(createdAt.getTime() + payMinutes * 60000);

                     setTicketsStatus((prev) => {
                        const next = { ...prev };
                        record.tickets.forEach((t: number) => {
                           next[t] = { status: record.status, expiresAt };
                        });
                        return next;
                     });

                     // Verificar conflito com seleção atual do usuário
                     // Se o usuário selecionou um ticket que acabou de ser comprado por OUTRA pessoa
                     if (currentPurchaseId !== record.id) { // Ignora se for a própria compra do usuário atualizando
                        setSelectedTickets((prevSelected) => {
                           const conflicts = prevSelected.filter(t => record.tickets.includes(t));
                           if (conflicts.length > 0) {
                              // Remover tickets conflitantes da seleção
                              const newSelection = prevSelected.filter(t => !record.tickets.includes(t));

                              // Notificar usuário sobre o conflito
                              if (conflicts.length === 1) {
                                 addNotification(`O número ${conflicts[0]} acabou de ser reservado por outra pessoa!`, 'warning');
                              } else {
                                 addNotification(`Alguns números selecionados (${conflicts.join(', ')}) acabaram de ser reservados!`, 'warning');
                              }

                              return newSelection;
                           }
                           return prevSelected;
                        });
                     }

                     // Notificação Social (Apenas para INSERT ou mudança para aprovado de outra pessoa)
                     // Para evitar flood, notificamos apenas INSERT de 'pending' (reserva) ou 'approved' (compra direta)
                     if (eventType === 'INSERT' && currentPurchaseId !== record.id) {
                        // Buscar nome do comprador
                        let firstName = 'Alguém';
                        try {
                           const { data: customerData, error } = await supabase
                              .from('clientes')
                              .select('name')
                              .eq('id', record.cliente_id)
                              .maybeSingle();

                           if (!error && customerData?.name) {
                              firstName = customerData.name.split(' ')[0];
                           } else {
                              console.warn('Não foi possível buscar nome do cliente (RLS ou não encontrado). Usando fallback.');
                           }
                        } catch (err) {
                           console.error('Erro ao buscar nome para notificação:', err);
                        }

                        const action = record.status === 'approved' ? 'comprou' : 'reservou';
                        const emoji = record.status === 'approved' ? '🚀' : '🔥';

                        addNotification(`${firstName} acabou de ${action}! ${emoji}`, 'success');
                     }
                  }
               }
               // Handle DELETE (raro, mas possível admin deletar compra)
               else if (eventType === 'DELETE') {
                  const record = oldRecord as any;
                  if (record?.trip_date !== selectedTripDate) return;

                  if (record?.tickets) {
                     setTicketsStatus((prev) => {
                        const next = { ...prev };
                        record.tickets.forEach((t: number) => {
                           delete next[t];
                        });
                        return next;
                     });
                  }
               }
            }
         )
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, [campaign?.id, currentPurchaseId, selectedTripDate, selectedReturnDate, tripLegs]); // Dependência atualizada

   // Monitorar perda de tickets durante o checkout (conflito)
   useEffect(() => {
      if (step > 0 && step < 3 && selectedTickets.length === 0) {
         alert('Todas as poltronas selecionadas foram reservadas por outra pessoa.');
         setStep(0);
      }
   }, [selectedTickets, step]);

   // Ensure Return Date is always after Trip Date (Strictly >)
   useEffect(() => {
      if (selectedTripDate && selectedReturnDate) {
         // Se a data de volta for anterior ou igual à de ida, limpa a volta
         if (new Date(selectedReturnDate) <= new Date(selectedTripDate)) {
            setSelectedReturnDate('');
         }
      }
   }, [selectedTripDate, selectedReturnDate]);

   // ─── Derived State (Moved up for safety) ───────────────────
   const totalNumbers = campaign?.ticketQuantity || 0;
   const numbers = Array.from({ length: totalNumbers }, (_, i) => i);
   const ticketPriceRaw = getTicketPrice(campaign?.ticketValue);
   const currentTicketPrice = isHalfPrice ? (ticketPriceRaw / 2) : (isLapChild ? 0 : ticketPriceRaw);
   const legMultiplier = (tripLegs.ida ? 1 : 0) + (tripLegs.volta ? 1 : 0);
   const totalValDecimal = selectedTickets.length * currentTicketPrice * legMultiplier;
   const totalValue = totalValDecimal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
   const availableCount = totalNumbers - Object.keys(ticketsStatus).length;
   const reservedCount = Object.values(ticketsStatus).filter((t: any) => t.status === 'pending').length;
   const paidCount = Object.values(ticketsStatus).filter((t: any) => t.status === 'approved').length;
   const paymentMinutes = parsePaymentTime(campaign?.paymentTime || '1 hora');

   // ─── Handle Purchase ID from URL ────────────────────────────
   useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const purchaseId = searchParams.get('purchaseId');

      if (purchaseId && campaign) {
         fetchPurchaseDetails(purchaseId);
      }
   }, [location.search, campaign]);

   // ─── Scheduled Status Checks for N8N Payment ────────────────
   const [checkStatusText, setCheckStatusText] = useState('Verificando manualmente...');

   // Polling automático a cada 30 segundos
   useEffect(() => {
      console.log('[DEBUG] Polling useEffect executado. Step:', step, 'currentPurchaseId:', currentPurchaseId);

      if (step !== 7 || !currentPurchaseId) {
         console.log('[DEBUG] Polling não ativado. Condições não atendidas.');
         return;
      }

      console.log('[DEBUG] Polling ativado! Iniciando intervalo...');

      const checkStatus = async () => {
         console.log('[DEBUG] Polling: Verificando status...');
         setCheckStatusText('Verificando status...');
         await fetchPurchaseDetails(currentPurchaseId);
         setTimeout(() => setCheckStatusText('Verificando manualmente...'), 2000);
      };

      const intervalId = setInterval(checkStatus, 30000); // 30 segundos
      console.log('[DEBUG] Intervalo configurado com ID:', intervalId);

      return () => {
         console.log('[DEBUG] Limpando intervalo:', intervalId);
         clearInterval(intervalId);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [step, currentPurchaseId]);

   const handleManualCheck = async () => {
      const idPix = paymentData?.id_pix || paymentData?.['id-pix'];

      if (!idPix) {
         alert('Erro: ID do pagamento não encontrado.');
         return;
      }
      if (!n8nConfig.checkUrl) {
         alert('Erro: URL de verificação não configurada.');
         return;
      }

      setCheckStatusText('Verificando status...');

      // Usa a URL configurada pelo usuário
      // (A lógica de auto-correção foi removida pois o usuário já ajustou a URL)
      let targetUrl = n8nConfig.checkUrl;

      // Preparar URL com Parâmetros para garantir envio do ID
      try {
         const urlObj = new URL(targetUrl);
         urlObj.searchParams.append("id-pix", idPix);
         urlObj.searchParams.append("_t", Date.now().toString());
         targetUrl = urlObj.toString();
      } catch (e) {
         alert(`URL Inválida configurada: ${n8nConfig.checkUrl}`);
         return;
      }

      console.log('Verificando pagamento:', targetUrl);

      const payload = { "id-pix": idPix };

      // 1. TENTATIVA PADRÃO (POST com JSON)
      try {
         const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
         });

         if (response.ok) {
            const result = await response.json();

            const status = result.status || result['status-payment'] || result.payment_status;
            if (status === 'approved' || status === 'success') {
               await supabase.from('historico_vendas').update({ status: 'approved' }).eq('id', currentPurchaseId);
               setStep(6);
               return;
            } else {
               setCheckStatusText('Aguardando confirmação...');
               alert(`Pagamento ainda não confirmado. Status: ${status || 'Pendente'}`);
               return;
            }
         }
      } catch (e) {
         console.warn('Tentativa padrão falhou, usando fallback de compatibilidade.');
      }

      // 2. FALLBACK ROBUSTO (NO-CORS)
      // Garante o envio mesmo com bloqueios de rede/CORS
      try {
         await fetch(targetUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
         });

         setCheckStatusText('Verificação enviada.');
         alert('Verificação enviada ao banco! Se o pagamento foi feito, a tela atualizará em instantes.');
      } catch (finalError) {
         setCheckStatusText('Erro na conexão.');
         alert('Não foi possível conectar ao servidor de verificação.');
      }
   };

   const fetchPurchaseDetails = async (pid: string) => {
      console.log('[DEBUG] fetchPurchaseDetails iniciado com ID:', pid);
      try {
         const { data: purchase, error } = await supabase
            .from('historico_vendas')
            .select('*, clientes(*)')
            .eq('id', pid)
            .maybeSingle();

         console.log('[DEBUG] Supabase resposta:', { data: purchase, error });

         if (error || !purchase) {
            console.error('[DEBUG] Erro ao buscar detalhes da compra:', error);
            return;
         }

         console.log('[DEBUG] Compra encontrada:', {
            id: purchase.id,
            status: purchase.status,
            payment_info: purchase.payment_info,
            proof_url: purchase.proof_url
         });

         setCurrentPurchaseId(purchase.id);
         if (purchase.created_at) setPurchaseCreatedAt(new Date(purchase.created_at));
         setSelectedTickets(purchase.tickets || []);
         setPhone(purchase.clientes?.phone ? maskPhone(purchase.clientes.phone) : '');
         setName(purchase.clientes?.name || '');
         setEmail(purchase.clientes?.email || '');
         if (purchase.clientes?.cpf) setCpf(purchase.clientes.cpf);

         if (purchase.proof_url) {
            setProofPreview(purchase.proof_url);
         }

         if (purchase.payment_info) {
            setPaymentData(purchase.payment_info);
         }

         console.log('[DEBUG] Status da compra:', purchase.status);
         console.log('[DEBUG] Active method:', activeMethod);

         if (purchase.status === 'cancelled') {
            console.log('[DEBUG] Status é cancelled, mudando para Step 5');
            setTimeout(() => {
               console.log('[DEBUG] Executando setStep(5)');
               setStep(5);
            }, 100);
         } else if (purchase.status === 'approved') {
            console.log('[DEBUG] Status é approved, mudando para Step 6');
            setTimeout(() => {
               console.log('[DEBUG] Executando setStep(6)');
               setStep(6);
            }, 100);
         } else if (purchase.status === 'pending') {
            console.log('[DEBUG] Status é pending, verificando método de pagamento');
            if (activeMethod === 'n8n' && purchase.payment_info) {
               console.log('[DEBUG] Método N8N com payment_info, mudando para Step 7');
               setTimeout(() => {
                  console.log('[DEBUG] Executando setStep(7)');
                  setStep(7); // N8N Payment
               }, 100);
            } else if (purchase.proof_url) {
               console.log('[DEBUG] Tem proof_url, mudando para Step 4');
               setTimeout(() => {
                  console.log('[DEBUG] Executando setStep(4)');
                  setStep(4); // Comprovante enviado
               }, 100);
            } else {
               console.log('[DEBUG] Método manual, mudando para Step 3');
               setTimeout(() => {
                  console.log('[DEBUG] Executando setStep(3)');
                  setStep(3); // Aguardando pagamento/upload (Manual)
               }, 100);
            }
         } else {
            console.log('[DEBUG] Status desconhecido:', purchase.status);
         }
      } catch (err) {
         console.error('[DEBUG] Erro ao processar compra da URL:', err);
      }
   };

   // ── Handlers ────────────────────────────────────────────────
   const handleTicketClick = (num: number) => {
      const ticket = ticketsStatus[num];
      if (ticket) {
         if (ticket.status === 'approved') {
            alert(`Poltrona ${String(num + 1).padStart(2, '0')} já foi vendida.`);
         } else if (ticket.status === 'pending') {
            const now = new Date();
            const diffMs = ticket.expiresAt.getTime() - now.getTime();
            const diffMin = Math.max(0, Math.floor(diffMs / 60000));
            const h = Math.floor(diffMin / 60);
            const m = diffMin % 60;
            const timeStr = h > 0 ? `${h}h e ${m}min` : `${m}min`;

            alert(`Esta poltrona está reservada. Ela poderá ficar disponível em ${timeStr} caso o comprador não efetue o pagamento.`);
         }
         return;
      }

      setSelectedTickets((prev) => {
         // Requisito: Não comprar mais de uma passagem na mesma data.
         // Ao selecionar uma, as demais ficam inativas. Para mudar, deve desmarcar a atual.
         if (prev.includes(num)) {
            // Se já está selecionada, desmarca
            return [];
         } else {
            // Se não tem nada selecionado, seleciona a clicada
            if (prev.length === 0) {
               return [num];
            } else {
               // Já tem uma selecionada e clicou em outra: Ignora (pelas regras do usuário "demais inativas")
               // ou opcionalmente troca: return [num];
               // Para seguir "demais inativas", vamos manter a atual.
               return prev;
            }
         }
      });
   };

   const handlePhoneChange = (v: string) => {
      const clean = v.replace(/\D/g, '');
      if (clean.length <= 11) {
         setPhone(formatPhone(v));
      } else {
         setPhone(formatCpf(v));
      }
   };

   const handleCpfChange = (v: string) => {
      const formatted = formatCpf(v);
      setCpf(formatted);
   };

   const onCustomerIdentified = async (customer: any) => {
      setExistingCustomer(customer);
      setName(customer.name);
      setEmail(customer.email || '');
      if (customer.cpf) setCpf(customer.cpf);
      setPhone(formatPhone(customer.phone));
      setTermsAccepted(true);

      setBirthDate(customer.birth_date || '');
      setRelationship(customer.relationship || '');

      if (customer.boarding_address) {
         setBoardingOnRoute(true);
         setBoardingAddress(customer.boarding_address);
         setBoardingMapLink(customer.boarding_map_link || '');
         setBoardingLat(customer.boarding_lat || null);
         setBoardingLng(customer.boarding_lng || null);
      } else {
         setBoardingOnRoute(null);
         setBoardingAddress('');
         setBoardingMapLink('');
         setBoardingLat(null);
         setBoardingLng(null);
      }

      if (customer.responsible_id) {
         try {
            const { data: resp } = await supabase.from('clientes').select('name').eq('id', customer.responsible_id).maybeSingle();
            if (resp) setResponsibleName(resp.name);
            setResponsibleId(customer.responsible_id);
         } catch (e) {
            console.error('Erro ao buscar responsável:', e);
         }
      } else {
         setResponsibleId(null);
         setResponsibleName('');
      }

      setStep(2);

      // Se achou por CPF, garantir que o telefone no input seja o do cliente
      // (Isso já foi tratado antes, mas é bom garantir se vier do modal)
      if (phone.replace(/\D/g, '') !== customer.phone && customer.phone) {
         setPhone(formatPhone(customer.phone));
      }

      // 1. Check for PENDING purchase first (Blocker)
      const { data: pendingPurchase } = await supabase
         .from('historico_vendas')
         .select('*, clientes(*)')
         .eq('cliente_id', customer.id)
         .eq('transporte_id', campaign.id)
         .eq('status', 'pending')
         .order('created_at', { ascending: false })
         .limit(1)
         .maybeSingle();

      if (pendingPurchase) {
         alert('Você possui uma compra pendente. Redirecionando para o pagamento...');

         setCurrentPurchaseId(pendingPurchase.id);
         if (pendingPurchase.created_at) setPurchaseCreatedAt(new Date(pendingPurchase.created_at));
         setSelectedTickets(pendingPurchase.tickets || []);

         if (pendingPurchase.payment_info) {
            setPaymentData(pendingPurchase.payment_info);
         }

         if (activeMethod === 'n8n' && pendingPurchase.payment_info) {
            setStep(7);
         } else if (pendingPurchase.proof_url) {
            setStep(4);
         } else {
            setStep(3);
         }
         return;
      }
   };

   // ─── Identity Check Logic ──────────────────────────────────
   const checkIdentityAndShowModal = async (phoneValue: string): Promise<{ modalOpened: boolean, found: boolean }> => {
      const cleanVal = phoneValue.replace(/\D/g, '');
      if (cleanVal.length < 10) return { modalOpened: false, found: false };

      setPurchaseCandidates([]);

      try {
         // 1. Busca por Telefone (prioridade) - Agora busca TODOS
         const { data: phoneRes } = await supabase
            .from('clientes')
            .select('*')
            .eq('phone', cleanVal);

         if (phoneRes && phoneRes.length > 0) {
            if (phoneRes.length > 1) {
               // Múltiplos encontrados: abre modal
               setPurchaseCandidates(phoneRes);
               setShowPurchaseSelectionModal(true);
               return { modalOpened: true, found: true };
            }
            // Apenas um encontrado
            await onCustomerIdentified(phoneRes[0]);
            return { modalOpened: false, found: true };
         }

         return { modalOpened: false, found: false };
      } catch (err) {
         console.error('Erro ao verificar identidade:', err);
         return { modalOpened: false, found: false };
      }
   };

   const handlePhoneBlur = async () => {
      const cleanVal = phone.replace(/\D/g, '');
      if (cleanVal.length < 10) return;

      setLookingUp(true);
      setShowPurchaseSelectionModal(false);

      try {
         // 1. Check Phone Identity
         const { modalOpened, found } = await checkIdentityAndShowModal(phone);

         if (modalOpened) {
            setLookingUp(false);
            return;
         }

         if (found) {
            // Customer found and identified (onCustomerIdentified called inside helper)
            setLookingUp(false);
            return;
         }

         // 2. Busca por CPF (se não achou por telefone)
         let customer = null;
         if (cleanVal.length === 11) {
            const formattedCpf = formatCpf(cleanVal);
            const { data: cpfResFmt } = await supabase
               .from('clientes')
               .select('*')
               .eq('cpf', formattedCpf)
               .limit(1)
               .maybeSingle();

            if (cpfResFmt) {
               customer = cpfResFmt;
            } else {
               const { data: cpfResClean } = await supabase
                  .from('clientes')
                  .select('*')
                  .eq('cpf', cleanVal)
                  .limit(1)
                  .maybeSingle();
               customer = cpfResClean;
            }
         }

         if (customer) {
            await onCustomerIdentified(customer);
         } else {
            setExistingCustomer(null);
            const hasDots = phone.includes('.');
            const hasParenthesis = phone.includes('(');

            if ((validateCpf(phone) || hasDots) && !hasParenthesis) {
               setCpf(phone);
            }
         }
      } catch (_) {
      } finally {
         setLookingUp(false);
      }
   };


   const handleShowHistory = async () => {
      if (!existingCustomer) return;
      const { data } = await supabase
         .from('historico_vendas')
         .select('*, transportes(title)')
         .eq('cliente_id', existingCustomer.id)
         .order('created_at', { ascending: false });
      setCustomerHistory(data || []);
      setShowHistory(true);
   };

   const handleConsultPhoneChange = (v: string) => {
      // O modal controla a formatação baseada na aba ativa
      setConsultPhone(v);
   };

   const loadCustomerHistory = async (customer: any) => {
      setConsultCustomer(customer);
      console.log('Cliente selecionado:', customer);
      setLoadingHistory(true);

      try {
         // Buscar histórico de compras da embarcação vigente
         const { data: history, error: historyError } = await supabase
            .from('historico_vendas')
            .select('*')
            .eq('cliente_id', customer.id)
            .eq('transporte_id', campaign.id)
            .order('created_at', { ascending: false });

         console.log('Histórico encontrado:', history, 'Erro:', historyError);
         setConsultHistory(history || []);
      } catch (error) {
         console.error('Erro ao carregar histórico:', error);
      } finally {
         setLoadingHistory(false);
         setShowConsultSelectionModal(false);
      }
   };

   const handleConsultPhoneBlur = async () => {
      const cleanVal = consultPhone.replace(/\D/g, '');
      if (cleanVal.length < 11) return; // Mínimo aceitável

      console.log('Iniciando consulta para:', cleanVal);
      setLoadingHistory(true);
      setConsultCustomer(null);
      setConsultHistory([]);

      try {
         const formattedCpf = formatCpf(cleanVal);

         const { data: customers, error: searchError } = await supabase
            .from('clientes')
            .select('*')
            .or(`phone.eq.${cleanVal},cpf.eq.${formattedCpf},cpf.eq.${cleanVal}`); // Tenta todas as variações

         console.log('Resultado da busca:', customers, 'Erro:', searchError);

         if (!customers || customers.length === 0) {
            // Cliente não encontrado - O modal vai mostrar o botão de cadastro
            setConsultCustomer(null);
            setConsultHistory([]);
            setLoadingHistory(false);
            return;
         }

         // Se encontrou mais de um cliente (mesmo telefone), abre modal de seleção
         if (customers.length > 1) {
            setConsultCustomers(customers);
            setShowConsultSelectionModal(true);
            setLoadingHistory(false);
            return;
         }

         // Se encontrou apenas 1, carrega direto
         const customerFound = customers[0];
         await loadCustomerHistory(customerFound);

      } catch (error) {
         console.error('Erro ao consultar histórico:', error);
         alert('Erro ao consultar histórico. Tente novamente.');
      } finally {
         setLoadingHistory(false);
      }
   };

   const handleFinalizePendingPurchase = async (purchaseId: string) => {
      try {
         const { data: purchase } = await supabase
            .from('historico_vendas')
            .select('*')
            .eq('id', purchaseId)
            .maybeSingle();

         if (!purchase) {
            alert('Compra não encontrada.');
            return;
         }

         // Redirecionar para o pagamento da compra pendente
         setCurrentPurchaseId(purchase.id);
         if (purchase.created_at) setPurchaseCreatedAt(new Date(purchase.created_at));
         setSelectedTickets(purchase.tickets || []);

         if (purchase.payment_info) {
            setPaymentData(purchase.payment_info);
         }

         // Fechar modais
         setShowPhoneModal(false);
         setConsultPhone('');
         setConsultCustomer(null);
         setConsultHistory([]);

         // Ir para a tela de pagamento apropriada
         if (activeMethod === 'n8n' && purchase.payment_info) {
            setStep(7);
         } else if (purchase.proof_url) {
            setStep(4);
         } else {
            setStep(3);
         }

      } catch (error) {
         console.error('Erro ao finalizar compra pendente:', error);
         alert('Erro ao processar compra. Tente novamente.');
      }
   };

   const handleUpdateCustomer = async () => {
      if (!existingCustomer || !hasChanges) return;

      setIsUpdating(true);
      try {
         const cleanPhone = phone.replace(/\D/g, '');

         // Validar unicidade do telefone antes de atualizar
         /* REMOVIDO PARA PERMITIR DUPLICIDADE DE TELEFONE
         if (cleanPhone !== existingCustomer.phone) {
            const { data: phoneCheck } = await supabase
               .from('clientes')
               .select('id')
               .eq('phone', cleanPhone)
               .neq('id', existingCustomer.id)
               .maybeSingle();
               
            if (phoneCheck) {
               alert('Este telefone já está cadastrado em outra conta.');
               setIsUpdating(false);
               return;
            }
         }
         */

         // Atualizar no banco
         const { error } = await supabase
            .from('clientes')
            .update({
               phone: cleanPhone,
               email: email.trim() || null,
                boarding_address: boardingOnRoute ? boardingAddress : null,
                boarding_map_link: boardingOnRoute ? boardingMapLink : null,
                boarding_lat: boardingOnRoute ? boardingLat : null,
                boarding_lng: boardingOnRoute ? boardingLng : null
             })
             .eq('id', existingCustomer.id);
 
          if (error) throw error;
 
          // Atualizar cliente local e dados originais
          const updatedCustomer = {
             ...existingCustomer,
             phone: cleanPhone,
             email: email.trim() || null,
             boarding_address: boardingOnRoute ? boardingAddress : null,
             boarding_map_link: boardingOnRoute ? boardingMapLink : null,
             boarding_lat: boardingOnRoute ? boardingLat : null,
             boarding_lng: boardingOnRoute ? boardingLng : null
          };

         setExistingCustomer(updatedCustomer);
         setOriginalData({
            phone: formatPhone(cleanPhone),
            email: email.trim() || null,
            boardingOnRoute: boardingOnRoute,
             boardingAddress: boardingAddress,
             boardingMapLink: boardingMapLink,
             boardingLat: boardingLat,
             boardingLng: boardingLng
          });

         setIsEditing(false);
         setHasChanges(false);

         alert('Dados atualizados com sucesso!');

      } catch (error) {
         console.error('Erro ao atualizar cliente:', error);
         alert('Erro ao atualizar dados. Tente novamente.');
      } finally {
         setIsUpdating(false);
      }
   };

   const handleStep1Continue = async () => {
      // Se estamos no meio de uma seleção, não continuar
      if (showPurchaseSelectionModal) return;

      // Proteção contra condição de corrida: Se digitou telefone e clicou rápido
      if (!existingCustomer && phone) {
         const clean = phone.replace(/\D/g, '');
         // Verifica se parece telefone (não é CPF) e tem tamanho suficiente
         const isCpf = validateCpf(phone) || (phone.includes('.') && !phone.includes('('));

         if (!isCpf && clean.length >= 10) {
            setLookingUp(true);
            const { modalOpened, found } = await checkIdentityAndShowModal(phone);
            setLookingUp(false);

            if (modalOpened) return; // Para tudo se abriu o modal

            if (found) {
               setStep(2);
               return;
            }
         }
      }

      // Se já temos um cliente identificado, usamos os dados dele
      if (existingCustomer) {
         setPhone(formatPhone(existingCustomer.phone));
         setCpf(existingCustomer.cpf ? formatCpf(existingCustomer.cpf) : '');
         setName(existingCustomer.name || '');
         setEmail(existingCustomer.email || '');
         setErrors({});
         setStep(2);
         return;
      }

      const clean = phone.replace(/\D/g, '');
      const hasDots = phone.includes('.');
      const hasParenthesis = phone.includes('(') || phone.includes(')');

      let isCpf = false;

      if (hasDots) {
         isCpf = true;
      } else if (hasParenthesis) {
         isCpf = false;
      } else {
         // Apenas números ou hifens
         if (validateCpf(phone)) {
            isCpf = true;
         } else {
            // Heurística para desempate
            const ddd = parseInt(clean.substring(0, 2));
            const third = clean[2];
            if (ddd >= 11 && ddd <= 99 && third === '9') {
               isCpf = false;
            } else {
               isCpf = true; // Assume CPF por padrão se não parecer telefone
            }
         }
      }

      if (isCpf) {
         if (!validateCpf(phone)) {
            setErrors({ phone: 'CPF inválido. Verifique os dígitos.' });
            return;
         }
         setCpf(phone);
         setPhone('');
         setErrors({});
         setStep(2);
         return;
      } else {
         // Telefone
         if (clean.length < 10 || clean.length > 11) {
            setErrors({ phone: 'Telefone inválido.' });
            return;
         }
         setCpf('');
         setErrors({});
         setStep(2);
         return;
      }
   };

   const validateStep2 = () => {
      const e: Record<string, string> = {};
      if (!name.trim()) e.name = 'Nome é obrigatório.';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
         e.email = 'Formato de e-mail inválido.';
      if (activeMethod === 'n8n' && !validateCpf(cpf))
         e.cpf = 'CPF inválido.';
      if (!isPhoneComplete(phone)) e.phone = 'Telefone obrigatório.';
      if (!termsAccepted) e.terms = 'Você deve aceitar os termos.';

      if (!birthDate) e.birthDate = 'Data de nascimento é obrigatória.';
      if (isMinor) {
         if (!responsibleId) e.responsible = 'Vínculo com responsável é obrigatório.';
         if (!relationship) e.relationship = 'Grau de parentesco é obrigatório.';
      }

      if (boardingOnRoute === true) {
         if (!boardingAddress.trim()) e.boardingAddress = 'Endereço de embarque é obrigatório.';
      }
      return e;
   };

   const handleFinalize = async () => {
      const e = validateStep2();
      if (Object.keys(e).length > 0) { setErrors(e); return; }

      if (selectedTickets.length === 0) {
         alert('Selecione pelo menos uma poltrona.');
         setStep(0);
         return;
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const cleanCpf = cpf.replace(/\D/g, '');
      const formattedCpf = cleanCpf ? formatCpf(cleanCpf) : null;

      // Validação de duplicidade e atualização
      if (!existingCustomer) {
         // Novo cliente: verificar apenas CPF duplicado (telefone pode repetir)

         if (cleanCpf) {
            const { data: cpfCheck } = await supabase.from('clientes').select('id').or(`cpf.eq.${formattedCpf},cpf.eq.${cleanCpf}`).limit(1).maybeSingle();
            if (cpfCheck) { setErrors({ cpf: 'Este CPF já está vinculado a outra conta.' }); return; }
         }
      } else {
         // Cliente existente: verificar se mudou o CPF para um já existente
         if (cleanCpf && cleanCpf !== existingCustomer.cpf) {
            const { data: cpfCheck } = await supabase.from('clientes').select('id').or(`cpf.eq.${formattedCpf},cpf.eq.${cleanCpf}`).neq('id', existingCustomer.id).limit(1).maybeSingle();
            if (cpfCheck) { setErrors({ cpf: 'Este CPF já está vinculado a outra conta.' }); return; }
         }
      }

      setErrors({});
      setSubmitting(true);
      setIsGeneratingPix(true);

      try {
         let customer;
         const rawPhone = cleanPhone;

         // Verificar se devemos criar novo ou atualizar
         // Se existingCustomer existe, mas o CPF foi alterado para um NOVO, então é um NOVO cadastro
         let shouldCreateNew = !existingCustomer;
         if (existingCustomer) {
            const currentCpfClean = existingCustomer.cpf ? existingCustomer.cpf.replace(/\D/g, '') : '';
            // Se tinha CPF e agora mudou para outro (que não é vazio), então é novo cliente
            if (currentCpfClean && cleanCpf && cleanCpf !== currentCpfClean) {
               shouldCreateNew = true;
            }
         }

         if (!shouldCreateNew) {
            // Atualizar cliente existente
            const { data, error } = await supabase
               .from('clientes')
               .update({
                  name: name.trim(),
                  email: email.trim() || null,
                  phone: rawPhone,
                  cpf: formattedCpf,
                  birth_date: birthDate || null,
                  responsible_id: isMinor ? responsibleId : null,
                  relationship: isMinor ? relationship : null,
                   boarding_address: boardingOnRoute ? boardingAddress : null,
                   boarding_map_link: boardingOnRoute ? boardingMapLink : null,
                   boarding_lat: boardingOnRoute ? boardingLat : null,
                   boarding_lng: boardingOnRoute ? boardingLng : null,
                   updated_at: new Date().toISOString()
                })
               .eq('id', existingCustomer.id)
               .select()
               .single();

            if (error) throw error;
            customer = data;
         } else {
            // Criar novo cliente
            const { data, error } = await supabase
               .from('clientes')
               .insert({
                  phone: rawPhone,
                  name: name.trim(),
                  email: email.trim() || null,
                  cpf: formattedCpf || null,
                  birth_date: birthDate || null,
                  responsible_id: isMinor ? responsibleId : null,
                  relationship: isMinor ? relationship : null,
                   boarding_address: boardingOnRoute ? boardingAddress : null,
                   boarding_map_link: boardingOnRoute ? boardingMapLink : null,
                   boarding_lat: boardingOnRoute ? boardingLat : null,
                   boarding_lng: boardingOnRoute ? boardingLng : null
                })
                .select()
               .single();

            if (error) throw error;
            customer = data;
         }

         if (!customer) throw new Error('Falha ao registrar cliente');

         // Se for menor, validar se o responsável já tem poltrona na mesma data
         if (isMinor && responsibleId) {
            let query = supabase
               .from('historico_vendas')
               .select('id')
               .eq('cliente_id', responsibleId)
               .eq('transporte_id', campaign.id)
               .in('status', ['pending', 'approved']);

            if (selectedTripDate) {
               query = query.eq('trip_date', selectedTripDate);
            }

            const { data: respPurchases, error: respErr } = await query.limit(1);

            if (respErr) throw respErr;

            if (!respPurchases || respPurchases.length === 0) {
               const dateText = selectedTripDate ? ` para o dia ${new Date(selectedTripDate + 'T12:00:00').toLocaleDateString('pt-BR')}` : '';
               alert(`Para finalizar a compra do menor, o responsável (${responsibleName}) precisa primeiro reservar ou comprar sua própria poltrona${dateText}.`);
               setSubmitting(false);
               setIsGeneratingPix(false);
               return;
            }
         }

         // Create purchase record
         const { data: purchase, error: purchErr } = await supabase.from('historico_vendas').insert({
            cliente_id: customer.id,
            transporte_id: campaign.id,
            tickets: selectedTickets,
            total_value: totalValDecimal,
            status: 'pending',
            trip_date: selectedTripDate || null,
            return_date: selectedReturnDate || null,
            is_ida: tripLegs.ida,
            is_volta: tripLegs.volta,
            boarding_address: boardingOnRoute ? boardingAddress : null,
            boarding_lat: boardingOnRoute ? boardingLat : null,
            boarding_lng: boardingOnRoute ? boardingLng : null,
         }).select().maybeSingle();

         if (purchErr) throw purchErr;
         if (!purchase) throw new Error('Falha ao criar pedido');

         setCurrentPurchaseId(purchase.id);
         if (purchase.created_at) setPurchaseCreatedAt(new Date(purchase.created_at));

         // Handle N8N Integration
         if (activeMethod === 'n8n' && n8nConfig.createUrl) {
            try {
               const payload = {
                  customer_name: name,
                  customer_phone: rawPhone,
                  customer_email: email,
                  customer_cpf: cpf,
                  amount: totalValDecimal,
                  quantity: selectedTickets.length,
                  purchase_id: purchase.id,
                  campaign_title: campaign.title
               };

               const response = await fetch(n8nConfig.createUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
               });

               const n8nData = await response.json();

               // Save payment info
               await supabase
                  .from('historico_vendas')
                  .update({ payment_info: n8nData })
                  .eq('id', purchase.id);

               setPaymentData(n8nData);
               setStep(7); // N8N Payment Screen
            } catch (n8nError) {
               console.error('Erro ao comunicar com N8N:', n8nError);
               alert('Erro ao gerar Pix. Tente novamente ou contate o suporte.');
               // Opcional: Fallback para manual ou cancelar
            }
         } else {
            // Fallback to Manual Pix
            setStep(3);
         }

      } catch (err) {
         console.error('Erro ao salvar compra:', err);
      } finally {
         setSubmitting(false);
         setIsGeneratingPix(false);
      }
   };

   const handleCopyPix = () => {
      const keyToCopy = activeMethod === 'n8n' && paymentData
         ? paymentData['chave-pix-copia-cola']
         : pixConfig?.pixKey;

      if (keyToCopy) {
         navigator.clipboard.writeText(keyToCopy);
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      }
   };

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo deve ter no máximo 5MB');
            return;
         }
         setProofFile(file);
         const reader = new FileReader();
         reader.onloadend = () => {
            setProofPreview(reader.result as string);
         };
         reader.readAsDataURL(file);
      }
   };

   const handleSendProof = async () => {
      if (!proofFile || !currentPurchaseId) {
         alert('Por favor, selecione o comprovante antes de enviar.');
         return;
      }

      setUploading(true);
      try {
         const fileExt = proofFile.name.split('.').pop();
         const fileName = `${currentPurchaseId}_${Math.random()}.${fileExt}`;
         const filePath = `${fileName}`;

         const { error: uploadError } = await supabase.storage
            .from('proofs')
            .upload(filePath, proofFile);

         if (uploadError) throw uploadError;

         const { data: { publicUrl } } = supabase.storage
            .from('proofs')
            .getPublicUrl(filePath);

         const { error: updateError } = await supabase
            .from('historico_vendas')
            .update({ proof_url: publicUrl })
            .eq('id', currentPurchaseId);

         if (updateError) throw updateError;

         setStep(4);
      } catch (err) {
         console.error('Erro no upload:', err);
         alert('Erro ao enviar comprovante. Tente novamente.');
      } finally {
         setUploading(false);
      }
   };

   const handlePurchaseExpired = async () => {
      if (!currentPurchaseId) return;

      console.log('Tempo expirado. Cancelando compra:', currentPurchaseId);

      try {
         // Atualizar status no banco
         await supabase
            .from('historico_vendas')
            .update({ status: 'cancelled' })
            .eq('id', currentPurchaseId);

         // Atualizar estado local
         setStep(5);
         setSelectedTickets([]);
         setCurrentPurchaseId(null);
      } catch (error) {
         console.error('Erro ao cancelar compra expirada:', error);
      }
   };

   // ═══════════════════════════════════════════════════════════
   // RENDER: Helpers
   // ═══════════════════════════════════════════════════════════
   const NotificationToast = () => (
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
         <AnimatePresence>
            {notifications.map((n) => (
               <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  layout
                  className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md max-w-xs ${n.type === 'success'
                     ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                     : 'bg-amber-50/90 border-amber-200 text-amber-800'
                     }`}
               >
                  <span className={`material-icons-round text-lg ${n.type === 'success' ? 'text-emerald-500' : 'text-amber-500'
                     }`}>
                     {n.type === 'success' ? 'verified' : 'warning'}
                  </span>
                  <div className="flex-1">
                     <p className="text-sm font-bold leading-tight">{n.message}</p>
                  </div>
                  <button
                     onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                     className="opacity-50 hover:opacity-100 transition-opacity"
                  >
                     <span className="material-icons-round text-sm">close</span>
                  </button>
               </motion.div>
            ))}
         </AnimatePresence>
      </div>
   );

   const Navbar = () => (
      <header className="bg-white px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm border-b border-slate-100">
         <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => navigate('/marketplace')}>
               <div className="bg-[#6366F1] p-1 rounded -rotate-6 shadow-sm">
                  <span className="text-white font-black italic text-sm select-none">Dig</span>
               </div>
               <div className="bg-[#10B981] p-1 rounded rotate-3 -ml-2 z-10 shadow-sm">
                  <span className="text-white font-black text-sm select-none">Passagem</span>
               </div>
            </div>

            {/* Marketplace Button */}
            <button 
               onClick={() => navigate('/marketplace')}
               className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-colors border border-slate-200/60"
            >
               <span className="material-icons-round text-sm text-slate-400">storefront</span>
               <span className="hidden sm:inline">Ver mais viagens</span>
               <span className="sm:hidden">Viagens</span>
            </button>
            
            {/* Mobile Icon Only (if screen is very small) */}
            <button 
               onClick={() => navigate('/marketplace')}
               className="xs:hidden w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full transition-colors border border-slate-200/60"
            >
               <span className="material-icons-round text-lg text-slate-500">storefront</span>
            </button>
         </div>

         <div className="flex items-center gap-2">
            {step === 0 && !isCelebration && (
               <button
                  onClick={() => {
                     console.log('Botão Consultar clicado');
                     setShowPhoneModal(true);
                  }}
                  className="bg-[#6366F1] hover:bg-[#5558dd] text-white px-3 sm:px-4 py-2 rounded-xl flex items-center justify-center gap-2 relative shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] animate-pulse"
               >
                  <span className="material-icons-outlined text-white text-lg">search</span>
                  <span className="font-bold text-xs sm:text-sm">Consultar</span>
                  {selectedTickets.length > 0 && (
                     <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-none">
                        {selectedTickets.length}
                     </span>
                  )}
               </button>
            )}
            {step > 0 && step < 4 && !isCelebration && (
               <button
                  onClick={() => setStep((s) => (Math.max(0, s - 1) as any))}
                  className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-xs sm:text-sm font-bold bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
               >
                  <span className="material-icons-round text-sm">arrow_back</span>
                  Voltar
               </button>
            )}
         </div>
      </header>
   );

   const CheckoutHeader = () => (
      <div className="px-5 pt-6 pb-2 max-w-md mx-auto text-center space-y-1">
         <h2 className="font-black text-slate-900 text-xl tracking-tight leading-tight">{campaign.title}</h2>
         <div className="flex justify-center items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse"></span>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Finalizando Reserva</p>
         </div>
      </div>
   );

   const SummaryBox = () => (
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] space-y-4">
         <div className="flex justify-between items-end">
            <div className="space-y-0.5">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total do Pedido</p>
               <p className="text-2xl font-black text-[#6366F1]">R$ {totalValue}</p>
            </div>
            <div className="text-right space-y-0.5">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Passagens</p>
               <p className="text-sm font-black text-slate-700">{selectedTickets.length} <span className="text-xs font-medium text-slate-400">lugares</span></p>
            </div>
         </div>

         {(selectedTripDate || selectedReturnDate) && (
            <div className="flex flex-col gap-1.5 p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
               {selectedTripDate && tripLegs.ida && (
                  <div className="flex items-center gap-2">
                     <span className="material-icons-round text-[#6366F1] text-sm">event</span>
                     <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight">
                        IDA: <span className="text-slate-900 ml-1">{new Date(selectedTripDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                     </p>
                  </div>
               )}
               {selectedReturnDate && tripLegs.volta && (
                  <div className="flex items-center gap-2">
                     <span className="material-icons-round text-[#6366F1] text-sm">event_repeat</span>
                     <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight">
                        VOLTA: <span className="text-slate-900 ml-1">{new Date(selectedReturnDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                     </p>
                  </div>
               )}
            </div>
         )}

         <div className="pt-4 border-t border-slate-50">
            <div className="flex justify-between items-center mb-2.5">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Poltronas Selecionadas</p>
               {isHalfPrice && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded uppercase tracking-tighter">Meia Entrada Applied</span>
               )}
               {isLapChild && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded uppercase tracking-tighter">Passagem Grátis (Colo)</span>
               )}
            </div>
            <div className="flex flex-wrap gap-1.5">
               {selectedTickets.sort((a, b) => a - b).map((n) => (
                  <span key={n} className="bg-slate-50 text-[#6366F1] text-xs font-black w-8 h-8 rounded-xl border border-slate-100 flex items-center justify-center">
                     {String(n + 1).padStart(2, '0')}
                  </span>
               ))}
            </div>
         </div>
      </div>
   );

   // ═══════════════════════════════════════════════════════════
   // VIEW ROUTING
   // ═══════════════════════════════════════════════════════════

   console.log('[DEBUG] VIEW ROUTING - Step atual:', step, 'isCelebration:', isCelebration);

   if (!campaign) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-white font-sans">
            <div className="text-center">
               <div className="w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-slate-500 font-medium">Carregando campanha...</p>
            </div>
         </div>
      );
   }

   if (isCelebration && campaign?.status === 'completed') {
      // ... (Existing Celebration Code) ...
      // Keeping it brief for brevity in this response, inserting same block
      return (
         <div className="bg-[#022c22] min-h-screen font-sans relative overflow-x-hidden selection:bg-emerald-500/30">
            {/* Same Celebration content as before */}
            <div className="fixed inset-0 pointer-events-none z-0">
               <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] bg-emerald-500/20 blur-[120px] rounded-full mix-blend-screen" />
               <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] bg-teal-500/10 blur-[120px] rounded-full mix-blend-screen" />
               <div className="absolute top-[40%] left-[20%] w-[40%] h-[40%] bg-white/5 blur-[100px] rounded-full mix-blend-overlay" />
            </div>
            <header className="px-5 py-6 flex justify-between items-center relative z-10">
               {/* ... Header content ... */}
               <div className="flex items-center gap-1.5">
                  <div className="bg-[#10B981] p-1.5 rounded-lg -rotate-6 shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/20">
                     <span className="text-[#022c22] font-black italic text-sm tracking-tighter">Dig</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg rotate-3 -ml-2 z-10 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                     <span className="text-[#022c22] font-black text-sm tracking-tighter">Passagem</span>
                  </div>
               </div>
               <div className="px-3 py-1 bg-emerald-950/50 border border-emerald-500/30 rounded-full backdrop-blur-md shadow-inner shadow-emerald-500/10">
                  <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                     Finalizada
                  </span>
               </div>
            </header>
            <div className="px-5 pb-12 max-w-md mx-auto relative z-10 flex flex-col min-h-[80vh]">
               <div className="text-center mb-10 mt-4">
                  <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight leading-[0.9]">
                     Embarque<br />
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-100 to-teal-300 drop-shadow-sm">Realizado!</span>
                  </h1>
               </div>
               <div className="space-y-5 flex-1">
                  {winners.map((winner, idx) => (
                     <div key={idx} className="bg-white/10 rounded-xl p-4 text-white">
                        <p className="font-bold">{winner.name}</p>
                        <p className="text-sm opacity-80">{winner.prize}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      );
   }

   // ═══════════════════════════════════════════════════════════
   // STEP 0 — Grid de Poltronas
   // ═══════════════════════════════════════════════════════════
   if (step === 0) {
      // ... Same Step 0 content ...
      return (
         <div className="bg-white min-h-screen font-sans pb-28">
            <NotificationToast />
            <Navbar />
            {/* Main Image Carousel */}
            <div
               className="w-full aspect-video bg-slate-900 relative border-b border-slate-800 overflow-hidden group"
               onMouseEnter={() => setIsPaused(true)}
               onMouseLeave={() => setIsPaused(false)}
            >
               <AnimatePresence initial={false} mode="wait">
                  <motion.img
                     key={currentImageIndex}
                     src={campaignImages[currentImageIndex] || primaryImage}
                     initial={{ opacity: 0, scale: 1.1 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     transition={{ duration: 0.8, ease: "easeOut" }}
                     className="w-full h-full object-cover"
                  />
               </AnimatePresence>

               {campaignImages.length > 1 && (
                  <>
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {campaignImages.map((_, i) => (
                           <button
                              key={i}
                              onClick={() => setCurrentImageIndex(i)}
                              className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'}`}
                           />
                        ))}
                     </div>
                     <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                           onClick={() => setCurrentImageIndex(prev => (prev - 1 + campaignImages.length) % campaignImages.length)}
                           className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50"
                        >
                           <span className="material-icons-round text-sm">chevron_left</span>
                        </button>
                        <button
                           onClick={() => setCurrentImageIndex(prev => (prev + 1) % campaignImages.length)}
                           className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50"
                        >
                           <span className="material-icons-round text-sm">chevron_right</span>
                        </button>
                     </div>
                  </>
               )}
            </div>

            <div className="p-4 space-y-5 max-w-md mx-auto">
               <h1 className="text-lg font-bold text-slate-900 leading-tight mb-1">{campaign.title}</h1>
               <div className="flex items-center gap-2 mb-4">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Observação</span>
                  <p className="text-[11px] text-slate-500 font-medium italic">Esta lancha faz embarque no trajeto</p>
               </div>

               {/* Itinerário Display - Dropdown Selection */}
               {campaign.itinerary && Array.isArray(campaign.itinerary) && campaign.itinerary.length > 0 && (
                  <div className="space-y-4 mb-4">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons-round text-[#6366F1] text-lg">schedule</span>
                        <h3 className="text-[13px] font-black text-[#5e6686] uppercase tracking-wider">SELECIONE O HORÁRIO E DATA</h3>
                     </div>

                     <div className="relative">
                        <button
                           onClick={() => setIsTripDropdownOpen(!isTripDropdownOpen)}
                           className={`w-full bg-white rounded-2xl border ${isTripDropdownOpen ? 'border-[#6366F1] ring-4 ring-[#6366F1]/5' : 'border-slate-200'} p-4 shadow-sm flex items-center justify-between group transition-all`}
                        >
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                                 <span className="material-icons-round text-[#6366F1] text-2xl">directions_boat</span>
                              </div>
                              <div className="text-left">
                                 <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-black text-[#6366F1] uppercase">{campaign.itinerary[selectedTripIndex].dayOfWeek}</span>
                                    <span className="text-[#10B981] font-black text-sm">SAÍDA {campaign.itinerary[selectedTripIndex].departureTime}</span>
                                 </div>
                                 <p className="text-[11px] font-bold text-slate-400 uppercase truncate max-w-[200px]">
                                    {campaign.locations?.find((l: any) => l.id === campaign.itinerary[selectedTripIndex].locationId)?.name || 'Saída fixa'}
                                 </p>
                              </div>
                           </div>
                           <span className={`material-icons-round text-slate-400 transition-transform duration-300 ${isTripDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>

                        <AnimatePresence>
                           {isTripDropdownOpen && (
                              <motion.div
                                 initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                 animate={{ opacity: 1, scale: 1, y: 0 }}
                                 exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                 className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[100] overflow-hidden max-h-[300px] overflow-y-auto"
                              >
                                 {campaign.itinerary.map((trip: any, idx: number) => (
                                    <button
                                       key={idx}
                                       onClick={() => {
                                          setSelectedTripIndex(idx);
                                          setIsTripDropdownOpen(false);
                                          setSelectedTripDate(''); // Limpa a data escolhida para forçar nova seleção
                                       }}
                                       className={`w-full p-4 flex items-center justify-between border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${selectedTripIndex === idx ? 'bg-indigo-50/50' : ''}`}
                                    >
                                       <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedTripIndex === idx ? 'bg-[#6366F1] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                             <span className="material-icons-round text-lg">directions_boat</span>
                                          </div>
                                          <div className="text-left">
                                             <p className={`text-xs font-black uppercase ${selectedTripIndex === idx ? 'text-[#6366F1]' : 'text-slate-700'}`}>{trip.dayOfWeek}</p>
                                             <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[180px]">
                                                {campaign.locations?.find((l: any) => l.id === trip.locationId)?.name || 'Saída fixa'}
                                             </p>
                                          </div>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-[9px] font-black text-[#10B981]">SAÍDA</p>
                                          <p className="font-black text-slate-900">{trip.departureTime}</p>
                                       </div>
                                    </button>
                                 ))}
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </div>

                     {/* Date Selection Dropdown - Mandatory */}
                     <div className="mt-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                        <div className="flex items-center gap-2 mb-4">
                           <span className="w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                           <p className="text-[11px] font-black text-[#6366F1] uppercase tracking-widest">Escolha a Data da Viagem (Obrigatório)</p>
                        </div>

                        <div className="relative">
                           <button
                              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                              className={`w-full bg-white rounded-xl border ${isDateDropdownOpen ? 'border-[#6366F1] ring-4 ring-[#6366F1]/5' : 'border-slate-200'} p-3.5 shadow-sm flex items-center justify-between group transition-all`}
                           >
                              <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedTripDate ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                                    <span className={`material-icons-round ${selectedTripDate ? 'text-[#6366F1]' : 'text-slate-400'} text-xl`}>calendar_today</span>
                                 </div>
                                 <div className="text-left">
                                    {selectedTripDate ? (
                                       <>
                                          <p className="text-[10px] font-black text-indigo-400 uppercase leading-none mb-1">Data Selecionada</p>
                                          <p className="text-sm font-black text-slate-800 uppercase">
                                             {new Date(selectedTripDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                          </p>
                                       </>
                                    ) : (
                                       <p className="text-sm font-bold text-slate-400">Clique para ver as datas disponíveis...</p>
                                    )}
                                 </div>
                              </div>
                              <span className={`material-icons-round text-slate-400 transition-transform duration-300 ${isDateDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                           </button>

                           <AnimatePresence>
                              {isDateDropdownOpen && (
                                 <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[110] overflow-hidden max-h-[280px] overflow-y-auto"
                                 >
                                    {campaign.itinerary[selectedTripIndex] && getAvailableDates(campaign.itinerary[selectedTripIndex].dayOfWeek).slice(0, 26).map((date, i) => {
                                       const dateStr = date.toISOString().split('T')[0];
                                       const isSelected = selectedTripDate === dateStr;
                                       return (
                                          <button
                                             key={dateStr}
                                             onClick={() => {
                                                setSelectedTripDate(dateStr);
                                                setIsDateDropdownOpen(false);
                                             }}
                                             className={`w-full p-4 flex items-center justify-between border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                          >
                                             <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#6366F1] text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                   <span className="material-icons-round text-sm">event</span>
                                                </div>
                                                <div className="text-left">
                                                   <p className={`text-sm font-black uppercase ${isSelected ? 'text-[#6366F1]' : 'text-slate-700'}`}>
                                                      {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                                                   </p>
                                                   <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                      {date.toLocaleDateString('pt-BR', { year: 'numeric' })}
                                                   </p>
                                                </div>
                                             </div>
                                             {isSelected && <span className="material-icons-round text-emerald-500 text-sm">check_circle</span>}
                                          </button>
                                       );
                                    })}
                                 </motion.div>
                              )}
                           </AnimatePresence>
                        </div>

                        {/* Ida e Volta Toggles */}
                        <div className="mt-4 flex gap-3">
                           <button
                              type="button"
                              onClick={() => setTripLegs(prev => ({ ...prev, ida: !prev.ida }))}
                              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${tripLegs.ida
                                 ? 'bg-[#6366F1] text-white border-[#6366F1] shadow-lg shadow-[#6366F1]/20'
                                 : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                                 }`}
                           >
                              <span className="material-icons-round text-lg">{tripLegs.ida ? 'check_circle' : 'radio_button_unchecked'}</span>
                              Ida
                           </button>
                           <button
                              type="button"
                              onClick={() => setTripLegs(prev => ({ ...prev, volta: !prev.volta }))}
                              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${tripLegs.volta
                                 ? 'bg-[#6366F1] text-white border-[#6366F1] shadow-lg shadow-[#6366F1]/20'
                                 : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                                 }`}
                           >
                              <span className="material-icons-round text-lg">{tripLegs.volta ? 'check_circle' : 'radio_button_unchecked'}</span>
                              Volta
                           </button>
                        </div>
                        {tripLegs.ida && tripLegs.volta && (
                           <p className="mt-2 text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                              <span className="material-icons-round text-xs">info</span>
                              Ao selecionar ida e volta, sua poltrona será reservada para ambos os trechos.
                           </p>
                        )}

                        {/* Volta Schedule & Date Selection */}
                        {tripLegs.volta && (
                           <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-4">
                              
                              {/* Volta Schedule Dropdown */}
                              <div className="relative">
                                 <div className="flex items-center gap-2 mb-2">
                                     <span className="w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-[10px] font-bold">1B</span>
                                     <p className="text-[11px] font-black text-[#6366F1] uppercase tracking-widest">Escolha o Horário de Volta</p>
                                 </div>
                                 <button
                                    onClick={() => setIsReturnTripDropdownOpen(!isReturnTripDropdownOpen)}
                                    className={`w-full bg-white rounded-2xl border ${isReturnTripDropdownOpen ? 'border-[#6366F1] ring-4 ring-[#6366F1]/5' : 'border-slate-200'} p-4 shadow-sm flex items-center justify-between group transition-all`}
                                 >
                                    <div className="flex items-center gap-4">
                                       <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                                          <span className="material-icons-round text-[#6366F1] text-2xl">directions_boat</span>
                                       </div>
                                       <div className="text-left">
                                          <div className="flex items-center gap-2">
                                             <span className="text-[14px] font-black text-[#6366F1] uppercase">{campaign.itinerary[selectedReturnTripIndex]?.dayOfWeek}</span>
                                             <span className="text-[#10B981] font-black text-sm">SAÍDA {campaign.itinerary[selectedReturnTripIndex]?.departureTime}</span>
                                          </div>
                                          <p className="text-[11px] font-bold text-slate-400 uppercase truncate max-w-[200px]">
                                             {campaign.locations?.find((l: any) => l.id === campaign.itinerary[selectedReturnTripIndex]?.locationId)?.name || 'Saída fixa'}
                                          </p>
                                       </div>
                                    </div>
                                    <span className={`material-icons-round text-slate-400 transition-transform duration-300 ${isReturnTripDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                 </button>

                                 <AnimatePresence>
                                    {isReturnTripDropdownOpen && (
                                       <motion.div
                                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[100] overflow-hidden max-h-[300px] overflow-y-auto"
                                       >
                                          {campaign.itinerary.map((trip: any, idx: number) => (
                                             <button
                                                key={idx}
                                                onClick={() => {
                                                   setSelectedReturnTripIndex(idx);
                                                   setIsReturnTripDropdownOpen(false);
                                                   setSelectedReturnDate(''); // Clear date when schedule changes
                                                }}
                                                className={`w-full p-4 flex items-center justify-between border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${selectedReturnTripIndex === idx ? 'bg-indigo-50/50' : ''}`}
                                             >
                                                <div className="flex items-center gap-3">
                                                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedReturnTripIndex === idx ? 'bg-[#6366F1] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                      <span className="material-icons-round text-lg">directions_boat</span>
                                                   </div>
                                                   <div className="text-left">
                                                      <p className={`text-xs font-black uppercase ${selectedReturnTripIndex === idx ? 'text-[#6366F1]' : 'text-slate-700'}`}>{trip.dayOfWeek}</p>
                                                      <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[180px]">
                                                         {campaign.locations?.find((l: any) => l.id === trip.locationId)?.name || 'Saída fixa'}
                                                      </p>
                                                   </div>
                                                </div>
                                                <div className="text-right">
                                                   <p className="text-[9px] font-black text-[#10B981]">SAÍDA</p>
                                                   <p className="font-black text-slate-900">{trip.departureTime}</p>
                                                </div>
                                             </button>
                                          ))}
                                       </motion.div>
                                    )}
                                 </AnimatePresence>
                              </div>

                              {/* Volta Date Dropdown */}
                              <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                                 <div className="flex items-center gap-2 mb-4">
                                    <span className="w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-[10px] font-bold">2B</span>
                                    <p className="text-[11px] font-black text-[#6366F1] uppercase tracking-widest">Escolha a Data da Volta</p>
                                 </div>

                                 <div className="relative">
                                    <button
                                       onClick={() => setIsReturnDateDropdownOpen(!isReturnDateDropdownOpen)}
                                       className={`w-full bg-white rounded-xl border ${isReturnDateDropdownOpen ? 'border-[#6366F1] ring-4 ring-[#6366F1]/5' : 'border-slate-200'} p-3.5 shadow-sm flex items-center justify-between group transition-all`}
                                    >
                                       <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedReturnDate ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                                             <span className={`material-icons-round ${selectedReturnDate ? 'text-[#6366F1]' : 'text-slate-400'} text-xl`}>event_repeat</span>
                                          </div>
                                          <div className="text-left">
                                             {selectedReturnDate ? (
                                                <>
                                                   <p className="text-[10px] font-black text-indigo-400 uppercase leading-none mb-1">Data da Volta</p>
                                                   <p className="text-sm font-black text-slate-800 uppercase">
                                                      {new Date(selectedReturnDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                   </p>
                                                </>
                                             ) : (
                                                <p className="text-sm font-bold text-slate-400">Selecione a data de volta...</p>
                                             )}
                                          </div>
                                       </div>
                                       <span className={`material-icons-round text-slate-400 transition-transform duration-300 ${isReturnDateDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                    </button>

                                    <AnimatePresence>
                                       {isReturnDateDropdownOpen && (
                                          <motion.div
                                             initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                             animate={{ opacity: 1, scale: 1, y: 0 }}
                                             exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                             className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[110] overflow-hidden max-h-[280px] overflow-y-auto"
                                          >
                                             {campaign.itinerary[selectedReturnTripIndex] && getAvailableDates(campaign.itinerary[selectedReturnTripIndex].dayOfWeek)
                                                .filter(date => {
                                                   if (!selectedTripDate) return true;
                                                   // Garante que a data de volta seja estritamente posterior à data de ida (exclui o mesmo dia)
                                                   const dateStr = date.toISOString().split('T')[0];
                                                   return dateStr > selectedTripDate;
                                                })
                                                .slice(0, 26).map((date, i) => {
                                                const dateStr = date.toISOString().split('T')[0];
                                                const isSelected = selectedReturnDate === dateStr;
                                                return (
                                                   <button
                                                      key={dateStr}
                                                      onClick={() => {
                                                         setSelectedReturnDate(dateStr);
                                                         setIsReturnDateDropdownOpen(false);
                                                      }}
                                                      className={`w-full p-4 flex items-center justify-between border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                                   >
                                                      <div className="flex items-center gap-3">
                                                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#6366F1] text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                            <span className="material-icons-round text-sm">event</span>
                                                         </div>
                                                         <div className="text-left">
                                                            <p className={`text-sm font-black uppercase ${isSelected ? 'text-[#6366F1]' : 'text-slate-700'}`}>
                                                               {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                               {date.toLocaleDateString('pt-BR', { year: 'numeric' })}
                                                            </p>
                                                         </div>
                                                      </div>
                                                      {isSelected && <span className="material-icons-round text-emerald-500 text-sm">check_circle</span>}
                                                   </button>
                                                );
                                             })}
                                          </motion.div>
                                       )}
                                    </AnimatePresence>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* Poltronas Grid / Layout - Only show if date is selected */}
               {(!selectedTripDate || (tripLegs.volta && !selectedReturnDate)) ? (
                  <div className="py-12 px-6 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-3">
                     <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        <span className="material-icons-round text-slate-300 text-4xl">event_available</span>
                     </div>
                     <h4 className="text-sm font-bold text-slate-700">
                        {tripLegs.volta && !selectedReturnDate && selectedTripDate ? 'Selecione a data de volta' : 'Selecione as datas acima'}
                     </h4>
                     <p className="text-xs text-slate-400 max-w-[200px]">Os assentos disponíveis variam de acordo com o dia escolhido para a sua viagem.</p>
                  </div>
               ) : campaign.seatLayout && Array.isArray(campaign.seatLayout) && campaign.seatLayout.length > 0 ? (
                  <div className="bg-slate-50 dark:bg-[#111] rounded-3xl p-2 sm:p-8 border border-slate-200 dark:border-[#222] overflow-hidden relative shadow-inner">
                     <div className="flex items-center gap-2 mb-4 w-full max-w-[320px] mx-auto">
                        <span className="w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                        <p className="text-[11px] font-black text-[#6366F1] uppercase tracking-widest">Escolha sua Poltrona</p>
                     </div>

                     {/* Mobile Scaled Container */}
                     <div className="w-full flex justify-center origin-top transform sm:scale-100 scale-[0.85] xs:scale-95">
                        <div
                           className="relative border-[10px] border-[#6366F1]/10 bg-white dark:bg-[#1a1a1a] rounded-t-[24rem] rounded-b-[80px] p-4 sm:p-8 pb-16 shadow-2xl w-fit min-w-[280px] sm:min-w-[320px] mx-auto transition-all outline outline-1 outline-indigo-200/50"
                        >
                           {/* Proa Design */}
                           <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-indigo-50/10 to-transparent rounded-t-[23rem] pointer-events-none"></div>

                           <div className="w-28 sm:w-32 h-14 sm:h-16 border-b-4 border-x-4 border-slate-100 dark:border-slate-800 rounded-b-3xl mx-auto mb-12 sm:mb-16 bg-slate-50/50 dark:bg-[#0d0d0d] shadow-inner relative flex justify-center items-center">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-[6px] border-slate-200 dark:border-slate-700 absolute -top-4 sm:-top-5 bg-white dark:bg-[#1a1a1a] shadow-lg flex items-center justify-center">
                                 <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></div>
                              </div>
                              <div className="flex gap-3 sm:gap-4 mt-4">
                                 <div className="w-4 h-5 sm:w-5 sm:h-6 bg-[#6366F1]/5 dark:bg-blue-900/10 rounded-full border-2 border-[#6366F1]/20 dark:border-blue-800/20 shadow-inner"></div>
                                 <div className="w-4 h-5 sm:w-5 sm:h-6 bg-[#6366F1]/5 dark:bg-blue-900/10 rounded-full border-2 border-[#6366F1]/20 dark:border-blue-800/20 shadow-inner"></div>
                              </div>
                           </div>
                           {/* Fileiras */}
                           <div className="flex flex-col gap-2 sm:gap-3 relative z-10 shrink-0">
                              {campaign.seatLayout.map((row, rowIndex) => {
                                 const startSeat = campaign.seatLayout!.slice(0, rowIndex).reduce((acc, r) => acc + (r.left || 0) + (r.right || 0), 0);
                                 return (
                                    <div key={`row-${rowIndex}`} className="flex justify-center gap-3 sm:gap-6">
                                       {/* Esq */}
                                       <div className="flex gap-1 sm:gap-1.5 min-w-[32px] justify-end">
                                          {Array.from({ length: row.left || 0 }).map((_, i) => {
                                             const num = startSeat + i;
                                             const isSelected = selectedTickets.includes(num);
                                             const ticket = ticketsStatus[num];
                                             const isReserved = ticket?.status === 'pending';
                                             const isPaid = ticket?.status === 'approved';
                                             const isOtherSelected = selectedTickets.length > 0 && !isSelected;

                                             let btnClass = 'bg-white border-slate-200 text-slate-600 hover:border-[#6366F1] dark:bg-[#252525] dark:border-[#444] dark:text-slate-300 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-3px_5px_rgba(0,0,0,0.8)]';
                                             if (isSelected) {
                                                btnClass = 'bg-[#6366F1] text-white border-[#5558dd] scale-105 z-10 shadow-[0_0_12px_rgba(99,102,241,0.6)]';
                                             } else if (isPaid) {
                                                btnClass = 'bg-[#10B981]/10 text-emerald-600 border-[#10B981]/30 cursor-not-allowed opacity-60';
                                             } else if (isReserved) {
                                                btnClass = 'bg-[#F97316]/10 text-orange-600 border-[#F97316]/30 cursor-not-allowed opacity-60';
                                             } else if (isOtherSelected) {
                                                btnClass = 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-40';
                                             }

                                             return (
                                                <button
                                                   key={num}
                                                   onClick={() => handleTicketClick(num)}
                                                   disabled={isPaid || isReserved || isOtherSelected}
                                                   className={`w-8 h-10 sm:w-9 sm:h-11 rounded-t-lg rounded-b-md border transition-all flex items-center justify-center shrink-0 ${btnClass}`}
                                                >
                                                   <span className="text-[10px] sm:text-[11px] font-bold">{String(num + 1).padStart(2, '0')}</span>
                                                </button>
                                             );
                                          })}
                                       </div>
                                       {/* Corredor */}
                                       <div className="w-4 sm:w-8 flex items-center justify-center relative shrink-0">
                                          {rowIndex === 0 && <span className="absolute top-10 text-[9px] sm:text-[11px] -rotate-90 whitespace-nowrap text-blue-500/30 font-bold select-none uppercase tracking-widest">Corredor</span>}
                                       </div>
                                       {/* Dir */}
                                       <div className="flex gap-1 sm:gap-1.5 min-w-[32px] justify-start">
                                          {Array.from({ length: row.right || 0 }).map((_, i) => {
                                             const num = startSeat + (row.left || 0) + i;
                                             const isSelected = selectedTickets.includes(num);
                                             const ticket = ticketsStatus[num];
                                             const isReserved = ticket?.status === 'pending';
                                             const isPaid = ticket?.status === 'approved';
                                             const isOtherSelected = selectedTickets.length > 0 && !isSelected;

                                             let btnClass = 'bg-white border-slate-200 text-slate-600 hover:border-[#6366F1] dark:bg-[#252525] dark:border-[#444] dark:text-slate-300 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-3px_5px_rgba(0,0,0,0.8)]';
                                             if (isSelected) {
                                                btnClass = 'bg-[#6366F1] text-white border-[#5558dd] scale-105 z-10 shadow-[0_0_12px_rgba(99,102,241,0.6)]';
                                             } else if (isPaid) {
                                                btnClass = 'bg-[#10B981]/10 text-emerald-600 border-[#10B981]/30 cursor-not-allowed opacity-60';
                                             } else if (isReserved) {
                                                btnClass = 'bg-[#F97316]/10 text-orange-600 border-[#F97316]/30 cursor-not-allowed opacity-60';
                                             } else if (isOtherSelected) {
                                                btnClass = 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-40';
                                             }

                                             return (
                                                <button
                                                   key={num}
                                                   onClick={() => handleTicketClick(num)}
                                                   disabled={isPaid || isReserved || isOtherSelected}
                                                   className={`w-8 h-10 sm:w-9 sm:h-11 rounded-t-lg rounded-b-md border transition-all flex items-center justify-center shrink-0 ${btnClass}`}
                                                >
                                                   <span className="text-[10px] sm:text-[11px] font-bold">{String(num + 1).padStart(2, '0')}</span>
                                                </button>
                                             );
                                          })}
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="grid grid-cols-5 gap-1.5">
                     {numbers.map((num) => {
                        const isSelected = selectedTickets.includes(num);
                        const ticket = ticketsStatus[num];
                        const isReserved = ticket?.status === 'pending';
                        const isPaid = ticket?.status === 'approved';
                        const isOtherSelected = selectedTickets.length > 0 && !isSelected;

                        let btnClass = 'bg-white text-slate-600 border-slate-200 hover:border-[#6366F1] hover:text-[#6366F1]';
                        if (isSelected) {
                           btnClass = 'bg-[#6366F1] text-white border-[#6366F1] scale-105 z-10';
                        } else if (isPaid) {
                           btnClass = 'bg-[#10B981] text-white border-[#10B981] cursor-not-allowed';
                        } else if (isReserved) {
                           btnClass = 'bg-[#F97316] text-white border-[#F97316] cursor-not-allowed';
                        } else if (isOtherSelected) {
                           btnClass = 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-40';
                        }

                        return (
                           <button
                              key={num}
                              onClick={() => handleTicketClick(num)}
                              disabled={isPaid || isReserved || (isOtherSelected)}
                              className={`aspect-square w-full rounded flex items-center justify-center text-[11px] font-bold transition-all border ${btnClass}`}
                           >
                              {String(num + 1).padStart(2, '0')}
                           </button>
                        );
                     })}
                  </div>
               )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
               <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                     <span className="text-xs text-slate-500 font-medium">Total</span>
                     <span className="text-lg font-black text-slate-900 leading-none">R$ {totalValue}</span>
                  </div>
                  <button
                     disabled={selectedTickets.length === 0}
                     onClick={() => {
                        if (existingCustomer && existingCustomer.cpf) {
                           setPhone(formatCpf(existingCustomer.cpf));
                        }
                        setStep(1);
                     }}
                     className="flex-1 bg-[#22C55E] hover:bg-[#16a34a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-green-500/20 active:scale-[0.98]"
                  >
                     Comprar {selectedTickets.length > 0 && `(${selectedTickets.length})`}
                  </button>
               </div>
            </div>

            {/* Phone Consultation Modal */}
            <PhoneConsultModal
               isOpen={showPhoneModal}
               onClose={() => {
                  setShowPhoneModal(false);
                  setConsultPhone('');
                  setConsultCustomer(null);
                  setConsultHistory([]);
               }}
               phone={consultPhone}
               onPhoneChange={handleConsultPhoneChange}
               onPhoneBlur={handleConsultPhoneBlur}
               customer={consultCustomer}
               history={consultHistory}
               loading={loadingHistory}
               onFinalizePurchase={handleFinalizePendingPurchase}
            />

            {/* Modal de Seleção de Cliente (Múltiplos Encontrados) */}
            <CustomerSelectionModal
               isOpen={showConsultSelectionModal}
               onClose={() => setShowConsultSelectionModal(false)}
               customers={consultCustomers}
               onSelect={loadCustomerHistory}
            />

            {/* History Modal for existing customer */}
            {showHistory && (
               <HistoryModal
                  isOpen={showHistory}
                  onClose={() => setShowHistory(false)}
                  history={customerHistory}
               />
            )}

            {/* Terms Modal */}
            {showTermsModal && (
               <TermsModal
                  description={campaign.description}
                  onClose={() => setShowTermsModal(false)}
               />
            )}

            {/* Claim Prize Modal */}
            {claimModalOpen && (
               <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                     <h3 className="font-bold text-slate-900 mb-4">Resgatar Destino</h3>
                     <p className="text-sm text-slate-600 mb-4">
                        Confirme seu telefone para resgatar o destino: <strong>{claimWinnerData?.prize}</strong>
                     </p>
                     <input
                        type="tel"
                        placeholder="Seu telefone"
                        value={claimPhoneInput}
                        onChange={(e) => setClaimPhoneInput(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-slate-800 mb-4 focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
                     />
                     <div className="flex gap-3">
                        <button
                           onClick={() => setClaimModalOpen(false)}
                           className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                        >
                           Cancelar
                        </button>
                        <button
                           onClick={handleConfirmClaim}
                           className="flex-1 bg-[#6366F1] hover:bg-[#5558dd] text-white font-bold py-3 rounded-xl transition-colors"
                        >
                           Confirmar
                        </button>
                     </div>
                  </div>
               </div>
            )}
         </div>
      );
   }

   // ─── Render: Transaction History Button ──────────────────────
   const TransactionHistoryButton = () => {
      if (!existingCustomer) return null;
      return (
         <div className="flex justify-center mt-4">
            <button
               onClick={handleShowHistory}
               className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold transition-colors"
            >
               <span className="material-icons-outlined text-sm">receipt_long</span>
               Consultar transações
            </button>
         </div>
      );
   };

   // ═══════════════════════════════════════════════════════════
   // STEP 1 — Telefone
   // ═══════════════════════════════════════════════════════════
   if (step === 1) {
      // ... Same Step 1 content ...
      return (
         <div className="bg-slate-50 min-h-screen font-sans">
            <NotificationToast />
            <Navbar />
            <div className="p-4 space-y-4 max-w-md mx-auto">
               <CheckoutHeader />
               <SummaryBox />
               <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1.5">CPF ou Telefone</label>
                     <input
                        ref={phoneRef}
                        type="tel"
                        inputMode="numeric"
                        placeholder="Informe seu CPF ou Telefone"
                        value={phone}
                        onChange={(e) => {
                           const v = e.target.value;
                           const d = v.replace(/\D/g, '');

                           if (d.length <= 10) {
                              setPhone(formatPhone(d));
                           } else {
                              const ddd = parseInt(d.substring(0, 2));
                              const third = d[2];
                              if (ddd >= 11 && ddd <= 99 && third === '9') {
                                 setPhone(formatPhone(d));
                              } else {
                                 setPhone(formatCpf(d));
                              }
                           }
                        }}
                        onBlur={handlePhoneBlur}
                        className={`w-full border rounded-xl px-4 py-3 text-slate-800 text-base focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none placeholder-slate-300 ${errors.phone ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                     />
                     {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                  </div>
                  <button
                     onClick={handleStep1Continue}
                     className="w-full bg-[#6366F1] hover:bg-[#5558dd] text-white font-bold py-3.5 rounded-xl flex items-center justify-center transition-all active:scale-[0.98]"
                  >
                     Continuar
                  </button>
                  <TransactionHistoryButton />
               </div>
            </div>

            {/* Modal de Seleção (Compra) */}
            <CustomerSelectionModal
               isOpen={showPurchaseSelectionModal}
               onClose={() => setShowPurchaseSelectionModal(false)}
               customers={purchaseCandidates}
               onSelect={(customer) => {
                  setShowPurchaseSelectionModal(false);
                  onCustomerIdentified(customer);
               }}
               onRegisterNew={() => {
                  setShowPurchaseSelectionModal(false);
                  setExistingCustomer(null);

                  // Tenta preservar apenas o que não for conflitante ou o que o usuário digitou
                  const clean = phone.replace(/\D/g, '');
                  if (validateCpf(clean)) {
                     // Se digitou CPF, mantém no CPF e limpa telefone
                     setCpf(formatCpf(clean));
                     setPhone('');
                  } else {
                     // Se digitou Telefone, mantém no Telefone e limpa CPF
                     setPhone(formatPhone(clean));
                     setCpf('');
                  }

                  setName('');
                  setEmail('');
                  setStep(2); // Vai para o cadastro
               }}
            />

            {showHistory && (
               <HistoryModal
                  isOpen={showHistory}
                  onClose={() => setShowHistory(false)}
                  history={customerHistory}
               />
            )}
         </div>
      );
   }

   // ═══════════════════════════════════════════════════════════
   // STEP 2 — Dados do comprador
   // ═══════════════════════════════════════════════════════════
   if (step === 2) {
      return (
         <div className="bg-slate-50 min-h-screen font-sans">
            <NotificationToast />
            <Navbar />
            <div className="p-4 space-y-4 max-w-md mx-auto">
               <CheckoutHeader />
               <SummaryBox />
               <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
                  
                  {/* Boarding Question */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 mb-2">
                     <p className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <span className="material-icons-round text-[#6366F1]">directions_boat</span>
                        Vai embarcar no trajeto?
                     </p>
                     <div className="flex gap-2 mb-3">
                        <button
                           onClick={() => setBoardingOnRoute(true)}
                           className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                              boardingOnRoute === true
                                 ? 'bg-[#6366F1] text-white shadow-md shadow-indigo-500/20'
                                 : 'bg-white text-slate-400 border border-slate-200'
                           }`}
                        >
                           Sim
                        </button>
                        <button
                           onClick={() => setBoardingOnRoute(false)}
                           className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                              boardingOnRoute === false
                                 ? 'bg-slate-400 text-white shadow-md'
                                 : 'bg-white text-slate-400 border border-slate-200'
                           }`}
                        >
                           Não
                        </button>
                     </div>

                     {boardingOnRoute === true && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                           <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                 Endereço de Embarque <span className="text-red-500">*</span>
                              </label>
                              <input
                                 type="text"
                                 placeholder="Jurará"
                                 value={boardingAddress}
                                 onChange={(e) => setBoardingAddress(e.target.value)}
                                 className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#6366F1] outline-none text-slate-900 placeholder:text-slate-400 ${
                                    errors.boardingAddress ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
                                 }`}
                              />
                              {errors.boardingAddress && <p className="text-[10px] text-red-500 mt-1">{errors.boardingAddress}</p>}
                           </div>
                           
                           <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                   Localização de Embarque <span className="text-red-500">*</span>
                                </label>
                                <div 
                                   className={`relative cursor-pointer ${errors.boardingLocation ? 'animate-pulse' : ''}`}
                                  onClick={() => setShowLocationPicker(true)}
                               >
                                  <div className={`w-full border rounded-lg px-3 py-2.5 text-sm flex items-center gap-2 bg-white hover:bg-slate-50 transition-colors ${
                                     errors.boardingLocation ? 'border-red-400 bg-red-50' : 'border-slate-200 focus-within:ring-2 focus-within:ring-[#6366F1]'
                                  }`}>
                                     <span className="material-icons-round text-slate-400 text-lg">place</span>
                                     {boardingLat && boardingLng ? (
                                        <span className="text-slate-900 font-mono font-medium truncate">
                                           {boardingLat.toFixed(5)}, {boardingLng.toFixed(5)}
                                        </span>
                                     ) : (
                                        <span className="text-slate-400">
                                           Clique para selecionar no mapa
                                        </span>
                                     )}
                                     <span className="material-icons-round text-slate-400 text-sm ml-auto">my_location</span>
                                  </div>
                               </div>
                               {errors.boardingLocation && <p className="text-[10px] text-red-500 mt-1">{errors.boardingLocation}</p>}
                               {boardingLat && boardingLng && originName ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                     <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-md">
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase">Distância:</span>
                                        <span className="text-[10px] font-bold text-emerald-700">
                                           {haversineDistance(
                                              parseFloat(campaign.locations.find((l: any) => l.name === originName)?.lat || '0'),
                                              parseFloat(campaign.locations.find((l: any) => l.name === originName)?.lng || '0'),
                                              boardingLat,
                                              boardingLng
                                           ).toFixed(2)} km
                                        </span>
                                     </div>
                                     <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-md">
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase">Desconto:</span>
                                        <span className="text-[10px] font-bold text-emerald-700">
                                           {discountPercentage.toFixed(0)}% OFF
                                        </span>
                                     </div>
                                  </div>
                               ) : (
                                  <p className="text-[10px] text-slate-400 mt-1">
                                     <span className="text-red-500 font-bold">* Obrigatório.</span> Clique no campo acima para marcar sua localização.
                                  </p>
                               )}
                            </div>
                         </div>
                      )}
                   </div>
 
                   {/* Phone */}
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1.5">Seu telefone {activeMethod === 'n8n' && <span className="text-red-500">*</span>}</label>
                     <input
                        type="tel"
                        placeholder="(99) 99999-9999"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        className={`w-full border rounded-xl px-4 py-3 text-slate-800 text-base focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none placeholder-slate-300 ${errors.phone || uniquenessErrors.phone ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                     />
                     {errors.phone && !isPhoneComplete(phone) && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                     {uniquenessErrors.phone && <p className="text-xs text-red-500 mt-1 font-bold">{uniquenessErrors.phone}</p>}
                  </div>

                  {/* Name */}
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1.5">Seu nome</label>
                     <input
                        type="text"
                        placeholder="digite seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value.toUpperCase())}
                        disabled={!!existingCustomer}
                        className={`w-full border rounded-xl px-4 py-3 text-slate-800 text-base uppercase focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none placeholder-slate-300 placeholder:normal-case ${errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'} ${existingCustomer ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                     />
                     {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                  </div>

                  {/* CPF Field */}
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1.5">Seu CPF {activeMethod === 'n8n' && <span className="text-red-500">*</span>}</label>
                     <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => handleCpfChange(e.target.value)}
                        disabled={!!existingCustomer}
                        className={`w-full border rounded-xl px-4 py-3 text-slate-800 text-base focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none placeholder-slate-300 ${errors.cpf || uniquenessErrors.cpf ? 'border-red-400 bg-red-50' : 'border-slate-200'} ${existingCustomer ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                     />
                     {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
                     {uniquenessErrors.cpf && <p className="text-xs text-red-500 mt-1 font-bold">{uniquenessErrors.cpf}</p>}
                  </div>

                  {/* Birth Date */}
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1.5">Data de Nascimento <span className="text-red-500">*</span></label>
                     <div className="space-y-2">
                        <div className="relative">
                           <input
                              type="tel"
                              placeholder="DD/MM/AAAA"
                              maxLength={10}
                              value={birthDateInput}
                              onChange={(e) => {
                                 let v = e.target.value.replace(/\D/g, '');
                                 if (v.length > 8) v = v.slice(0, 8);
                                 
                                 // Máscara DD/MM/AAAA
                                 if (v.length > 4) {
                                    v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
                                 } else if (v.length > 2) {
                                    v = `${v.slice(0, 2)}/${v.slice(2)}`;
                                 }
                                 
                                 setBirthDateInput(v);
                                 
                                 if (v.length === 10) {
                                    const [day, month, year] = v.split('/');
                                    
                                    // Validação usando construtor local (ano, mes-1, dia) para evitar problemas de fuso horário
                                    const d = parseInt(day);
                                    const m = parseInt(month);
                                    const y = parseInt(year);
                                    
                                    const dateObj = new Date(y, m - 1, d);
                                    
                                    // Verifica se é uma data válida e se os componentes batem (ex: 31/02 não vira 03/03)
                                    if (
                                       dateObj.getFullYear() === y && 
                                       dateObj.getMonth() === m - 1 && 
                                       dateObj.getDate() === d
                                    ) {
                                       // Salva no formato YYYY-MM-DD
                                       setBirthDate(`${year}-${month}-${day}`);
                                       // Limpa erro se houver
                                       if (errors.birthDate) {
                                          setErrors(prev => {
                                             const newErrors = { ...prev };
                                             delete newErrors.birthDate;
                                             return newErrors;
                                          });
                                       }
                                    } else {
                                        // Data inválida (ex: 30/02)
                                        setBirthDate(''); 
                                    }
                                 } else if (v === '') {
                                     setBirthDate('');
                                 }
                              }}
                              className={`w-full border rounded-xl px-4 py-3 text-slate-800 text-base focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none placeholder-slate-300 ${errors.birthDate ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                           />
                           <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="relative w-6 h-6">
                                  <span className="material-icons-round text-slate-400 pointer-events-none absolute inset-0 flex items-center justify-center">calendar_today</span>
                                  <input 
                                    type="date"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setBirthDate(e.target.value);
                                        }
                                    }}
                                  />
                              </div>
                           </div>
                        </div>
                        {birthDate && ageInfo && (
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-[#6366F1]/10 text-[#6366F1] rounded-lg border border-[#6366F1]/20 w-fit">
                              <span className="material-icons-round text-sm">cake</span>
                              <span className="text-[10px] font-extrabold uppercase tracking-tight">IDADE: {ageInfo.text}</span>
                           </div>
                        )}
                        {errors.birthDate && <p className="text-xs text-red-500 mt-1">{errors.birthDate}</p>}
                     </div>
                  </div>

                  {/* Responsible Adult Section for Minors */}
                  {birthDate && ageInfo && ageInfo.years < 18 && (
                     <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="material-icons-round text-amber-500 text-lg">supervised_user_circle</span>
                           <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Responsável Adulto</h4>
                        </div>

                        {!responsibleId ? (
                           <div className="space-y-3">
                              <p className="text-[11px] text-slate-500 font-medium">Por ser menor de idade, é necessário vincular a um adulto responsável.</p>
                              <div className="relative">
                                 <input
                                    type="text"
                                    placeholder="Nome ou CPF do Responsável"
                                    value={responsibleSearch}
                                    onChange={(e) => handleResponsibleSearch(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6366F1] outline-none"
                                 />
                                 {searchingResponsible && (
                                    <div className="absolute right-3 top-3.5">
                                       <span className="material-icons-round animate-spin text-slate-400 text-sm">sync</span>
                                    </div>
                                 )}

                                 {responsibleOptions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                       {responsibleOptions.map((opt) => (
                                          <button
                                             key={opt.id}
                                             onClick={() => {
                                                setResponsibleId(opt.id);
                                                setResponsibleName(opt.name);
                                                setResponsibleOptions([]);
                                                setResponsibleSearch('');
                                             }}
                                             className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between border-b last:border-0 border-slate-50"
                                          >
                                             <div>
                                                <p className="text-sm font-bold text-slate-800 uppercase">{opt.name}</p>
                                                <p className="text-[10px] text-slate-400">CPF: {opt.cpf || 'Não informado'}</p>
                                             </div>
                                             <span className="material-icons-round text-slate-300">add_circle_outline</span>
                                          </button>
                                       ))}
                                    </div>
                                 )}

                                 {responsibleSearch.length >= 3 && !searchingResponsible && responsibleOptions.length === 0 && !isRegisteringResponsible && (
                                    <div className="p-3 text-center bg-white rounded-xl border border-dashed border-slate-200">
                                       <p className="text-[11px] text-slate-500 mb-2">Nenhum adulto encontrado.</p>
                                       <button
                                          onClick={() => setIsRegisteringResponsible(true)}
                                          className="text-[11px] font-bold text-[#6366F1] underline decoration-2 underline-offset-4"
                                       >
                                          Cadastrar Novo Responsável
                                       </button>
                                    </div>
                                 )}

                                 {isRegisteringResponsible && (
                                    <div className="space-y-3 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm animate-in zoom-in-95 duration-200">
                                       <div className="flex items-center justify-between mb-1">
                                          <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Novo Responsável</h5>
                                          <button onClick={() => setIsRegisteringResponsible(false)} className="text-slate-300 hover:text-slate-500">
                                             <span className="material-icons-round text-sm">close</span>
                                          </button>
                                       </div>

                                       <div className="space-y-2">
                                          <input
                                             type="text"
                                             placeholder="Nome Completo do Adulto"
                                             value={newResponsibleName}
                                             onChange={(e) => setNewResponsibleName(e.target.value.toUpperCase())}
                                             className="w-full border border-slate-100 bg-slate-50 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#6366F1] outline-none"
                                          />
                                          <input
                                             type="tel"
                                             placeholder="Telefone com DDD"
                                             value={newResponsiblePhone}
                                             onChange={(e) => setNewResponsiblePhone(formatPhone(e.target.value))}
                                             className="w-full border border-slate-100 bg-slate-50 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#6366F1] outline-none"
                                          />
                                       </div>

                                       <button
                                          onClick={handleCreateResponsible}
                                          disabled={searchingResponsible || !newResponsibleName || !isPhoneComplete(newResponsiblePhone)}
                                          className="w-full bg-[#6366F1] hover:bg-[#5558dd] disabled:bg-slate-300 text-white text-[10px] font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                                       >
                                          {searchingResponsible ? (
                                             <span className="material-icons-round animate-spin text-sm">sync</span>
                                          ) : (
                                             <>
                                                <span className="material-icons-round text-sm">person_add</span>
                                                CADASTRAR E VINCULAR
                                             </>
                                          )}
                                       </button>
                                       <p className="text-[9px] text-center text-slate-400">O responsável deve ter mais de 18 anos.</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        ) : (
                           <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#10B981]/30">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
                                       <span className="material-icons-round text-[#10B981] text-sm">check_circle</span>
                                    </div>
                                    <div>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Responsável Vinculado</p>
                                       <p className="text-sm font-black text-slate-800 uppercase">{responsibleName}</p>
                                    </div>
                                 </div>
                                 <button onClick={() => setResponsibleId(null)} className="text-slate-300 hover:text-red-400 transition-colors">
                                    <span className="material-icons-round text-sm">remove_circle_outline</span>
                                 </button>
                              </div>

                              <div>
                                 <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Grau de Parentesco</label>
                                 <select
                                    value={relationship}
                                    onChange={(e) => setRelationship(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6366F1] outline-none bg-white"
                                 >
                                    <option value="">Selecione...</option>
                                    <option value="PAI/MAE">Pai / Mãe</option>
                                    <option value="AVO">Avô / Avó</option>
                                    <option value="TIO">Tio / Tia</option>
                                    <option value="IRMAO">Irmão / Irmã</option>
                                    <option value="OUTRO">Outro Responsável</option>
                                 </select>
                                 {errors.relationship && <p className="text-xs text-red-500 mt-1">{errors.relationship}</p>}
                              </div>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Email */}
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1.5">Seu melhor e-mail <span className="text-slate-400 font-normal">(opcional)</span></label>
                     <input
                        type="email"
                        placeholder="digite seu e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-3 text-slate-800 text-base focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none placeholder-slate-300 ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                     />
                     {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>

                  {/* Terms checkbox */}
                  <div className={`border rounded-xl p-3 ${errors.terms ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
                     <label className="flex items-start gap-3 cursor-pointer">
                        <input
                           type="checkbox"
                           checked={termsAccepted}
                           onChange={(e) => setTermsAccepted(e.target.checked)}
                           className="mt-0.5 accent-[#6366F1] w-4 h-4 shrink-0"
                        />
                        <span className="text-slate-600 text-xs leading-relaxed">
                           Entendo e aceito os{' '}
                           <button type="button" onClick={() => setShowTermsModal(true)} className="text-[#6366F1] font-bold underline">
                              Termos e Condições
                           </button>{' '}
                           da DigPassagem.
                        </span>
                     </label>
                     {errors.terms && <p className="text-xs text-red-500 mt-2">{errors.terms}</p>}
                  </div>

                  {/* Botões de ação */}
                  {existingCustomer && hasChanges ? (
                     <button
                        onClick={handleUpdateCustomer}
                        disabled={isUpdating || isCheckingUniqueness || Object.keys(uniquenessErrors).length > 0}
                        className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-70 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                     >
                        {isUpdating ? (
                           <>
                              <span className="material-icons-round animate-spin text-sm">sync</span>
                              Atualizando...
                           </>
                        ) : (
                           <>
                              <span className="material-icons-round text-sm">update</span>
                              Atualizar
                           </>
                        )}
                     </button>
                  ) : (
                     <button
                        onClick={handleFinalize}
                        disabled={submitting || isGeneratingPix || isCheckingUniqueness || Object.keys(uniquenessErrors).length > 0 || (existingCustomer && hasChanges)}
                        className="w-full bg-[#6366F1] hover:bg-[#5558dd] disabled:opacity-70 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                     >
                        {isCheckingUniqueness ? (
                           <>
                              <span className="material-icons-round animate-spin text-sm">sync</span>
                              Verificando dados...
                           </>
                        ) : isGeneratingPix ? (
                           <>
                              <span className="material-icons-round animate-spin text-sm">sync</span>
                              Gerando Pix...
                           </>
                        ) : (activeMethod === 'n8n' ? 'Gerar Pix' : 'Finalizar compra')}
                     </button>
                  )}
                  <button
                     onClick={() => setStep(0)}
                     disabled={submitting || isGeneratingPix || isUpdating}
                     className="w-full mt-3 bg-transparent hover:bg-slate-100 text-slate-500 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                     Voltar e escolher mais
                  </button>
                  <TransactionHistoryButton />
               </div>
            </div>
            {showLocationPicker && (
               <LocationPickerModal
                  isOpen={showLocationPicker}
                  onClose={() => setShowLocationPicker(false)}
                  onConfirm={(lat, lng) => {
                     setBoardingLat(lat);
                     setBoardingLng(lng);
                     setBoardingMapLink(`https://www.google.com/maps?q=${lat},${lng}`);
                     if (errors.boardingLocation) {
                        setErrors(prev => {
                           const newErrors = { ...prev };
                           delete newErrors.boardingLocation;
                           return newErrors;
                        });
                     }
                  }}
                  initialLat={boardingLat}
                  initialLng={boardingLng}
                  originLat={campaign?.locations?.[0]?.lat ? parseFloat(campaign.locations[0].lat) : undefined}
                  originLng={campaign?.locations?.[0]?.lng ? parseFloat(campaign.locations[0].lng) : undefined}
                  routeTotalKm={(() => {
                     if (!campaign?.route_distance) return undefined;
                     const match = String(campaign.route_distance).match(/(\d+([.,]\d+)?)/);
                     return match ? parseFloat(match[1].replace(',', '.')) : undefined;
                  })()}
               />
            )}
            {showTermsModal && <TermsModal description={campaign.description} onClose={() => setShowTermsModal(false)} />}
            {showHistory && (
               <HistoryModal
                  isOpen={showHistory}
                  onClose={() => setShowHistory(false)}
                  history={customerHistory}
               />
            )}
         </div>
      );
   }

   // ═══════════════════════════════════════════════════════════
   // STEP 7 — Pagamento Automático N8N (NOVO)
   // ═══════════════════════════════════════════════════════════
   if (step === 7) {
      console.log('[DEBUG] Step 7 renderizado - Aguardando Pagamento');

      const expirationDate = purchaseCreatedAt
         ? new Date(purchaseCreatedAt.getTime() + paymentMinutes * 60000)
         : new Date(Date.now() + paymentMinutes * 60000);

      return (
         <div className="bg-slate-50 min-h-screen font-sans pb-10">
            <NotificationToast />
            <Navbar />
            <div className="p-4 space-y-5 max-w-md mx-auto">
               <div className="flex flex-col items-center pt-2 pb-1">
                  <CountdownTimer minutes={paymentMinutes} createdAt={purchaseCreatedAt} onExpire={handlePurchaseExpired} />
                  <h2 className="text-2xl font-black text-slate-900 mt-4">Aguardando Pagamento</h2>
                  <p className="text-slate-500 text-sm mt-1 text-center">
                     Pague até <span className="font-bold text-slate-700">{expirationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> de hoje
                  </p>
               </div>

               {/* QR Code Box */}
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 flex flex-col items-center">
                  {paymentData?.['qr-code'] ? (
                     <img
                        src={paymentData['qr-code']}
                        alt="QR Code Pix"
                        className="w-48 h-48 object-contain mb-4 border border-slate-100 rounded-lg"
                     />
                  ) : (
                     <div className="w-48 h-48 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-slate-400 text-xs">QR Code indisponível</span>
                     </div>
                  )}

                  <div className="w-full">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">PIX COPIA E COLA</p>
                     <div className="flex gap-2">
                        <input
                           readOnly
                           value={paymentData?.['chave-pix-copia-cola'] || ''}
                           className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 font-mono truncate"
                        />
                        <button
                           onClick={handleCopyPix}
                           className="bg-[#6366F1] text-white p-2 rounded-lg hover:bg-[#5558dd] transition-colors"
                        >
                           <span className="material-icons-round text-sm">{copied ? 'check' : 'content_copy'}</span>
                        </button>
                     </div>
                     {copied && <p className="text-emerald-500 text-xs mt-1 font-bold">Copiado!</p>}
                  </div>
               </div>

               {/* Polling Indicator */}
               <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 bg-[#6366F1] rounded-full animate-ping"></span>
                     <p className="text-xs text-slate-500 font-medium animate-pulse">{checkStatusText}</p>
                  </div>
                  <button
                     onClick={handleManualCheck}
                     className="text-xs text-[#6366F1] font-bold underline hover:text-[#5558dd] mt-1"
                  >
                     Já fiz o pagamento, verificar agora
                  </button>
               </div>

               {/* Summary */}
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">RESUMO</p>
                  </div>
                  {[
                     ['Valor', `R$ ${totalValue}`],
                     ['Nome', name],
                     ['CPF', cpf],
                     ['Passagens', selectedTickets.length],
                     ['ID Pix', paymentData?.['id-pix'] || paymentData?.id_pix || '-']
                  ].map(([label, val]) => (
                     <div key={label as string} className="flex justify-between items-center px-4 py-3 border-b border-slate-100 last:border-0">
                        <span className="text-slate-500 text-sm">{label}</span>
                        <span className="font-bold text-slate-800 text-sm text-right max-w-[60%] truncate">{val}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      );
   }

   // ═══════════════════════════════════════════════════════════
   // STEP 3 — Pagamento PIX (Manual Fallback)
   // ═══════════════════════════════════════════════════════════
   if (step === 3) {
      // ... Same Step 3 content ...
      const keyTypeLabel: Record<string, string> = {
         cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', phone: 'Telefone', random: 'Chave Aleatória',
      };
      return (
         <div className="bg-slate-50 min-h-screen font-sans pb-10">
            <NotificationToast />
            <Navbar />
            <div className="p-4 space-y-5 max-w-md mx-auto">
               <div className="flex flex-col items-center pt-2 pb-1">
                  <CountdownTimer minutes={paymentMinutes} createdAt={purchaseCreatedAt} onExpire={handlePurchaseExpired} />
                  <h2 className="text-2xl font-black text-slate-900 mt-4">Pagamento manual</h2>
                  <p className="text-slate-400 text-sm mt-1">Finalize o pagamento para garantir suas poltronas</p>
               </div>
               {/* ... (Rest of manual pix UI) ... */}
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3.5 border-b border-slate-100">
                     <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">TIPO</span>
                     <span className="font-bold text-slate-800 text-sm">{keyTypeLabel[pixConfig?.keyType || ''] || pixConfig?.keyType || 'PIX'}</span>
                  </div>
                  <button onClick={handleCopyPix} className="w-full flex justify-between items-center px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                     <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">CHAVE</span>
                     <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{pixConfig?.pixKey || '—'}</span>
                        <span className={`material-icons-outlined text-sm ${copied ? 'text-emerald-500' : 'text-slate-400'}`}>{copied ? 'check_circle' : 'content_copy'}</span>
                     </div>
                  </button>
                  <div className="flex justify-between items-center px-4 py-3.5">
                     <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">VALOR</span>
                     <span className="text-[#6366F1] font-black text-lg">R$ {totalValue}</span>
                  </div>
               </div>

               {/* Upload box */}
               {!proofPreview ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm p-8 flex flex-col items-center gap-3">
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        className="hidden"
                     />
                     <div className="w-12 h-12 bg-[#6366F1]/10 rounded-full flex items-center justify-center">
                        <span className="material-icons-outlined text-[#6366F1] text-2xl">upload</span>
                     </div>
                     <p className="font-bold text-slate-700 text-sm">Anexe o comprovante PIX aqui</p>
                     <p className="text-slate-400 text-xs text-center px-4">Tire um print ou selecione o arquivo do comprovante</p>
                     <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 bg-[#6366F1] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#5558dd] transition-colors"
                     >
                        Selecionar arquivo
                     </button>
                  </div>
               ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                     <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <p className="font-bold text-slate-700 text-sm">Preview do comprovante</p>
                        <button
                           onClick={() => { setProofPreview(null); setProofFile(null); }}
                           className="text-rose-500 text-xs font-bold underline"
                        >
                           Alterar
                        </button>
                     </div>
                     <div className="p-4 flex flex-col items-center gap-4">
                        <img src={proofPreview} alt="Preview" className="max-h-48 rounded-lg shadow-sm" />
                        <button
                           onClick={handleSendProof}
                           disabled={uploading}
                           className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                        >
                           <span className="material-icons-round">{uploading ? 'sync' : 'send'}</span>
                           {uploading ? 'Enviando...' : 'Enviar comprovante'}
                        </button>
                     </div>
                  </div>
               )}

               {/* Summary */}
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">RESUMO</p>
                  </div>
                  {[
                     ['Valor', `R$ ${totalValue}`],
                     ['Nome', name],
                     ['Telefone', maskPhone(phone)],
                     ['Passagens', selectedTickets.length],
                  ].map(([label, val]) => (
                     <div key={label as string} className="flex justify-between items-center px-4 py-3 border-b border-slate-100 last:border-0">
                        <span className="text-slate-500 text-sm">{label}</span>
                        <span className="font-bold text-slate-800 text-sm text-right max-w-[60%]">{val}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      );
   }

   // Steps 4, 5, 6 are identical to previous version, just re-included for completeness
   if (step === 4) {
      return (
         <div className="bg-slate-50 min-h-screen font-sans pb-10">
            <NotificationToast />
            <Navbar />
            <div className="p-4 space-y-5 max-w-md mx-auto">
               <div className="flex flex-col items-center pt-4 pb-2">
                  <CountdownTimer minutes={paymentMinutes} />
                  <h2 className="text-2xl font-black text-slate-900 mt-4">Pagamento manual</h2>
                  <p className="text-slate-400 text-sm mt-1">Finalize o pagamento para garantir suas poltronas</p>
               </div>
               <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                  <span className="material-icons-round text-emerald-500 text-xl">check_circle</span>
                  <div>
                     <p className="font-bold text-emerald-700 text-sm">Comprovante enviado</p>
                     <p className="text-emerald-600 text-xs mt-0.5">O organizador irá analisar em breve.</p>
                  </div>
               </div>
            </div>
         </div>
      );
   }

   if (step === 5) {
      return (
         <div className="bg-[#121212] min-h-screen font-sans pb-10 flex flex-col items-center justify-center p-4">
            <NotificationToast />
            <div className="w-full max-w-md bg-[#1E1E1E] rounded-3xl border border-red-900/30 p-6 text-center relative overflow-hidden shadow-2xl">
               <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none" />
               <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-red-500/30 rotate-3">
                  <span className="material-icons-round text-white text-4xl">close</span>
               </div>
               <h2 className="text-2xl font-black text-white mb-2">Compra cancelada</h2>
               <p className="text-slate-400 text-sm mb-8">O pagamento foi cancelado ou expirou</p>
               <button
                  onClick={() => {
                     setStep(0);
                     setSelectedTickets([]);
                     setCurrentPurchaseId(null);
                     window.history.pushState({}, '', window.location.pathname);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
               >
                  Comprar novamente
               </button>
            </div>
         </div>
      );
   }

   if (step === 6) {
      console.log('[DEBUG] Step 6 renderizado! Confetti será exibido.');

      return (
         <div className="bg-[#0f172a] min-h-screen font-sans flex flex-col items-center justify-center p-4 relative">
            <NotificationToast />
            <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl relative z-10">
               {/* Header Verde */}
               <div className="bg-emerald-500 p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg animate-bounce">
                     <span className="material-icons-round text-emerald-500 text-5xl">check</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-1">Pagamento Aprovado!</h2>
                  <p className="text-emerald-100 text-sm font-medium">Sua participação está confirmada</p>
               </div>

               {/* Detalhes do Pedido */}
               <div className="p-6 space-y-6">
                  <div className="text-center">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">PARTICIPANTE</p>
                     <p className="text-slate-800 font-bold text-lg">{name}</p>
                  </div>

                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                     <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">DATA</p>
                        <p className="text-slate-700 font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">VALOR TOTAL</p>
                        <p className="text-emerald-600 font-black text-xl">R$ {totalValue}</p>
                     </div>
                  </div>

                  <div>
                     <div className="flex justify-between items-end mb-3">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">COTAS ADQUIRIDAS ({selectedTickets.length})</p>
                     </div>
                     <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {selectedTickets.map(ticket => (
                           <span key={ticket} className="bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-lg text-sm border border-slate-200">
                              {String(ticket).padStart(2, '0')}
                           </span>
                        ))}
                     </div>
                  </div>

                  <button
                     onClick={() => window.location.reload()}
                     className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                  >
                     <span className="material-icons-round">shopping_bag</span>
                     Comprar mais poltronas
                  </button>
               </div>
            </div>

            <p className="text-slate-500 text-xs mt-6 text-center max-w-xs">
               Você receberá o comprovante também no seu e-mail cadastrado. Boa sorte!
            </p>
         </div>
      );
   }

   return null;
}

function PhoneConsultModal({
   isOpen,
   onClose,
   phone,
   onPhoneChange,
   onPhoneBlur,
   customer,
   history,
   loading,
   onFinalizePurchase
}: {
   isOpen: boolean;
   onClose: () => void;
   phone: string;
   onPhoneChange: (v: string) => void;
   onPhoneBlur: () => void;
   customer: any;
   history: any[];
   loading: boolean;
   onFinalizePurchase: (purchaseId: string) => void;
}) {
   const [viewMode, setViewMode] = useState<'search' | 'register'>('search');

   // Registration State
   const [regName, setRegName] = useState('');
   const [regPhone, setRegPhone] = useState('');
   const [regCpf, setRegCpf] = useState('');
   const [regLoading, setRegLoading] = useState(false);

   // Reset state on open
   useEffect(() => {
      if (isOpen) {
         setViewMode('search');
         setRegName('');
         setRegPhone('');
         setRegCpf('');
      }
   }, [isOpen]);

   const handleRegister = async () => {
      if (!regName.trim() || !isPhoneComplete(regPhone) || !validateCpf(regCpf)) {
         alert('Preencha todos os dados corretamente.');
         return;
      }

      setRegLoading(true);
      try {
         const cleanPhone = regPhone.replace(/\D/g, '');
         const cleanCpf = regCpf.replace(/\D/g, '');

         /* REMOVIDO PARA PERMITIR DUPLICIDADE DE TELEFONE
         // Verificar se telefone já existe
         const { data: phoneCheck } = await supabase
            .from('clientes')
            .select('id')
            .eq('phone', cleanPhone)
            .maybeSingle();
            
         if (phoneCheck) {
            alert('Este telefone já possui cadastro.');
            setRegLoading(false);
            return;
         }
         */

         // Verificar CPF
         const { data: cpfCheck } = await supabase
            .from('clientes')
            .select('id')
            .eq('cpf', cleanCpf)
            .maybeSingle();

         if (cpfCheck) {
            alert('Este CPF já está vinculado a outra conta.');
            setRegLoading(false);
            return;
         }

         const { data, error } = await supabase
            .from('clientes')
            .insert({
               name: regName.toUpperCase(),
               phone: cleanPhone,
               cpf: cleanCpf
            })
            .select()
            .single();

         if (error) throw error;

         alert('Cadastro realizado com sucesso!');

         // Simulate search with new data
         onPhoneChange(cleanPhone); // Update main phone state to trigger search logic if needed
         // However, main component handles search logic via onPhoneBlur or similar.
         // Let's force a "found" state by calling onPhoneChange then onPhoneBlur?
         // Better: Just reset view and let user search, or auto-search.

         setViewMode('search');
         onPhoneChange(formatPhone(cleanPhone));
         // We need to trigger the search in parent. The parent uses onPhoneBlur.
         // Let's manually trigger it or ask user to click search.

      } catch (err) {
         console.error('Erro no cadastro:', err);
         alert('Erro ao cadastrar. Verifique se o telefone já existe.');
      } finally {
         setRegLoading(false);
      }
   };

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
         <div
            className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
         >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800">
                  {viewMode === 'search' ? 'Consultar Compras' : 'Cadastrar Cliente'}
               </h3>
               <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                  <span className="material-icons-round text-slate-500">close</span>
               </button>
            </div>

            {viewMode === 'search' ? (
               <>
                  <div className="p-4 border-b border-slate-100 space-y-3">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                           Informe seu Telefone ou CPF
                        </label>
                        <div className="flex gap-2">
                           <input
                              type="tel"
                              inputMode="numeric"
                              placeholder="(99) 99999-9999 ou CPF"
                              value={phone}
                              onChange={(e) => {
                                 const v = e.target.value;
                                 const clean = v.replace(/\D/g, '');

                                 // Smart formatting
                                 if (v.includes('.') && !v.includes('(')) {
                                    onPhoneChange(formatCpf(v));
                                 } else if (clean.length === 11 && validateCpf(clean)) {
                                    onPhoneChange(formatCpf(v));
                                 } else {
                                    onPhoneChange(formatPhone(v));
                                 }
                              }}
                              className="flex-1 border rounded-xl px-4 py-3 text-slate-800 text-base focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none placeholder-slate-300 border-slate-200"
                           />
                           <button
                              onClick={onPhoneBlur}
                              disabled={loading}
                              className="bg-[#6366F1] text-white px-4 rounded-xl font-bold hover:bg-[#5558dd] transition-colors disabled:opacity-50"
                           >
                              <span className="material-icons-round">search</span>
                           </button>
                        </div>
                     </div>
                  </div>

                  <div className="overflow-y-auto p-4 space-y-3 flex-1">
                     {loading && (
                        <div className="text-center py-8">
                           <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                           <p className="text-slate-500 text-sm">Consultando...</p>
                        </div>
                     )}

                     {!loading && !customer && phone.length > 5 && (
                        <div className="text-center py-8">
                           <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <span className="material-icons-round text-slate-300 text-3xl">person_off</span>
                           </div>
                           <p className="text-slate-800 font-bold mb-1">Cliente não encontrado</p>
                           <p className="text-slate-500 text-sm mb-4">Gostaria de realizar o cadastro?</p>
                           <button
                              onClick={() => {
                                 setViewMode('register');
                                 const clean = phone.replace(/\D/g, '');
                                 if (validateCpf(clean)) {
                                    setRegCpf(formatCpf(clean));
                                    setRegPhone('');
                                 } else {
                                    setRegPhone(formatPhone(clean));
                                    setRegCpf('');
                                 }
                              }}
                              className="bg-[#6366F1] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#5558dd] transition-colors text-sm shadow-lg shadow-indigo-500/20"
                           >
                              Cadastrar Agora
                           </button>
                        </div>
                     )}

                     {!loading && customer && history.length === 0 && (
                        <div className="text-center py-8">
                           <span className="material-icons-round text-slate-300 text-4xl mb-2">receipt_long</span>
                           <p className="text-slate-500 text-sm">Nenhuma compra encontrada nesta campanha</p>
                        </div>
                     )}

                     {!loading && customer && history.length > 0 && (
                        <div className="space-y-3">
                           <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-slate-100">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-[#6366F1]/10 rounded-full flex items-center justify-center text-[#6366F1] font-bold">
                                    {customer.name.charAt(0)}
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-slate-800">{customer.name}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-2">
                                       <span>{maskPhone(customer.phone)}</span>
                                       {customer.cpf && <span className="w-1 h-1 bg-slate-300 rounded-full"></span>}
                                       {customer.cpf && <span>CPF: ***.{customer.cpf.slice(4, 7)}***-**</span>}
                                    </p>
                                 </div>
                              </div>
                           </div>

                           {history.map((item) => (
                              <div key={item.id} className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition-colors">
                                 <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                       item.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                          'bg-red-100 text-red-600'
                                       }`}>
                                       {item.status === 'approved' ? 'Aprovado' : item.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                       {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                 </div>
                                 {item.trip_date && (
                                    <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg w-fit">
                                       <span className="material-icons-round text-xs">event</span>
                                       VIAGEM: {new Date(item.trip_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </div>
                                 )}
                                 <div className="flex justify-between items-end">
                                    <div>
                                       <p className="text-xs text-slate-500 mb-1">Poltronas:</p>
                                       <div className="flex flex-wrap gap-1">
                                          {item.tickets.map((t: number) => (
                                             <span key={t} className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                {String(t).padStart(2, '0')}
                                             </span>
                                          ))}
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <p className="font-bold text-slate-700 text-sm">
                                          R$ {item.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                       </p>
                                       {item.status === 'pending' && (
                                          <button
                                             onClick={() => onFinalizePurchase(item.id)}
                                             className="text-xs bg-[#6366F1] text-white px-2 py-1 rounded mt-1 hover:bg-[#5558dd] transition-colors"
                                          >
                                             Finalizar
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </>
            ) : (
               <div className="p-4 space-y-4">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome completo</label>
                     <input
                        type="text"
                        placeholder="Digite seu nome"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value.toUpperCase())}
                        className="w-full border rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#6366F1] outline-none border-slate-200 uppercase"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1.5">Telefone (WhatsApp)</label>
                     <input
                        type="tel"
                        placeholder="(99) 99999-9999"
                        value={regPhone}
                        onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                        className="w-full border rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#6366F1] outline-none border-slate-200"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1.5">CPF</label>
                     <input
                        type="tel"
                        placeholder="000.000.000-00"
                        value={regCpf}
                        onChange={(e) => setRegCpf(formatCpf(e.target.value))}
                        className="w-full border rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#6366F1] outline-none border-slate-200"
                     />
                  </div>
                  <div className="flex gap-3 pt-2">
                     <button
                        onClick={() => setViewMode('search')}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors"
                     >
                        Cancelar
                     </button>
                     <button
                        onClick={handleRegister}
                        disabled={regLoading}
                        className="flex-1 bg-[#6366F1] hover:bg-[#5558dd] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                     >
                        {regLoading && <span className="material-icons-round animate-spin text-sm">sync</span>}
                        Cadastrar
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}
