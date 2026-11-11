import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Trash2, Reply, Smile, Paperclip, Lock, Check, CheckCheck } from 'lucide-react';
import { api } from '../api/client';

export default function ChatView({ activeChat, currentUser, onStartCall, onOpenStoryForUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [contextMenu, setContextMenu] = useState(null); // { x, y, message }
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load chat messages
  useEffect(() => {
    if (!activeChat) return;
    setLoading(true);

    api.fetch(`/api/chats/${activeChat.id}/messages`).then(list => {
      setMessages(list || []);
      setLoading(false);
    }).catch(err => {
      console.warn('Failed to load messages:', err);
      setLoading(false);
    });

    const unsub = api.onWSMessage((data) => {
      if (data.type === 'msg:new' && data.chatId === activeChat.id) {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'msg:delete' || data.type === 'msg:delete-for-everyone') {
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, deleted: true, deletedForEveryone: true } : m));
      } else if (data.type === 'msg:delete-for-me' && data.chatId === activeChat.id) {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      }
    });

    return unsub;
  }, [activeChat]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !activeChat) return;

    setText('');
    try {
      const res = await api.fetch(`/api/chats/${activeChat.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          kind: 'text',
          body: { text: trimmed }
        })
      });
      if (res && res.id) {
        setMessages(prev => [...prev, res]);
      }
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const handleDeleteForMe = async (msgId) => {
    setContextMenu(null);
    try {
      await api.fetch(`/api/messages/${msgId}/delete-for-me`, { method: 'POST' });
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleDeleteForEveryone = async (msgId) => {
    setContextMenu(null);
    try {
      await api.fetch(`/api/messages/${msgId}/delete-for-everyone`, { method: 'POST' });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted: true, deletedForEveryone: true } : m));
    } catch (err) {
      alert(err.message);
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-dark-950 text-white/40">
        <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-3xl mb-3 shadow-inner">
          💬
        </div>
        <p className="text-sm font-semibold">Select a conversation or start a new message</p>
      </div>
    );
  }

  const isDm = activeChat.type === 'dm';
  const peer = isDm ? (activeChat.peer || { name: activeChat.name, id: activeChat.peerId }) : { name: activeChat.name };

  return (
    <div className="flex-1 h-full flex flex-col bg-dark-950 overflow-hidden relative">
      {/* Chat Header */}
      <header className="h-16 px-6 border-b border-white/[0.08] flex items-center justify-between bg-dark-900/60 backdrop-blur-md z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand to-purple-600 flex items-center justify-center font-bold text-sm text-white shadow-md">
            {peer.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{peer.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            </h3>
            <span className="text-[11px] text-white/50">Online · End-to-End Encrypted</span>
          </div>
        </div>

        {/* Call Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onStartCall(activeChat, 'video')}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 hover:text-brand text-white/70 flex items-center justify-center transition-all"
            title="Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStartCall(activeChat, 'audio')}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 hover:text-brand text-white/70 flex items-center justify-center transition-all"
            title="Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
        {loading ? (
          <div className="m-auto text-xs text-white/40">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="m-auto text-center text-white/30 text-xs">
            <span className="text-2xl block mb-2">👋</span>
            Say hello to start the conversation!
          </div>
        ) : (
          messages.map(m => {
            const isMe = m.senderId === currentUser?.id;
            const plain = m.body || m._plain || {};
            const textContent = typeof plain === 'string' ? plain : (plain.text || '');
            const isStoryMention = m.kind === 'story-mention';

            return (
              <div
                key={m.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, message: m });
                }}
                className={`flex flex-col max-w-[65%] group ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
              >
                {/* Story Mention Card (Instagram Style) */}
                {isStoryMention ? (
                  <div
                    onClick={() => onOpenStoryForUser(plain.authorId || m.senderId)}
                    className="p-3 rounded-2xl bg-gradient-to-r from-brand/20 to-purple-600/20 border border-brand/30 hover:border-brand/60 cursor-pointer shadow-lg flex items-center gap-3 transition-all"
                  >
                    {plain.previewImg && (
                      <img src={plain.previewImg} alt="" className="w-12 h-16 rounded-lg object-cover shadow-sm" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🔥</span>
                        <span>Mentioned you in their story</span>
                      </div>
                      <div className="text-[11px] text-brand hover:underline mt-0.5">Tap to view story 📸</div>
                    </div>
                  </div>
                ) : m.deleted ? (
                  <div className="px-4 py-2.5 rounded-2xl text-xs italic text-white/40 bg-white/[0.04] border border-white/5">
                    🚫 This message was deleted
                  </div>
                ) : (
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-brand to-orange-500 text-white rounded-br-none'
                        : 'bg-dark-850 border border-white/10 text-white/95 rounded-bl-none'
                    }`}
                  >
                    {textContent}
                  </div>
                )}

                {/* Timestamp & Status */}
                <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-white/40 font-medium">
                  <span>{new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setContextMenu(null)} />
          <div
            style={{ left: `${Math.min(window.innerWidth - 180, contextMenu.x)}px`, top: `${Math.min(window.innerHeight - 120, contextMenu.y)}px` }}
            className="fixed z-40 w-44 rounded-xl bg-dark-900 border border-white/15 shadow-2xl p-1.5 flex flex-col gap-1 text-xs select-none"
          >
            <button
              onClick={() => handleDeleteForMe(contextMenu.message.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete for me</span>
            </button>

            {/* STRICT DM DELETE PERMISSION: Only message sender can delete for everyone in DMs! */}
            {(contextMenu.message.senderId === currentUser?.id || (activeChat.type !== 'dm' && activeChat.isAdmin)) && (
              <button
                onClick={() => handleDeleteForEveryone(contextMenu.message.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete for everyone</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Message Input Bar */}
      <form onSubmit={handleSend} className="p-4 bg-dark-900/60 border-t border-white/[0.08] flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-dark-950 border border-white/10 focus-within:border-brand transition-colors">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-white/30"
          />
        </div>

        <button
          type="submit"
          disabled={!text.trim()}
          className="w-11 h-11 rounded-2xl bg-brand hover:bg-brand-hover disabled:opacity-40 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
}
