import React from 'react';
import { MessageSquare, CircleDashed, Video, Radio, LayoutGrid, Settings, LogOut, Sun, Moon } from 'lucide-react';

export default function Sidebar({ activeView, setActiveView, user, onOpenProfile, onLogout }) {
  const navItems = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: 0 },
    { id: 'status', label: 'FireStatus', icon: CircleDashed },
    { id: 'meet', label: 'FireMeet', icon: Video },
    { id: 'firecasts', label: 'FireCasts', icon: Radio },
    { id: 'space', label: 'FireSpace', icon: LayoutGrid }
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <aside className="w-[72px] h-full bg-dark-950 border-r border-white/[0.07] flex flex-col items-center py-4 justify-between select-none z-20 flex-shrink-0">
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={() => setActiveView('chats')}
          className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center p-2 shadow-[0_4px_20px_rgba(124,92,255,0.45)] hover:scale-105 active:scale-95 transition-all overflow-hidden"
          title="Zovio"
        >
          <img src="/zovio_logo.png" alt="Zovio" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = '/icon.png'; }} />
        </button>

        {/* Navigation Icons */}
        <nav className="flex flex-col gap-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`relative group w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-brand text-white shadow-[0_4px_16px_rgba(255,87,34,0.35)]'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.08]'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-brand text-white rounded-full border-2 border-dark-950">
                    {item.badge}
                  </span>
                )}
                {/* Active side indicator */}
                {isActive && (
                  <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-r-full shadow-[0_0_8px_#fff]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile & Settings */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onOpenProfile}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Avatar */}
        <button
          onClick={onOpenProfile}
          className="relative group w-11 h-11 rounded-full p-0.5 border border-white/20 hover:border-brand transition-all cursor-pointer"
          title={user?.name || 'My Profile'}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: user?.avatarColor || '#ff5722' }}
            >
              {getInitials(user?.name)}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-dark-950" />
        </button>
      </div>
    </aside>
  );
}
