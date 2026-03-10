import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { usePayment } from '../context/PaymentContext';

export default function PaymentMethods() {
  const navigate = useNavigate();
  const { pixManual, setPixManual, n8nConfig, setN8NConfig, activeMethod, setActiveMethod } = usePayment();
  
  const [isPixDrawerOpen, setIsPixDrawerOpen] = useState(false);
  const [isN8NDrawerOpen, setIsN8NDrawerOpen] = useState(false);

  // Form States
  const [pixForm, setPixForm] = useState({
    keyType: '',
    pixKey: '',
    accountHolder: ''
  });

  const [n8nForm, setN8NForm] = useState({
    createUrl: '',
    checkUrl: ''
  });

  // Load initial data
  useEffect(() => {
    setPixForm({
      keyType: pixManual.keyType || '',
      pixKey: pixManual.pixKey || '',
      accountHolder: pixManual.accountHolder || ''
    });
  }, [pixManual]);

  useEffect(() => {
    setN8NForm({
      createUrl: n8nConfig.createUrl || '',
      checkUrl: n8nConfig.checkUrl || ''
    });
  }, [n8nConfig]);

  const gateways = [
    {
      id: 'n8n',
      name: 'N8N PagBank',
      logo: (
        <div className="flex items-center gap-1 font-bold text-xl text-white">
          <span className="material-icons-round text-[#FF6B6B]">bolt</span>
          <span className="text-white">N8N</span>
          <span className="text-[10px] uppercase text-slate-400 mt-1 ml-1">PagBank</span>
        </div>
      ),
      status: n8nConfig.isActive ? 'Ativo' : (n8nConfig.createUrl ? 'Configurado' : 'Não configurado'),
      isActive: n8nConfig.isActive,
      isConfigured: !!n8nConfig.createUrl,
      description: 'Pagamento automático via N8N e PagBank',
      onClick: () => setIsN8NDrawerOpen(true)
    },
    {
      id: 'pix',
      name: 'PIX Manual',
      logo: (
        <div className="flex items-center gap-1 font-bold text-xl text-white">
          <span className="material-icons-round text-[#32BCAD]">pix</span>
          <span className="text-slate-300">pix</span>
        </div>
      ),
      status: pixManual.isActive ? 'Ativo' : (pixManual.isConfigured ? 'Configurado' : 'Não configurado'),
      isActive: pixManual.isActive,
      isConfigured: pixManual.isConfigured,
      description: 'Receba via PIX com aprovação manual',
      onClick: () => setIsPixDrawerOpen(true),
    },
    {
      id: 'efi',
      name: 'efi BANK',
      logo: (
        <div className="flex items-center gap-1 font-bold text-xl text-white">
          <span>efi</span>
          <span className="text-[10px] uppercase text-slate-400 mt-1">BANK</span>
        </div>
      ),
      status: 'Não configurado',
      description: 'Gateway de pagamentos com baixa automática'
    },
    {
      id: 'pay2m',
      name: 'Pay2m',
      logo: (
        <div className="flex items-center gap-1 font-bold text-xl text-white">
          <span className="material-icons-round text-white">account_balance_wallet</span>
          <span>Pay2m</span>
        </div>
      ),
      status: 'Não configurado',
      description: 'Gateway de pagamentos com baixa automática'
    },
    {
      id: 'xgate',
      name: 'XGATE',
      logo: (
        <div className="font-black text-xl text-white tracking-widest border-2 border-white px-1">
          XGATE
        </div>
      ),
      status: 'Não configurado',
      description: 'Gateway de pagamentos com baixa automática'
    },
    {
      id: 'getpay',
      name: 'Getpay',
      logo: (
        <div className="flex items-center gap-1 font-bold text-xl text-white">
          <span className="text-green-500">$</span>
          <span>Getpay</span>
        </div>
      ),
      status: 'Não configurado',
      description: 'Gateway de pagamentos com baixa automática'
    },
    {
      id: 'fluxsis',
      name: 'FLUXSIS',
      logo: (
        <div className="font-bold text-xl text-slate-500">
          FLUX<span className="text-slate-300">SIS</span>
        </div>
      ),
      status: 'Não configurado',
      description: 'Gateway de pagamentos com baixa automática'
    }
  ];

  const handleSavePix = async () => {
    if (!pixForm.keyType || !pixForm.pixKey || !pixForm.accountHolder) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    await setPixManual({
      ...pixManual,
      ...pixForm,
      isConfigured: true
    });
    setIsPixDrawerOpen(false);
  };

  const handleSaveN8N = async () => {
    if (!n8nForm.createUrl) {
      alert('A URL do Webhook de Criação é obrigatória.');
      return;
    }
    await setN8NConfig({
      ...n8nConfig,
      ...n8nForm
    });
    setIsN8NDrawerOpen(false);
  };

  const toggleActive = async (method: 'pixManual' | 'n8n') => {
    if (activeMethod === method) {
        // Deactivate if already active
        await setActiveMethod(null);
    } else {
        // Activate
        if (method === 'n8n' && !n8nForm.createUrl && !n8nConfig.createUrl) {
            alert('Configure a URL do N8N antes de ativar.');
            return;
        }
        if (method === 'pixManual' && !pixForm.pixKey && !pixManual.pixKey) {
            alert('Configure a Chave Pix antes de ativar.');
            return;
        }
        await setActiveMethod(method);
    }
  };

  return (
    <div className="bg-[#F9FAFB] dark:bg-[#121212] text-slate-900 dark:text-slate-100 min-h-screen font-sans flex">
      {/* Sidebar for Desktop */}
      <div className="hidden lg:block h-screen sticky top-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-screen relative">
        {/* Header */}
        <div className="h-16 w-full bg-[#F9FAFB] dark:bg-[#121212] sticky top-0 z-40 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 lg:border-none">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">Dig</span>
            </div>
            <span className="text-[#6366F1] font-bold text-sm hidden sm:block">Passagem</span>
          </div>

          <div className="hidden lg:block"></div>

          <div className="flex items-center gap-4 ml-auto">
            <div className="relative">
              <span className="material-icons-outlined text-slate-500 dark:text-slate-400">notifications</span>
              <span className="absolute -top-1 -right-1 bg-[#6366F1] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#F9FAFB] dark:border-[#121212]">1</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1E1E1E] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800">
              <span className="material-icons-outlined text-sm">settings_input_component</span>
              <span className="text-xs font-medium">Sistema</span>
            </div>
          </div>
        </div>

        <main className="px-4 py-2 space-y-6 pb-24 lg:pb-8 lg:px-8 max-w-5xl w-full">

          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-slate-400 hover:text-white text-sm font-medium mb-4 bg-[#1E1E1E] px-3 py-1.5 rounded-lg w-fit border border-slate-800 transition-colors"
            >
              <span className="material-icons-round text-sm">arrow_back</span>
              Voltar
            </button>
            <h1 className="text-2xl font-bold mb-1">Métodos de Pagamento</h1>
            <p className="text-slate-400 text-sm">Clique em um card para configurar e ativar um novo método de pagamento</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gateways.map((gateway) => {
              return (
                <div
                  key={gateway.id}
                  onClick={gateway.onClick}
                  className={`bg-[#1E1E1E] border rounded-xl p-6 transition-all cursor-pointer group relative overflow-hidden ${
                      gateway.isActive 
                      ? 'border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                      : gateway.isConfigured 
                        ? 'border-slate-700 hover:border-slate-500' 
                        : 'border-slate-800 hover:border-[#6366F1]/50'
                  }`}
                >
                  {gateway.isActive && (
                      <div className="absolute top-0 right-0 bg-[#10B981] text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                          ATIVO
                      </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-8 flex items-center">
                      {gateway.logo}
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${
                        gateway.isActive ? 'text-[#10B981]' : gateway.isConfigured ? 'text-blue-400' : 'text-slate-500'
                    }`}>
                      <span className="material-icons-round text-sm">
                          {gateway.isActive ? 'check_circle' : gateway.isConfigured ? 'settings' : 'close'}
                      </span>
                      <span>{gateway.status}</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">
                    {gateway.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-xs mt-8">
            <span className="material-icons-outlined text-sm">info</span>
            <p>Apenas um método de pagamento pode estar ativo por vez.</p>
          </div>

        </main>

        {/* PIX Drawer */}
        {isPixDrawerOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50 transition-opacity backdrop-blur-sm"
              onClick={() => setIsPixDrawerOpen(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#121212] border-l border-slate-800 z-50 p-6 shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-in-out">
              <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">PIX Manual</h2>
                    <p className="text-slate-400 text-sm">Receba via PIX com aprovação manual</p>
                </div>
                <button 
                    onClick={() => toggleActive('pixManual')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        pixManual.isActive 
                        ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                >
                    {pixManual.isActive ? 'ATIVADO' : 'ATIVAR'}
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">Tipo de chave</label>
                  <div className="relative">
                    <select
                      value={pixForm.keyType}
                      onChange={(e) => setPixForm({ ...pixForm, keyType: e.target.value })}
                      className="w-full bg-[#181818] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none appearance-none"
                    >
                      <option value="" disabled>Selecione</option>
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave Aleatória</option>
                    </select>
                    <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">Chave pix</label>
                  <input
                    type="text"
                    placeholder="Digite sua chave pix"
                    value={pixForm.pixKey}
                    onChange={(e) => setPixForm({ ...pixForm, pixKey: e.target.value })}
                    className="w-full bg-[#181818] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none placeholder-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">Titular da conta</label>
                  <input
                    type="text"
                    placeholder="Digite o titular da conta"
                    value={pixForm.accountHolder}
                    onChange={(e) => setPixForm({ ...pixForm, accountHolder: e.target.value })}
                    className="w-full bg-[#181818] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none placeholder-slate-500"
                  />
                </div>

                <div className="bg-[#1E1E1E] border border-[#6366F1]/30 rounded-xl p-4 space-y-4">
                    {/* Info box content same as before */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-[#6366F1]/20 p-1 rounded-full">
                      <span className="material-icons-round text-[#6366F1] text-sm">info</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-500 text-xs">Sem taxas - transferência direta para sua conta</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSavePix}
                  className="w-full bg-[#6366F1] hover:bg-[#5558dd] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-[#6366F1]/20 mt-8"
                >
                  Salvar Configuração
                  <span className="material-icons-round text-lg">save</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* N8N Drawer */}
        {isN8NDrawerOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50 transition-opacity backdrop-blur-sm"
              onClick={() => setIsN8NDrawerOpen(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#121212] border-l border-slate-800 z-50 p-6 shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-in-out">
              <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">N8N PagBank</h2>
                    <p className="text-slate-400 text-sm">Automação via Webhook</p>
                </div>
                <button 
                    onClick={() => toggleActive('n8n')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        n8nConfig.isActive 
                        ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                >
                    {n8nConfig.isActive ? 'ATIVADO' : 'ATIVAR'}
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">Webhook de Criação (Gerar Pix)</label>
                  <p className="text-xs text-slate-500 mb-1">URL do workflow N8N que gera o Pix no PagBank.</p>
                  <input
                    type="url"
                    placeholder="https://n8n.seudominio.com/webhook/..."
                    value={n8nForm.createUrl}
                    onChange={(e) => setN8NForm({ ...n8nForm, createUrl: e.target.value })}
                    className="w-full bg-[#181818] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent outline-none placeholder-slate-600 font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">Webhook de Consulta (Status)</label>
                  <p className="text-xs text-slate-500 mb-1">URL do workflow N8N que verifica o status.</p>
                  <input
                    type="url"
                    placeholder="https://n8n.seudominio.com/webhook/..."
                    value={n8nForm.checkUrl}
                    onChange={(e) => setN8NForm({ ...n8nForm, checkUrl: e.target.value })}
                    className="w-full bg-[#181818] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent outline-none placeholder-slate-600 font-mono text-xs"
                  />
                </div>

                <div className="bg-[#1E1E1E] border border-[#FF6B6B]/30 rounded-xl p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-[#FF6B6B]/20 p-1 rounded-full">
                      <span className="material-icons-round text-[#FF6B6B] text-sm">bolt</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-slate-200 font-medium text-sm">Automação Completa</h3>
                      <p className="text-slate-500 text-xs mt-1">O sistema enviará os dados do cliente para o N8N e aguardará o retorno com o QR Code. A baixa será automática via consulta.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveN8N}
                  className="w-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-[#FF6B6B]/20 mt-8"
                >
                  Salvar Configuração
                  <span className="material-icons-round text-lg">save</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}