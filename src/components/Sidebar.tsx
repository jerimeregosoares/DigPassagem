import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { 
      icon: 'confirmation_number', 
      label: 'Embarcações', 
      path: '/dashboard',
      specialColor: true 
    },
    { 
      icon: 'people_outline', 
      label: 'Afiliados', 
      path: '/affiliates', 
      badge: 'Novo' 
    },
    { 
      icon: 'account_balance_wallet', 
      label: 'Configure seu pix', 
      path: '/pix' 
    },
    { 
      icon: 'share', 
      label: 'Redes sociais', 
      path: '/social' 
    },
    { 
      icon: 'power', 
      label: 'Pixels e Analytics', 
      path: '/analytics' 
    },
    { 
      icon: 'palette', 
      label: 'Personalizar passagems', 
      path: '/customize' 
    },
    { 
      icon: 'person_outline', 
      label: 'Minha conta', 
      path: '/profile' 
    },
    { 
      icon: 'headset_mic', 
      label: 'Suporte e tutoriais', 
      path: '/support' 
    },
  ];

  return (
    <aside className="w-72 bg-[#121212] border-r border-[#2d2d2d] flex flex-col h-screen sticky top-0 overflow-hidden font-sans">
      {/* Profile Section */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
           <div className="relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-yellow-600">
             <img 
               src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6SJHdsPhKj8_L1JsU25Inph774gtAXYtUl668RoIT0B9x5e0cP96SVLYWO1aK171ylpwoqO0wYmprJxtPL0ebvMEfOeVe0t9dWHO55uYBfByLTpJd6qj_YSm12TZA7vKGbiAg6MwoW3cHXfbL3iqUYCR3r_0Z5iFhYo0DPxMqk6KKmH9EqvVGf_bDFLqpWYu9d-CWiVUfVWHxiY0SxJeUogYNPFqXHFDGXF1i645ToMwSr8I-fUNFyNzmxohc_rLasrSi48tjmLk" 
               alt="Profile" 
               className="w-full h-full rounded-full object-cover border-2 border-[#121212]"
               referrerPolicy="no-referrer"
             />
           </div>
           <div className="overflow-hidden">
             <h3 className="text-white font-bold text-base truncate">Jérime Rêgo</h3>
             <p className="text-slate-400 text-xs truncate">jerime.rego@gmail.c...</p>
           </div>
        </div>
        <div className="h-px bg-[#2d2d2d] w-full"></div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          
          // Styling logic based on the image
          let containerClasses = "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group relative";
          let iconClass = "material-icons-round text-[22px]";
          let textClass = "text-sm font-medium flex-1";
          
          if (isActive) {
            containerClasses += " bg-[#1e1b2e]";
            iconClass += " text-[#6366f1]";
            textClass += " text-[#6366f1]";
          } else if (item.specialColor) {
             // For "Embarcações" which is purple in the image but maybe not active background
             iconClass += " text-[#6366f1]";
             textClass += " text-[#6366f1]";
             containerClasses += " hover:bg-[#1e1e1e]";
          } else {
            iconClass += " text-slate-200 group-hover:text-white";
            textClass += " text-slate-200 group-hover:text-white";
            containerClasses += " hover:bg-[#1e1e1e]";
          }

          return (
            <Link 
              key={index} 
              to={item.path}
              className={containerClasses}
            >
              <span className={iconClass}>{item.icon}</span>
              <span className={textClass}>{item.label}</span>
              
              {item.badge && (
                <span className="bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 mt-auto mb-2">
        <Link to="/login" className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-[#1e1e1e] transition-colors group">
          <span className="material-icons-round text-[22px] text-[#6366f1] rotate-180">logout</span>
          <span className="text-sm font-medium text-[#6366f1]">Sair do app</span>
        </Link>
      </div>
    </aside>
  );
}
