import React, { useState, useEffect } from 'react';
import { Plus, X, Eye, Trash2, Send, Sparkles } from 'lucide-react';
import { api } from '../api/client';

export default function StatusView({ currentUser }) {
  const [statuses, setStatuses] = useState([]);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [bgColor, setBgColor] = useState('linear-gradient(135deg, #ff5722, #ff9800)');

  const gradients = [
    'linear-gradient(135deg, #ff5722, #ff9800)',
    'linear-gradient(135deg, #7c5cff, #ff5c8a)',
    'linear-gradient(135deg, #10b981, #06b6d4)',
    'linear-gradient(135deg, #8b5cf6, #ec4899)',
    '#121522'
  ];

  const loadStatuses = () => {
    api.fetch('/api/statuses').then(list => {
      setStatuses(list || []);
    }).catch(err => {
      console.warn('Failed to load statuses:', err);
    });
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const handlePostStory = async () => {
    if (!storyText.trim()) return;

    try {
      // Find any @mentions in the story text
      const mentionMatches = storyText.match(/@(\w+)/g) || [];
      const mentions = mentionMatches.map(m => m.slice(1).toLowerCase());

      const res = await api.fetch('/api/statuses', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'text',
          text: storyText,
          bg: bgColor,
          mentions
        })
      });

      // Dispatch mention notification cards to mentioned users' DMs
      if (mentions.length > 0) {
        for (const handle of mentions) {
          try {
            const users = await api.fetch(`/api/users/search?q=${encodeURIComponent(handle)}`).catch(() => []);
            const target = users[0];
            if (target && target.id !== currentUser.id) {
              const dmChat = await api.fetch('/api/chats', {
                method: 'POST',
                body: JSON.stringify({ type: 'dm', memberIds: [target.id] })
              });
              if (dmChat && dmChat.id) {
                await api.fetch(`/api/chats/${dmChat.id}/messages`, {
                  method: 'POST',
                  body: JSON.stringify({
                    kind: 'story-mention',
                    body: {
                      storyId: res.id,
                      authorName: currentUser.name,
                      authorId: currentUser.id,
                      text: storyText
                    }
                  })
                });
              }
            }
          } catch (e) {
            console.warn('Mention DM dispatch warning:', e);
          }
        }
      }

      setStoryText('');
      setIsCreating(false);
      loadStatuses();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 h-full bg-dark-950 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white">ZovioStatus</h2>
            <p className="text-xs text-white/50">24-hour stories, moments, and mentions</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand to-orange-500 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Story</span>
          </button>
        </div>

        {/* Stories Horizontal Tray */}
        <div className="flex items-center gap-4 py-4 overflow-x-auto">
          {/* Add my status button */}
          <div
            onClick={() => setIsCreating(true)}
            className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0"
          >
            <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-white/20 group-hover:border-brand flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-white/60 group-hover:text-brand" />
            </div>
            <span className="text-[11px] font-semibold text-white/80">Your Story</span>
          </div>

          {/* Existing statuses */}
          {statuses.map(st => (
            <div
              key={st.id}
              onClick={() => {
                setActiveStoryGroup([st]);
                setActiveStoryIndex(0);
              }}
              className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-brand via-orange-400 to-purple-600 shadow-md group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-dark-900 border-2 border-dark-950 flex items-center justify-center font-bold text-sm text-white">
                  {st.user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
              <span className="text-[11px] font-semibold text-white/90 truncate max-w-[70px]">
                {st.user?.name || 'User'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Create Story Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-dark-900 border border-white/10 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Create Story</h3>
              <button onClick={() => setIsCreating(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Story Canvas Preview */}
            <div
              style={{ background: bgColor }}
              className="w-full aspect-[9/14] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden"
            >
              <textarea
                value={storyText}
                onChange={e => setStoryText(e.target.value)}
                placeholder="What's happening? Type @username to mention..."
                rows={4}
                className="w-full bg-transparent text-white text-lg font-bold text-center placeholder:text-white/40 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Background Gradients */}
            <div className="flex items-center justify-center gap-2">
              {gradients.map((g, i) => (
                <button
                  key={i}
                  style={{ background: g }}
                  onClick={() => setBgColor(g)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    bgColor === g ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'
                  }`}
                />
              ))}
            </div>

            {/* Post button */}
            <button
              onClick={handlePostStory}
              disabled={!storyText.trim()}
              className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-40 font-bold text-xs text-white shadow-lg transition-all"
            >
              Share Story ✨
            </button>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStoryGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
          <div
            style={{ background: activeStoryGroup[activeStoryIndex]?.bg || 'linear-gradient(135deg, #ff5722, #ff9800)' }}
            className="w-full max-w-[380px] aspect-[9/16] rounded-2xl shadow-2xl relative flex flex-col justify-between p-6 overflow-hidden"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between text-white z-10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs">{activeStoryGroup[activeStoryIndex]?.user?.name || 'User'}</span>
                <span className="text-[10px] text-white/60">Story</span>
              </div>
              <button onClick={() => setActiveStoryGroup(null)} className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Story Text */}
            <div className="text-center text-white text-xl font-extrabold px-4 leading-relaxed z-10">
              {activeStoryGroup[activeStoryIndex]?.text}
            </div>

            {/* Bottom Views */}
            <div className="flex items-center justify-between text-white/80 text-xs z-10">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{(activeStoryGroup[activeStoryIndex]?.views || []).length} views</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
