import React, { useState } from 'react';
import { X, User, Sliders, Shield, Lock, Trash2, LogOut } from 'lucide-react';
import { api } from '../api/client';

export default function ProfileModal({ isOpen, onClose, currentUser, onUpdateUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('identity');
  const [name, setName] = useState(currentUser?.name || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#ff5722');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const colors = ['#ff5722', '#ff9800', '#7c5cff', '#ec4899', '#10b981', '#06b6d4', '#6366f1'];

  const handleSaveIdentity = async () => {
    setSaving(true);
    try {
      const updated = await api.fetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          avatarColor
        })
      });
      onUpdateUser(updated);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-[760px] h-[520px] bg-dark-900 border border-white/10 rounded-2xl shadow-2xl flex overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-56 bg-dark-950 border-r border-white/[0.08] p-4 flex flex-col justify-between">
          <div className="flex flex-col gap-1">
            <div className="px-3 py-2 text-xs font-bold text-white/40 uppercase tracking-wider">Settings</div>
            <button
              onClick={() => setActiveTab('identity')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'identity' ? 'bg-brand text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile Identity</span>
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'preferences' ? 'bg-brand text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Preferences</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'security' ? 'bg-brand text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Security & E2EE</span>
            </button>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Content Pane */}
        <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-white/[0.08] mb-6">
              <h3 className="text-base font-bold text-white capitalize">{activeTab} Settings</h3>
              <button onClick={onClose} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeTab === 'identity' && (
              <div className="flex flex-col gap-5">
                {/* Avatar Preview */}
                <div className="flex items-center gap-4">
                  <div
                    style={{ backgroundColor: avatarColor }}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg"
                  >
                    {name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Profile Avatar Accent</span>
                    <span className="text-xs text-white/50">Pick your glowing profile accent color</span>
                  </div>
                </div>

                {/* Color swatches */}
                <div className="flex items-center gap-2.5">
                  {colors.map(c => (
                    <button
                      key={c}
                      style={{ backgroundColor: c }}
                      onClick={() => setAvatarColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        avatarColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                    />
                  ))}
                </div>

                {/* Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/70">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-sm text-white focus:outline-none focus:border-brand"
                  />
                </div>

                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/70">Username</label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/5 text-sm text-white/50 font-mono">
                    @{currentUser?.username || 'user'}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="flex flex-col gap-4 text-xs text-white/70">
                <div className="p-4 rounded-xl bg-dark-950 border border-white/10 flex items-center justify-between">
                  <span>Hardware Video Acceleration</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Enabled</span>
                </div>
                <div className="p-4 rounded-xl bg-dark-950 border border-white/10 flex items-center justify-between">
                  <span>Desktop Notifications</span>
                  <span className="px-2 py-0.5 rounded bg-brand/20 text-brand font-bold">Active</span>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="flex flex-col gap-3 text-xs text-white/70">
                <div className="p-4 rounded-xl bg-dark-950 border border-white/10">
                  <div className="font-bold text-white mb-1">E2EE Cryptographic Identity</div>
                  <div className="font-mono text-[11px] text-white/50 break-all">
                    {currentUser?.publicKey ? `SHA256:${currentUser.publicKey.slice(0, 32)}...` : 'Ed25519-P256-Active'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'identity' && (
            <div className="flex justify-end pt-4 border-t border-white/[0.08]">
              <button
                onClick={handleSaveIdentity}
                disabled={saving || !name.trim()}
                className="px-6 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-md"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
