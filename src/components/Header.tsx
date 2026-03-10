import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  return (
    <div className="h-16 w-full bg-[#F9FAFB] dark:bg-[#121212] sticky top-0 z-40 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 lg:border-none" onClick={() => isThemeOpen && setIsThemeOpen(false)}>
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
        
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsThemeOpen(!isThemeOpen); }}
            className="flex items-center gap-1 bg-slate-100 dark:bg-[#1E1E1E] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-[#2A2A2A] transition-colors"
          >
            <span className="material-icons-outlined text-sm">
              {theme === 'light' ? 'light_mode' : theme === 'dark' ? 'dark_mode' : 'settings_input_component'}
            </span>
            <span className="text-xs font-medium">
              {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}
            </span>
          </button>

          {/* Theme Dropdown */}
          {isThemeOpen && (
            <div className="absolute top-full right-0 mt-2 w-32 bg-[#181818] border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-1">
                <button
                  onClick={() => { setTheme('light'); setIsThemeOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${theme === 'light' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                >
                  <span className="material-icons-outlined text-sm">light_mode</span>
                  <span>Claro</span>
                </button>
                <button
                  onClick={() => { setTheme('dark'); setIsThemeOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${theme === 'dark' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                >
                  <span className="material-icons-outlined text-sm">dark_mode</span>
                  <span>Escuro</span>
                </button>
                <button
                  onClick={() => { setTheme('system'); setIsThemeOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${theme === 'system' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                >
                  <span className="material-icons-outlined text-sm">settings_input_component</span>
                  <span>Sistema</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
