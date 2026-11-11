import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import CallView from './components/CallView';
import StatusView from './components/StatusView';
import ProfileModal from './components/ProfileModal';
import { api } from './api/client';
import { Search, Plus, MessageSquare } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(api.user);
  const [activeView, setActiveView] = useState('chats'); // 'chats' | 'status' | 'meet' | 'firecasts' | 'space'
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCallSession, setActiveCallSession] = useState(null); // { mode, peer, title, code }
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Authentication & Initial Data Fetch
  useEffect(() => {
    if (!api.token) {
      setLoading(false);
      return;
    }

    api.fetch('/api/me').then(user => {
      setCurrentUser(user);
      api.setSession(api.token, user);
      return api.fetch('/api/chats');
    }).then(chatList => {
      setChats(chatList || []);
      if (chatList && chatList.length > 0) {
        setActiveChatId(chatList[0].id);
      }
      setLoading(false);
    }).catch(err => {
      console.warn('Auth check error:', err);
      api.setSession(null, null);
      setCurrentUser(null);
      setLoading(false);
    });

    const unsub = api.onWSMessage((data) => {
      if (data.type === 'call:start') {
        // Incoming call received
        if (window.fireuppNative?.notify) {
          window.fireuppNative.notify({
            title: `Incoming ${data.mode === 'video' ? 'Video' : 'Voice'} Call`,
            body: `${data.title || 'Someone'} is calling you on Fireupp`
          });
        }
      }
    });

    return unsub;
  }, []);

  const handleStartCall = (chat, mode) => {
    setActiveCallSession({
      mode,
      chatId: chat.id,
      title: `${chat.name} (${mode === 'video' ? 'Video' : 'Voice'})`,
      peer: chat.peer || { name: chat.name },
      code: `call-${chat.id.slice(0, 4)}-${Math.random().toString(36).slice(2, 6)}`
    });
  };

  const handleEndCall = () => {
    setActiveCallSession(null);
  };

  const handleLogout = () => {
    api.setSession(null, null);
    setCurrentUser(null);
    setIsProfileOpen(false);
  };

  const filteredChats = chats.filter(c => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (c.name || '').toLowerCase().includes(q);
  });

  const activeChat = chats.find(c => c.id === activeChatId);

  // ---------------- Simple Login Screen if not logged in ----------------
  if (!currentUser && !loading) {
    return (
      <div className="flex flex-col h-screen w-screen bg-dark-950 text-white overflow-hidden">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
          <div className="w-full max-w-sm rounded-3xl bg-dark-900 border border-white/10 p-8 flex flex-col items-center gap-6 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand to-orange-400 flex items-center justify-center text-3xl shadow-[0_4px_24px_rgba(255,87,34,0.5)]">
              🔥
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-white">Welcome to Fireupp</h2>
              <p className="text-xs text-white/50 mt-1">Ultra-fast native messaging &amp; calling</p>
            </div>

            <button
              onClick={async () => {
                // Auto sign in or launch browser auth
                try {
                  const res = await api.fetch('/api/auth/demo-login', { method: 'POST' }).catch(() => null);
                  if (res && res.token && res.user) {
                    api.setSession(res.token, res.user);
                    setCurrentUser(res.user);
                    const chatList = await api.fetch('/api/chats').catch(() => []);
                    setChats(chatList);
                    if (chatList.length > 0) setActiveChatId(chatList[0].id);
                  } else {
                    // Open browser for full Firebase Google Auth
                    window.open('https://fireupp.up.railway.app');
                  }
                } catch (e) {
                  window.open('https://fireupp.up.railway.app');
                }
              }}
              className="w-full py-3 rounded-2xl bg-brand hover:bg-brand-hover text-white font-bold text-sm shadow-[0_4px_20px_rgba(255,87,34,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign In to Fireupp 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-950 text-white overflow-hidden select-none">
      {/* Native Discord-style Frameless Titlebar */}
      <TitleBar />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Leftmost Icon Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          user={currentUser}
          onOpenProfile={() => setIsProfileOpen(true)}
          onLogout={handleLogout}
        />

        {/* View Switcher */}
        {activeView === 'status' ? (
          <StatusView currentUser={currentUser} />
        ) : (
          <>
            {/* Conversation List Column */}
            <div className="w-80 h-full bg-dark-900 border-r border-white/[0.08] flex flex-col flex-shrink-0">
              {/* Header & Search */}
              <div className="p-4 border-b border-white/[0.08] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-white">Messages</h2>
                  <button className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-950 border border-white/10 text-xs text-white">
                  <Search className="w-3.5 h-3.5 text-white/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search conversations..."
                    className="flex-1 bg-transparent focus:outline-none placeholder:text-white/30 text-xs"
                  />
                </div>
              </div>

              {/* Chat list items */}
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                {filteredChats.map(c => {
                  const isSelected = c.id === activeChatId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveChatId(c.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-brand/20 to-orange-500/10 border border-brand/30 text-white'
                          : 'hover:bg-white/[0.05] text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-brand to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md flex-shrink-0">
                        {c.name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-white truncate">{c.name}</span>
                          <span className="text-[10px] text-white/40">12:30</span>
                        </div>
                        <p className="text-[11px] text-white/50 truncate">
                          {c.lastMessage?.body?.text || 'Encrypted conversation'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Chat Conversation View */}
            <ChatView
              activeChat={activeChat}
              currentUser={currentUser}
              onStartCall={handleStartCall}
              onOpenStoryForUser={(uid) => {
                setActiveView('status');
              }}
            />
          </>
        )}

        {/* Live Call View (Full Screen or Floating Google Meet PiP) */}
        {activeCallSession && (
          <CallView
            callSession={activeCallSession}
            onEndCall={handleEndCall}
          />
        )}
      </div>

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={u => setCurrentUser(u)}
        onLogout={handleLogout}
      />
    </div>
  );
}
