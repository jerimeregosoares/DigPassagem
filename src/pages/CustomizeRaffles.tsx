import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function CustomizeRaffles() {
  const [activeTab, setActiveTab] = useState<'colors' | 'logo'>('colors');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light');
  const [selectedColor, setSelectedColor] = useState<string>('#6366F1');

  const colors = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#EAB308', // Yellow
    '#84CC16', // Lime
    '#22C55E', // Green
    '#10B981', // Emerald
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#A855F7', // Purple
    '#D946EF', // Fuchsia
    '#EC4899', // Pink
    '#F43F5E', // Rose
  ];

  return (
    <div className="bg-[#F9FAFB] dark:bg-[#121212] text-slate-900 dark:text-slate-100 min-h-screen font-sans flex">
      {/* Sidebar for Desktop */}
      <div className="hidden lg:block h-screen sticky top-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="h-16 w-full bg-[#F9FAFB] dark:bg-[#121212] sticky top-0 z-40 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 lg:border-none">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">Dig</span>
            </div>
            <span className="text-[#6366F1] font-bold text-sm hidden sm:block">Passagem</span>
          </div>
          
          {/* Desktop Spacer */}
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
          
          {/* Tabs */}
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => setActiveTab('colors')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'colors' 
                  ? 'bg-[#6366F1]/10 text-[#6366F1]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Cores e tema
            </button>
            <button 
              onClick={() => setActiveTab('logo')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'logo' 
                  ? 'bg-[#6366F1]/10 text-[#6366F1]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Sua logo
            </button>
            {/* Domínios tab removed as requested */}
          </div>

          <div className="bg-[#1E1E1E] border border-slate-800 rounded-xl p-6 min-h-[500px]">
            
            {activeTab === 'colors' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Cor de tema</h2>
                  <p className="text-slate-400 text-sm mb-4">Selecione um tema para deixar sua passagem ainda mais elegante</p>
                  
                  <div className="flex gap-4">
                    {/* Light Theme Option */}
                    <div 
                      onClick={() => setSelectedTheme('light')}
                      className={`cursor-pointer group ${selectedTheme === 'light' ? 'ring-2 ring-[#6366F1]' : ''} rounded-xl`}
                    >
                      <div className="w-48 h-32 bg-[#2d2d2d] rounded-xl p-2 flex flex-col gap-2 relative overflow-hidden">
                        <div className="w-full h-full bg-white rounded-lg p-2 flex flex-col gap-1.5">
                          <div className="w-1/2 h-2 bg-[#6366F1] rounded-full"></div>
                          <div className="w-3/4 h-1.5 bg-slate-200 rounded-full"></div>
                          <div className="flex gap-1 mt-1">
                            <div className="w-4 h-4 rounded-full bg-[#6366F1]"></div>
                            <div className="flex-1 h-4 bg-slate-100 rounded"></div>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded-full bg-[#6366F1]"></div>
                            <div className="flex-1 h-4 bg-slate-100 rounded"></div>
                          </div>
                        </div>
                        {selectedTheme === 'light' && (
                          <div className="absolute inset-0 border-2 border-[#6366F1] rounded-xl pointer-events-none"></div>
                        )}
                      </div>
                      <p className="text-center text-sm font-medium text-slate-300 mt-2">Claro</p>
                    </div>

                    {/* Dark Theme Option */}
                    <div 
                      onClick={() => setSelectedTheme('dark')}
                      className={`cursor-pointer group ${selectedTheme === 'dark' ? 'ring-2 ring-[#6366F1]' : ''} rounded-xl`}
                    >
                      <div className="w-48 h-32 bg-[#2d2d2d] rounded-xl p-2 flex flex-col gap-2 relative overflow-hidden">
                        <div className="w-full h-full bg-[#121212] rounded-lg p-2 flex flex-col gap-1.5">
                          <div className="w-1/2 h-2 bg-[#6366F1] rounded-full"></div>
                          <div className="w-3/4 h-1.5 bg-slate-800 rounded-full"></div>
                          <div className="flex gap-1 mt-1">
                            <div className="w-4 h-4 rounded-full bg-[#6366F1]"></div>
                            <div className="flex-1 h-4 bg-slate-800 rounded"></div>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded-full bg-[#6366F1]"></div>
                            <div className="flex-1 h-4 bg-slate-800 rounded"></div>
                          </div>
                        </div>
                        {selectedTheme === 'dark' && (
                          <div className="absolute inset-0 border-2 border-[#6366F1] rounded-xl pointer-events-none"></div>
                        )}
                      </div>
                      <p className="text-center text-sm font-medium text-slate-300 mt-2">Escuro</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Cor principal</h2>
                  <p className="text-slate-400 text-sm mb-4">A cor selecionada será aplicada a textos e detalhes da sua passagem, <span className="font-bold text-white">não recomendamos branco ou preto</span></p>
                  
                  <div className="flex flex-wrap gap-3 items-center">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1E1E1E] scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button className="w-8 h-8 rounded-full bg-[#6366F1] flex items-center justify-center text-white hover:bg-[#5558dd]">
                      <span className="material-icons-round text-sm">tune</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button className="w-full bg-transparent border border-slate-700 hover:border-slate-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                    Salvar alterações
                    <span className="material-icons-round text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'logo' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Sua logo</h2>
                  <p className="text-slate-400 text-sm mb-6">Usaremos sua logo para personalizar sua campanha e os icones da página</p>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-[#2d2d2d] rounded-xl flex items-center justify-center border border-slate-700">
                      <span className="material-icons-outlined text-slate-500 text-3xl">camera_alt</span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base">Logo & Icone da página</h3>
                      <p className="text-slate-400 text-sm mt-1">Recomendamos as dimenções: <span className="text-white font-medium">largura:100px e altura:100px</span></p>
                      
                      <button className="mt-4 bg-[#6366F1] hover:bg-[#5558dd] text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                        Adicionar
                        <span className="material-icons-outlined text-sm">add_photo_alternate</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
