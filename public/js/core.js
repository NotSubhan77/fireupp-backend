/* ==========================================================================
   Tele — Core Runtime (State, Icons, Google OTP Auth, Profile, ZovioStatus, WS)
   ========================================================================== */

const ICONS = {
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  status: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2a10 10 0 0 1 9.54 7"/><path d="M21.54 15A10 10 0 0 1 12 22"/><path d="M2.46 15A10 10 0 0 1 2.46 9"/><path d="M12 22a10 10 0 0 1-9.54-7"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2.5"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  'eye-off': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  poll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
  micOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
  videoOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m4 0h5a2 2 0 0 1 2 2v3l5-3v10l-2.5-1.5"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  screen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/></svg>',
  phoneOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
  phoneIncoming: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 2 16 8 22 8"/><line x1="23" y1="1" x2="16" y2="8"/><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
  reply: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  crown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
  volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  volumeMute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
  mirror: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M20 7l-5 5 5 5M4 7l5 5-5 5"/></svg>',
  shutter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  starFill: '<svg viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  atSign: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  pinThumbtack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 3h6v4l2 3v3H5v-3l2-3V3z"/></svg>',
  unpin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M9 3h6v4l2 3v3H5v-3l2-3V3z"/><path d="M12 17v5"/></svg>',
  maximize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
  minimize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6m0 0v6m0-6-7 7m17-11h-6m0 0V4m0 6 7-7m-7 17v-6m0 0h6m-6 0 7 7M10 4v6m0 0H4m6 0L3 3"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  userCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>',
  ban: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  bellOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>',
  smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
  palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  at: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  arrowDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  logOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  shieldCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
  keyboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',
  sticker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/><circle cx="10" cy="13" r="1.5" fill="currentColor"/><circle cx="14" cy="13" r="1.5" fill="currentColor"/><path d="M10 16a2 2 0 0 0 4 0"/></svg>',
  gif: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="3"/><path d="M9 9H6.5A1.5 1.5 0 0 0 5 10.5v3A1.5 1.5 0 0 0 6.5 15H9v-3H7.5"/><path d="M12 9v6"/><path d="M15 9h4"/><path d="M15 12h2.5"/><path d="M15 15h1.5"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
};

const icon = name => `<span class="ico">${ICONS[name] || ''}</span>`;
function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-icon]').forEach(el => {
    const k = el.getAttribute('data-icon');
    if (ICONS[k]) el.innerHTML = ICONS[k];
  });
}

// ---------------- Global State ----------------
const S = {
  token: localStorage.getItem('fireupp.token') || localStorage.getItem('tele.token') || sessionStorage.getItem('fireupp.token') || sessionStorage.getItem('tele.token') || null,
  user: null,
  privateKey: null,
  vaultKey: null,
  config: { chunkSize: 5 * 1024 * 1024, maxFile: 2 * 1024 ** 3 },
  view: 'chats',          // 'chats' | 'status' | 'firecasts' | 'workspace' | 'meetings'
  filter: 'all',
  search: '',
  chats: new Map(),       // chatId -> chatView
  msgs: new Map(),        // chatId -> [msg]
  chatKeys: new Map(),    // `${chatId}:${v}` -> CryptoKey
  users: new Map(),       // userId -> publicUser
  activeChatId: null,
  infoOpen: false,
  replyTo: null,
  ws: null,
  liveWatchers: new Map(),
  workspace: [],          // decrypted ZovioSpace items
  meetings: [],
  statuses: [],           // 24h ZovioStatus items
  calls: [],              // FireCalls History
  callsFilter: 'all'
};
window.S = S;
window.isZovioPro = () => Boolean(S.user?.proPerks || S.user?.plan === 'pro');

// ---------------- Utilities ----------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function initials(name) {
  const p = String(name || '?').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || p[0]?.[1] || '')).toUpperCase() || '?';
}
const SoundFX = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },
  tone(freq, type = 'sine', startOffset = 0, duration = 0.1, vol = 0.14, endFreq = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + startOffset;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  },
  play(type = 'send') {
    const p = S.user?.preferences || S.user?.prefs || {};
    if (p.sounds === false) return;
    try {
      this.init();
      if (!this.ctx) return;
      switch (type) {
        case 'send':
          // Crisp upward pop-whoosh
          this.tone(380, 'sine', 0, 0.11, 0.18, 860);
          this.tone(760, 'triangle', 0.05, 0.09, 0.10, 1120);
          break;
        case 'receive':
          // Warm two-note marimba chime
          this.tone(587.33, 'sine', 0, 0.16, 0.20);
          this.tone(880, 'sine', 0.075, 0.24, 0.22);
          break;
        case 'click':
        case 'nav':
          // Subtle tactile UI tap
          this.tone(520, 'sine', 0, 0.035, 0.06, 340);
          break;
        case 'toggle':
          // Crisp switch snap
          this.tone(640, 'triangle', 0, 0.055, 0.12, 820);
          break;
        case 'react':
          // Bubbly reaction pop
          this.tone(440, 'sine', 0, 0.08, 0.16, 980);
          this.tone(980, 'sine', 0.06, 0.10, 0.12, 1240);
          break;
        case 'friend':
          // Uplifting major triad arpeggio (C5 - E5 - G5 - C6)
          this.tone(523.25, 'sine', 0, 0.14, 0.15);
          this.tone(659.25, 'sine', 0.06, 0.14, 0.15);
          this.tone(783.99, 'sine', 0.12, 0.16, 0.16);
          this.tone(1046.5, 'sine', 0.18, 0.28, 0.18);
          break;
        case 'delete':
        case 'block':
          // Low muted descending thud
          this.tone(300, 'triangle', 0, 0.11, 0.16, 150);
          this.tone(180, 'sine', 0.06, 0.15, 0.14, 110);
          break;
        case 'shutter':
          // Camera shutter double-click
          this.tone(1200, 'triangle', 0, 0.025, 0.18, 300);
          this.tone(900, 'sine', 0.04, 0.035, 0.15, 220);
          break;
        case 'call':
          // Melodic call join chime
          this.tone(440, 'sine', 0, 0.15, 0.15);
          this.tone(554.37, 'sine', 0.09, 0.15, 0.15);
          this.tone(659.25, 'sine', 0.18, 0.26, 0.18);
          break;
        case 'leave':
          // Descending disconnect tone (E5 -> C5 -> A4)
          this.tone(659.25, 'sine', 0, 0.12, 0.16);
          this.tone(523.25, 'sine', 0.08, 0.12, 0.15);
          this.tone(440, 'sine', 0.16, 0.22, 0.14);
          break;
        case 'save':
        default:
          // Bright confirmation chord
          this.tone(523.25, 'sine', 0, 0.12, 0.15);
          this.tone(659.25, 'sine', 0.06, 0.14, 0.15);
          this.tone(783.99, 'sine', 0.12, 0.22, 0.16);
          break;
      }
    } catch {
      // AudioContext policy
    }
  },
  ringTimer: null,
  startRingtone(type = 'incoming') {
    const p = S.user?.preferences || S.user?.prefs || {};
    if (p.sounds === false) return;
    this.stopRingtone();
    this.init();
    if (!this.ctx) return;
    if (type === 'outgoing') {
      const playTone = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        this.tone(440, 'sine', 0, 1.2, 0.12);
        this.tone(480, 'sine', 0, 1.2, 0.12);
      };
      playTone();
      this.ringTimer = setInterval(playTone, 3200);
    } else {
      const playMarimba = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        const notes = [
          { f: 523.25, t: 0, d: 0.14 },
          { f: 659.25, t: 0.14, d: 0.14 },
          { f: 783.99, t: 0.28, d: 0.16 },
          { f: 1046.5, t: 0.44, d: 0.20 },
          { f: 783.99, t: 0.70, d: 0.14 },
          { f: 1046.5, t: 0.86, d: 0.28 }
        ];
        notes.forEach(n => this.tone(n.f, 'sine', n.t, n.d, 0.20));
      };
      playMarimba();
      this.ringTimer = setInterval(playMarimba, 2400);
    }
  },
  stopRingtone() {
    if (this.ringTimer) {
      clearInterval(this.ringTimer);
      this.ringTimer = null;
    }
  }
};

function isUserFriend(uid) {
  return Boolean(uid && Array.isArray(S.user?.friends) && S.user.friends.includes(uid));
}
function isUserBlocked(uid) {
  return Boolean(uid && Array.isArray(S.user?.blockedUsers) && S.user.blockedUsers.includes(uid));
}
function isChatMuted(chatId) {
  return Boolean(chatId && Array.isArray(S.user?.mutedChats) && S.user.mutedChats.includes(chatId));
}

async function toggleMarkFriend(userId) {
  if (!userId) return;
  try {
    const res = await api('/api/friends/toggle', { method: 'POST', body: { userId } });
    if (res.user) Object.assign(S.user, res.user);
    else S.user.friends = res.friends || [];
    const u = S.users.get(userId);
    SoundFX.play(res.isFriend ? 'friend' : 'toggle');
    toast(res.isFriend
      ? `✓ Marked ${u?.name || 'user'} as Friend! Your ZovioStatus is now visible to them.`
      : `Removed ${u?.name || 'user'} from Friends`);
    if (S.activeChatId) {
      const savedScroll = $('#msgsScroll')?.scrollTop;
      renderConvoShell();
      renderMessages('preserve');
      if (savedScroll != null && $('#msgsScroll')) {
        $('#msgsScroll').scrollTop = savedScroll;
      }
      if (S.infoOpen) renderInfoPane();
    }
    renderChatList();
    if (S.view === 'profile') renderProfileView(currentSettingsTab);
    return res;
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function toggleBlockUser(userId, forceBlock) {
  if (!userId) return;
  try {
    const res = await api('/api/users/block', { method: 'POST', body: { userId, block: forceBlock } });
    if (res.user) Object.assign(S.user, res.user);
    else {
      S.user.blockedUsers = res.blockedUsers || [];
      S.user.friends = res.friends || [];
    }
    const u = S.users.get(userId);
    SoundFX.play(res.isBlocked ? 'block' : 'save');
    toast(res.isBlocked ? `🚫 Blocked ${u?.name || 'user'}` : `🔓 Unblocked ${u?.name || 'user'}`);
    loadStatuses();
    if (S.activeChatId) {
      const savedScroll = $('#msgsScroll')?.scrollTop;
      renderConvoShell();
      renderMessages('preserve');
      if (savedScroll != null && $('#msgsScroll')) {
        $('#msgsScroll').scrollTop = savedScroll;
      }
      if (S.infoOpen) renderInfoPane();
    }
    renderChatList();
    if (S.view === 'profile') renderProfileView(currentSettingsTab);
    return res;
  } catch (err) {
    toast(err.message, 'err');
  }
}

function renderMe() {
  const me = $('#meBtn');
  if (me && S.user) {
    const hasPhoto = Boolean(S.user.avatar && typeof S.user.avatar === 'string' && S.user.avatar.startsWith('data:image/'));
    me.innerHTML = avatarHTML(S.user, 'sm');
    me.classList.toggle('has-photo', hasPhoto);
  }
}

const THEME_COLOR_PALETTE = {
  '#7c5cff': { name: 'Electric Purple', secondary: '#ff5c8a' },
  '#3b82f6': { name: 'Ocean Blue', secondary: '#06b6d4' },
  '#10b981': { name: 'Emerald', secondary: '#34d399' },
  '#ec4899': { name: 'Rose Pink', secondary: '#f43f5e' },
  '#f59e0b': { name: 'Amber Gold', secondary: '#fb923c' },
  '#06b6d4': { name: 'Cyber Cyan', secondary: '#3b82f6' },
  '#ef4444': { name: 'Crimson', secondary: '#f97316' },
  '#e4e4e7': { name: 'Monochrome', secondary: '#a1a1aa' }
};

const CHAT_BG_PRESETS = {
  default: { name: 'Default', css: 'none' },
  midnight: { name: 'Midnight Glow', css: 'radial-gradient(circle at 20% 20%, rgba(124, 92, 255, 0.18), transparent 58%), radial-gradient(circle at 80% 80%, rgba(255, 92, 138, 0.14), transparent 58%)' },
  aurora: { name: 'Aurora Mist', css: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(6, 182, 212, 0.14) 50%, rgba(59, 130, 246, 0.16) 100%)' },
  nebula: { name: 'Deep Nebula', css: 'radial-gradient(ellipse at top right, rgba(236, 72, 153, 0.18), transparent 60%), radial-gradient(ellipse at bottom left, rgba(99, 102, 241, 0.18), transparent 60%)' },
  dusk: { name: 'Warm Dusk', css: 'linear-gradient(160deg, rgba(245, 158, 11, 0.16) 0%, rgba(239, 68, 68, 0.13) 60%, transparent 100%)' },
  emerald: { name: 'Emerald Depth', css: 'radial-gradient(circle at 15% 85%, rgba(16, 185, 129, 0.20), transparent 58%), radial-gradient(circle at 85% 15%, rgba(52, 211, 153, 0.12), transparent 55%)' },
  sunset: { name: 'Sunset Horizon', css: 'linear-gradient(145deg, rgba(249, 115, 22, 0.17) 0%, rgba(236, 72, 153, 0.15) 55%, transparent 100%)' },
  cyber: { name: 'Cyber Indigo', css: 'radial-gradient(circle at 80% 15%, rgba(6, 182, 212, 0.19), transparent 55%), radial-gradient(circle at 15% 85%, rgba(79, 70, 229, 0.15), transparent 55%)' },
  velvet: { name: 'Rose Velvet', css: 'radial-gradient(circle at 50% 0%, rgba(244, 63, 94, 0.20), transparent 62%), radial-gradient(circle at 85% 90%, rgba(225, 29, 72, 0.13), transparent 55%)' },
  pro_royal: { name: 'Royal Amethyst', proOnly: true, css: 'radial-gradient(circle at 18% 18%, rgba(168, 85, 247, 0.26), transparent 55%), radial-gradient(circle at 85% 82%, rgba(245, 158, 11, 0.18), transparent 55%)' },
  pro_holo: { name: 'Holo Prism', proOnly: true, css: 'linear-gradient(135deg, rgba(6, 182, 212, 0.20) 0%, rgba(168, 85, 247, 0.20) 50%, rgba(236, 72, 153, 0.20) 100%)' },
  pro_gold: { name: 'Midnight Gold', proOnly: true, css: 'radial-gradient(circle at 75% 18%, rgba(251, 191, 36, 0.22), transparent 52%), radial-gradient(circle at 20% 85%, rgba(245, 158, 11, 0.14), transparent 58%)' },
  pro_neon: { name: 'Neon Tokyo', proOnly: true, css: 'radial-gradient(circle at 20% 20%, rgba(236, 72, 153, 0.24), transparent 50%), radial-gradient(circle at 82% 78%, rgba(34, 211, 238, 0.22), transparent 52%)' },
  pro_jade: { name: 'Imperial Jade', proOnly: true, css: 'linear-gradient(155deg, rgba(16, 185, 129, 0.24) 0%, rgba(5, 150, 105, 0.14) 55%, rgba(251, 191, 36, 0.10) 100%)' },
  pro_eclipse: { name: 'Solar Eclipse', proOnly: true, css: 'radial-gradient(circle at 50% 42%, rgba(249, 115, 22, 0.22), transparent 46%), radial-gradient(circle at 50% 50%, rgba(124, 92, 255, 0.18), transparent 72%)' }
};

function hexToRgbTuple(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return '124, 92, 255';
  const clean = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(clean.slice(1, 3), 16) || 124;
  const g = parseInt(clean.slice(3, 5), 16) || 92;
  const b = parseInt(clean.slice(5, 7), 16) || 255;
  return `${r}, ${g}, ${b}`;
}

function applyPreferencesEffects() {
  const p = S.user?.preferences || S.user?.prefs || {};
  document.body.classList.toggle('compact-density', !!p.compactMode);
  document.documentElement.classList.toggle('reduce-motion', p.animations === false);

  // Apply custom theme accent color globally with automatic light/dark ink contrast
  const brand = p.themeColor || '#7c5cff';
  const preset = THEME_COLOR_PALETTE[brand.toLowerCase()];
  const secondary = preset ? preset.secondary : brand;
  const rgb = hexToRgbTuple(brand);
  const brandLum = hexLuminance(brand);
  const secLum = hexLuminance(secondary);
  const isBrightBrand = brandLum >= 162;
  const isBrightGrad = isBrightBrand || ((brandLum + secLum) / 2 >= 162);
  const isBrightSec = secLum >= 162;
  const brandInk = isBrightGrad ? '#09090b' : '#ffffff';
  const brandSecInk = isBrightSec ? '#09090b' : '#ffffff';
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--brand', brand);
  rootStyle.setProperty('--brand-2', secondary);
  rootStyle.setProperty('--brand-grad', `linear-gradient(135deg, ${brand} 0%, ${secondary} 100%)`);
  rootStyle.setProperty('--brand-soft', `rgba(${rgb}, 0.16)`);
  rootStyle.setProperty('--brand-ink', brandInk);
  rootStyle.setProperty('--brand-2-ink', brandSecInk);
  rootStyle.setProperty('--brand-link-on-light', isBrightGrad ? '#09090b' : brand);
  document.documentElement.dataset.brandLight = isBrightGrad ? '1' : '0';

  // Apply built-in chat background gradient preset
  const bgPreset = p.chatBgPreset || 'default';
  const presetObj = CHAT_BG_PRESETS[bgPreset];
  const bgAllowed = Boolean(presetObj && (!presetObj.proOnly || window.isZovioPro?.()));
  if (bgPreset && bgPreset !== 'default' && bgAllowed) {
    rootStyle.setProperty('--chat-wallpaper', presetObj.css);
    document.body.dataset.chatBg = bgPreset;
  } else {
    rootStyle.setProperty('--chat-wallpaper', 'none');
    delete document.body.dataset.chatBg;
  }

  renderMe();
}

function hexLuminance(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return 0;
  const clean = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(clean.slice(1, 3), 16) || 0;
  const g = parseInt(clean.slice(3, 5), 16) || 0;
  const b = parseInt(clean.slice(5, 7), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function isLightHex(hex) {
  return hexLuminance(hex) >= 162;
}

function avatarHTML(obj, cls = '') {
  if (!obj) return `<div class="ava ${cls}" style="background:#555;color:#ffffff">?</div>`;
  const isMe = obj.id === S.user?.id;
  const hideOnline = (isMe && (S.user?.preferences?.showOnline === false || S.user?.prefs?.showOnline === false)) ||
                     (!isMe && (obj.preferences?.showOnline === false || obj.prefs?.showOnline === false));
  const dot = (obj.online && !hideOnline) ? '<span class="dot"></span>' : '';
  const color = obj.avatarColor || '#ff5722';
  const label = obj.emoji || initials(obj.name || obj.username);
  // Only custom user photos (uploaded data:image/ URLs) are rendered as image avatars.
  // Google external image URLs and non-profile users render the classic colorful initials avatar!
  const hasCustomPhoto = obj.avatar && typeof obj.avatar === 'string' && 
    (obj.avatar.startsWith('data:image/') || obj.avatar.startsWith('http://') || obj.avatar.startsWith('https://') || obj.avatar.startsWith('/')) && 
    obj.avatar.length > 5;
  if (hasCustomPhoto) {
    return `<div class="ava ${cls} ava-has-photo" style="box-shadow: 0 0 0 3px ${color}; border: 2.5px solid #0e1015; background: ${color};"><img class="ava-img" src="${esc(obj.avatar)}" alt="" onerror="const p=this.parentElement;this.remove();if(p){p.classList.remove('ava-has-photo');p.style.background='${color}';p.textContent='${esc(label)}';}">${dot}</div>`;
  }
  return `<div class="ava ${cls}" style="background:${color}; color:#ffffff;">${esc(label)}${dot}</div>`;
}
function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
function toast(msg, kind = 'info') {
  const el = document.createElement('div');
  el.className = 'toast';
  const cleanMsg = String(msg || '').replace(/^[✨⚠️✅🔥\s]+/, '').trim();
  const icon = kind === 'err' ? '⚠️' : '✨';
  el.innerHTML = `${icon} <span>${esc(cleanMsg || msg)}</span>`;
  $('#toastRoot').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}
window._modalCleanupHooks = [];
function onModalClose(fn) {
  if (typeof fn === 'function') window._modalCleanupHooks.push(fn);
}
function closeModal() {
  while (window._modalCleanupHooks && window._modalCleanupHooks.length) {
    try { window._modalCleanupHooks.pop()(); } catch (err) { console.warn('Modal cleanup hook error:', err); }
  }
  $('#modalRoot').innerHTML = '';
}
function showModal(title, bodyHTML, onMount, modalExtraClass = '') {
  closeModal();
  $('#modalRoot').innerHTML = `
    <div class="modal-back" id="modalBack">
      <div class="modal ${modalExtraClass}">
        <div class="modal-head"><h3>${title}</h3><button class="icon-btn" id="modalClose">${icon('close')}</button></div>
        <div id="modalBody" class="col gap-m">${bodyHTML}</div>
      </div>
    </div>`;
  $('#modalClose').onclick = closeModal;
  $('#modalBack').onclick = e => { if (e.target.id === 'modalBack') closeModal(); };
  hydrateIcons($('#modalRoot'));
  if (onMount) onMount($('#modalBody'));
}

// Resize image file to clean data URL for profile pictures & status stories
function fileToDataURL(file, maxDim = 480, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------------- REST API (with Binary Chunk Content-Type Fix) ----------------
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (S.token) headers.Authorization = `Bearer ${S.token}`;
  if (opts.body instanceof Uint8Array || opts.body instanceof ArrayBuffer) {
    headers['Content-Type'] = 'application/octet-stream';
  } else if (opts.body && typeof opts.body === 'object') {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, { ...opts, headers });
  if (opts.raw) {
    if (!res.ok) {
      const err = new Error((await res.json().catch(() => ({}))).error || res.statusText);
      err.status = res.status;
      throw err;
    }
    return res.arrayBuffer();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------------- E2EE Keyring ----------------
async function ensureUsers(ids) {
  const missing = ids.filter(id => id && !S.users.has(id));
  if (missing.length) {
    const list = await api('/api/users/lookup', { method: 'POST', body: { ids: missing } });
    list.forEach(u => S.users.set(u.id, u));
  }
}

async function getChatKey(chat, version = (chat.keyVersion || 1)) {
  const cacheId = `${chat.id}:${version}`;
  if (S.chatKeys.has(cacheId)) return S.chatKeys.get(cacheId);
  const box = chat.keys?.[version];
  if (!box) {
    if (chat.type === 'self' && S.vaultKey) {
      S.chatKeys.set(cacheId, S.vaultKey);
      return S.vaultKey;
    }
    throw new Error('Missing encryption key for this chat version');
  }
  try {
    await ensureUsers([box.wrapperId]);
    const wrapper = box.wrapperId === S.user?.id ? S.user : S.users.get(box.wrapperId);
    if (!wrapper?.publicKey) throw new Error('Wrapper public key unavailable');
    const raw = await E2E.unwrapKey(box, S.privateKey, wrapper.publicKey);
    const key = await E2E.importKey(raw);
    S.chatKeys.set(cacheId, key);
    return key;
  } catch (err) {
    if (chat.type === 'self' && S.vaultKey) {
      S.chatKeys.set(cacheId, S.vaultKey);
      return S.vaultKey;
    }
    throw err;
  }
}

async function wrapNewChatKey(memberUsers) {
  const raw = E2E.newKeyRaw();
  const keys = {};
  for (const u of memberUsers) {
    keys[u.id] = { wrapperId: S.user.id, ...(await E2E.wrapKey(raw, S.privateKey, u.publicKey)) };
  }
  return { raw, keys };
}

async function decryptMsg(chat, m) {
  if (!m || m._plain || m.deleted || m.kind === 'system' || m.kind === 'story-mention' || m.kind === 'call') {
    if (m && !m._plain && m.body) {
      m._plain = typeof m.body === 'object' ? m.body : { text: String(m.body || '') };
    }
    return m;
  }
  if (chat.type === 'channel') {
    m._plain = m.body || {};
    return m;
  }
  try {
    const key = await getChatKey(chat, m.keyVersion || chat.keyVersion || 1);
    m._plain = await E2E.decryptJSON(key, { iv: m.iv, ct: m.ct });
    if (m.kind === 'live' && m.live?.iv && m.live?.ct) {
      m._livePlain = await E2E.decryptJSON(key, { iv: m.live.iv, ct: m.live.ct });
    }
  } catch (err) {
    if (chat.type === 'self' && S.vaultKey) {
      try {
        m._plain = await E2E.decryptJSON(S.vaultKey, { iv: m.iv, ct: m.ct });
        return m;
      } catch {}
    }
    m._plain = { text: 'Message unavailable' };
  }
  return m;
}

// ---------------- Password & OTP Validation ----------------
function validatePassword(pw) {
  if (!pw || pw.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pw)) {
    return 'Password must contain at least one symbol (!@#$%^&*...)';
  }
  return null;
}

// ---------------- Real Google Authentication + Mobile Number & Password Flow (Matching Video) ----------------
const GOOGLE_ACCOUNTS = [
  { name: 'Subhan Mahapatra', email: 'mahapatrasubhan07@gmail.com', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=140&h=140&q=80', color: '#1a73e8' },
  { name: 'Gameaholic Subhan', email: 'notsubhan77@gmail.com', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=140&h=140&q=80', color: '#8e24aa' },
  { name: 'Subhan FF', email: 'notsubhan777@gmail.com', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=140&h=140&q=80', color: '#ea4335' },
  { name: 'Abhigyaan Mahapatra', email: 'notsubhan077@gmail.com', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=140&h=140&q=80', color: '#00897b' }
];

const USER_ICON_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

let activeGoogleAccount = null;
let googleTokenClient = null;
let googleClientId = '';

async function setupGoogleOAuth() {
  try {
    const cfg = await api('/api/config');
    googleClientId = cfg.googleClientId || '';
    if (googleClientId && window.google?.accounts?.oauth2) {
      googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        callback: async (resp) => {
          if (resp.error) {
            toast(`Google sign-in canceled or failed: ${resp.error}`, 'err');
            return;
          }
          try {
            $('#authBusy').classList.remove('hidden');
            const userinfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${resp.access_token}` }
            }).then(r => r.json());

            if (!userinfo.email) throw new Error('Could not retrieve email from Google');
            await loadGoogleAccount({
              email: userinfo.email,
              name: userinfo.name || userinfo.given_name,
              avatar: userinfo.picture
            });
            toast(`Google account connected: ${userinfo.email}`);
          } catch (err) {
            toast(err.message, 'err');
          } finally {
            $('#authBusy').classList.add('hidden');
          }
        }
      });
    }
  } catch (err) {
    console.warn('[google] could not initialize GIS:', err.message);
  }
}

function triggerGoogleAuth() {
  if (googleTokenClient) {
    googleTokenClient.requestAccessToken({ prompt: 'select_account' });
  } else {
    openGoogleChooserModal();
  }
}

function openGoogleChooserModal() {
  const overlay = document.createElement('div');
  overlay.className = 'g-modal-wrap';

  let currentStep = 'choose'; // 'choose' | 'consent'
  let chosenAccount = null;

  const render = () => {
    if (currentStep === 'choose') {
      overlay.innerHTML = `
        <div class="g-dialog">
          <div class="g-dialog-top-bar"></div>
          <div class="g-dialog-content">
            <div class="g-col-left">
              <div class="g-logo-row">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/><path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"/></svg>
                <span>Sign in with Google</span>
              </div>
              <h1 class="g-title">Choose an account</h1>
              <p class="g-subtitle">to continue to Zovio</p>
            </div>

            <div class="g-col-right">
              <div class="g-account-list">
                ${GOOGLE_ACCOUNTS.map((acc, idx) => `
                  <div class="g-account-item" data-idx="${idx}">
                    <div class="g-account-avatar" style="${acc.avatar ? '' : `background:${acc.color};color:#ffffff`}">
                      ${acc.avatar ? `<img class="g-account-avatar-img" src="${acc.avatar}" alt="${esc(acc.name)}">` : USER_ICON_SVG}
                    </div>
                    <div class="g-account-details">
                      <div class="g-account-name">${esc(acc.name)}</div>
                      <div class="g-account-email">${esc(acc.email)}</div>
                    </div>
                  </div>`).join('')}
                <div class="g-account-item" id="gUseAnotherBtn">
                  <div class="g-account-avatar" style="background:#282a2c;color:#a8c7fa">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
                  <div class="g-account-details">
                    <div class="g-account-name">Use another account</div>
                  </div>
                </div>
              </div>
              <div class="g-notice-text">
                Before using this app, you can review Zovio's <span style="color:#a8c7fa;cursor:pointer">Privacy Policy</span> and <span style="color:#a8c7fa;cursor:pointer">Terms of Service</span>.
              </div>
            </div>
          </div>
          <div class="g-footer-bar">
            <span>English (United States) ▾</span>
            <div class="g-footer-links">
              <span>Help</span>
              <span>Privacy</span>
              <span>Terms</span>
            </div>
          </div>
        </div>`;

      overlay.querySelectorAll('.g-account-item[data-idx]').forEach(item => {
        item.onclick = () => {
          chosenAccount = GOOGLE_ACCOUNTS[+item.dataset.idx];
          currentStep = 'consent';
          render();
        };
      });

      const anotherBtn = overlay.querySelector('#gUseAnotherBtn');
      if (anotherBtn) {
        anotherBtn.onclick = () => {
          const email = prompt('Enter your Google Account (Gmail):', 'yourname@gmail.com');
          if (!email || !email.trim().endsWith('@gmail.com')) return;
          const name = prompt('Enter your Full Name:', email.split('@')[0]) || email.split('@')[0];
          chosenAccount = { name: name.trim(), email: email.trim().toLowerCase(), color: '#1a73e8' };
          currentStep = 'consent';
          render();
        };
      }
    } else if (currentStep === 'consent') {
      overlay.innerHTML = `
        <div class="g-dialog">
          <div class="g-dialog-top-bar"></div>
          <div class="g-dialog-content">
            <div class="g-col-left">
              <div class="g-logo-row">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/><path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"/></svg>
                <span>Sign in with Google</span>
              </div>
              <h1 class="g-title">Sign in to Zovio</h1>
              <div>
                <button type="button" class="g-account-pill-btn" id="gConsentBackPill">
                  <span class="g-account-avatar" style="width:24px;height:24px;overflow:hidden;${chosenAccount.avatar ? '' : `background:${chosenAccount.color || '#1a73e8'};color:#fff`}">
                    ${chosenAccount.avatar ? `<img class="g-account-avatar-img" src="${chosenAccount.avatar}">` : `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`}
                  </span>
                  <span>${esc(chosenAccount.email)}</span>
                  <span style="font-size:10px">▾</span>
                </button>
              </div>
            </div>

            <div class="g-col-right">
              <div style="font-size:15px;color:#e3e3e3;margin-bottom:20px;font-weight:400">
                Google will allow Zovio to access this info about you
              </div>

              <div class="col gap-m">
                <div class="row gap-m" style="align-items:flex-start">
                  <div style="color:#8e918f;margin-top:2px">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
                  <div>
                    <strong style="color:#e3e3e3;font-size:14px">${esc(chosenAccount.name)}</strong>
                    <div style="font-size:12.5px;color:#8e918f">Name and profile picture</div>
                  </div>
                </div>

                <div class="row gap-m" style="align-items:flex-start">
                  <div style="color:#8e918f;margin-top:2px">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </div>
                  <div>
                    <strong style="color:#e3e3e3;font-size:14px">${esc(chosenAccount.email)}</strong>
                    <div style="font-size:12.5px;color:#8e918f">Email address</div>
                  </div>
                </div>
              </div>

              <div class="g-notice-text">
                Review Zovio's <span style="color:#a8c7fa;cursor:pointer">Privacy Policy</span> and <span style="color:#a8c7fa;cursor:pointer">Terms of Service</span> to understand how Zovio will process and protect your data.
              </div>

              <div class="row end gap-s" style="margin-top:32px">
                <button type="button" class="g-btn-cancel" id="gConsentCancelBtn">Cancel</button>
                <button type="button" class="g-btn-primary" id="gConsentContinueBtn">Continue</button>
              </div>
            </div>
          </div>
          <div class="g-footer-bar">
            <span>English (United States) ▾</span>
            <div class="g-footer-links">
              <span>Help</span>
              <span>Privacy</span>
              <span>Terms</span>
            </div>
          </div>
        </div>`;

      overlay.querySelector('#gConsentBackPill').onclick = () => {
        currentStep = 'choose';
        render();
      };
      overlay.querySelector('#gConsentCancelBtn').onclick = () => {
        overlay.remove();
      };
      overlay.querySelector('#gConsentContinueBtn').onclick = async () => {
        overlay.remove();
        await loadGoogleAccount({
          email: chosenAccount.email,
          name: chosenAccount.name,
          avatar: chosenAccount.avatar,
          color: chosenAccount.color
        });
      };
    }
  };

  render();
  document.body.appendChild(overlay);
}

// ---------------- Phone Number Authentication (Firebase SMS OTP) ----------------
const COUNTRY_CODES = [
  { code: 'in', name: 'India', dial: '+91' },
  { code: 'us', name: 'United States', dial: '+1' },
  { code: 'gb', name: 'United Kingdom', dial: '+44' },
  { code: 'ae', name: 'United Arab Emirates', dial: '+971' },
  { code: 'ca', name: 'Canada', dial: '+1' },
  { code: 'au', name: 'Australia', dial: '+61' },
  { code: 'sg', name: 'Singapore', dial: '+65' },
  { code: 'de', name: 'Germany', dial: '+49' },
  { code: 'fr', name: 'France', dial: '+33' },
  { code: 'sa', name: 'Saudi Arabia', dial: '+966' },
  { code: 'jp', name: 'Japan', dial: '+81' },
  { code: 'kr', name: 'South Korea', dial: '+82' },
  { code: 'br', name: 'Brazil', dial: '+55' },
  { code: 'ru', name: 'Russia', dial: '+7' },
  { code: 'za', name: 'South Africa', dial: '+27' },
  { code: 'ng', name: 'Nigeria', dial: '+234' },
  { code: 'my', name: 'Malaysia', dial: '+60' },
  { code: 'id', name: 'Indonesia', dial: '+62' },
  { code: 'pk', name: 'Pakistan', dial: '+92' },
  { code: 'bd', name: 'Bangladesh', dial: '+880' },
  { code: 'np', name: 'Nepal', dial: '+977' },
  { code: 'lk', name: 'Sri Lanka', dial: '+94' },
  { code: 'it', name: 'Italy', dial: '+39' },
  { code: 'es', name: 'Spain', dial: '+34' },
  { code: 'nl', name: 'Netherlands', dial: '+31' },
  { code: 'ch', name: 'Switzerland', dial: '+41' },
  { code: 'se', name: 'Sweden', dial: '+46' },
  { code: 'nz', name: 'New Zealand', dial: '+64' },
  { code: 'qa', name: 'Qatar', dial: '+974' },
  { code: 'kw', name: 'Kuwait', dial: '+965' },
  { code: 'om', name: 'Oman', dial: '+968' },
  { code: 'bh', name: 'Bahrain', dial: '+973' },
  { code: 'tr', name: 'Turkey', dial: '+90' },
  { code: 'ph', name: 'Philippines', dial: '+63' },
  { code: 'eg', name: 'Egypt', dial: '+20' }
];

function initCountryPicker() {
  const wrap = $('#countryPickerWrap');
  const btn = $('#countryPickerBtn');
  const menu = $('#countryDropdownMenu');
  const list = $('#countryOptionsList');
  const searchIn = $('#countrySearchIn');
  const hiddenCode = $('#countryCodeSelect');
  const flagImg = $('#selectedCountryFlag');
  const codeText = $('#selectedCountryCode');
  if (!wrap || !btn || !menu || !list) return;

  let currentCode = 'in';

  function renderList(query = '') {
    const q = (query || '').toLowerCase().trim();
    const filtered = COUNTRY_CODES.filter(c =>
      c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q)
    );
    list.innerHTML = filtered.map(c => `
      <div class="country-item ${c.code === currentCode ? 'active' : ''}" data-code="${c.code}" data-dial="${c.dial}">
        <img class="country-flag-img" src="/flags/${c.code}.png" onerror="this.src='https://flagcdn.com/w40/${c.code}.png'" alt="${c.name} flag">
        <span class="country-name">${c.name}</span>
        <span class="country-dial">${c.dial}</span>
      </div>
    `).join('');

    list.querySelectorAll('.country-item').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const code = el.dataset.code;
        const dial = el.dataset.dial;
        currentCode = code;
        if (hiddenCode) hiddenCode.value = dial;
        if (flagImg) {
          flagImg.src = `/flags/${code}.png`;
          flagImg.alt = `${code.toUpperCase()} flag`;
        }
        if (codeText) codeText.textContent = dial;
        closeDropdown();
        $('#phoneNumIn')?.focus();
      };
    });
  }

  function openDropdown() {
    menu.classList.remove('hidden');
    wrap.classList.add('open');
    if (searchIn) {
      searchIn.value = '';
      setTimeout(() => searchIn.focus(), 50);
    }
    renderList('');
  }

  function closeDropdown() {
    menu.classList.add('hidden');
    wrap.classList.remove('open');
  }

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (menu.classList.contains('hidden')) {
      openDropdown();
    } else {
      closeDropdown();
    }
  };

  if (searchIn) {
    searchIn.oninput = (e) => renderList(e.target.value);
    searchIn.onclick = (e) => e.stopPropagation();
    searchIn.onkeydown = (e) => {
      if (e.key === 'Escape') closeDropdown();
    };
  }

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      closeDropdown();
    }
  });

  renderList('');
}

let firebaseApp = null;
let recaptchaVerifier = null;
let firebaseConfirmationResult = null;
let firebaseStorage = null;
let firebaseFirestore = null;
let firebaseMessaging = null;

async function initFirebaseClient(forceReload = false) {
  if (firebaseApp && !forceReload) return;
  if (!window.firebase) return;
  try {
    const cfg = await api('/api/config');
    const fbCfg = cfg.firebase || {};
    if (fbCfg.apiKey) {
      if (firebaseApp) {
        try { await firebaseApp.delete(); } catch (_) {}
      }
      firebaseApp = firebase.initializeApp(fbCfg);
      window.firebaseApp = firebaseApp;

      // Initialize Firestore
      if (window.firebase.firestore) {
        try {
          firebaseFirestore = firebase.firestore();
          window.firebaseFirestore = firebaseFirestore;
        } catch (e) {
          console.warn('[firebase] Firestore init:', e.message);
        }
      }

      // Initialize Cloud Storage
      if (window.firebase.storage) {
        try {
          firebaseStorage = firebase.storage();
          window.firebaseStorage = firebaseStorage;
        } catch (e) {
          console.warn('[firebase] Storage init:', e.message);
        }
      }

      // Initialize Cloud Messaging (Push Notifications)
      if (window.firebase.messaging && typeof firebase.messaging.isSupported === 'function') {
        try {
          if (firebase.messaging.isSupported()) {
            firebaseMessaging = firebase.messaging();
            window.firebaseMessaging = firebaseMessaging;
          }
        } catch (e) {
          console.warn('[firebase] Messaging init:', e.message);
        }
      }

      console.log('[firebase] Client fully initialized for fireupp-d5c92:', {
        auth: Boolean(firebase.auth),
        firestore: Boolean(firebaseFirestore),
        storage: Boolean(firebaseStorage),
        messaging: Boolean(firebaseMessaging)
      });
    }
  } catch (err) {
    console.warn('[firebase] Client init error:', err.message);
  }
}

function openFirebaseConfigModal() {
  api('/api/config').then(cfg => {
    const fb = cfg.firebase || {};
    showModal('Google Firebase SMS Configuration', `
      <div class="col gap-m" style="max-width:480px">
        <p class="muted xs" style="line-height:1.5">
          Google Firebase sends cellular SMS verification OTPs directly to your mobile phone.
          Connect your Firebase Web project below to dispatch SMS codes worldwide.
        </p>

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--text-1);line-height:1.6">
          <strong>Steps to set up Firebase Phone Auth:</strong><br>
          1. Open <a href="https://console.firebase.google.com/" target="_blank" rel="noopener" style="color:#a8c7fa;text-decoration:underline">Firebase Console</a> and select or create your project.<br>
          2. Under <b>Build &gt; Authentication &gt; Sign-in method</b>, enable <b>Phone</b>.<br>
          3. <i>(Recommended for instant testing)</i> In Phone provider, add your number (e.g. +91 9147098986) under <b>Phone numbers for testing</b>.<br>
          4. Go to <b>Project Settings &gt; General</b>, scroll to "Your apps", and copy your Web App configuration.
        </div>

        <label class="col gap-xs">
          <span class="muted xs">Firebase Web API Key (apiKey)</span>
          <input type="text" id="fbApiKeyIn" placeholder="AIzaSy..." value="${esc(fb.apiKey || '')}">
        </label>

        <label class="col gap-xs">
          <span class="muted xs">Firebase Project ID (projectId)</span>
          <input type="text" id="fbProjectIdIn" placeholder="e.g. tele-firestore-auth" value="${esc(fb.projectId || '')}">
        </label>

        <label class="col gap-xs">
          <span class="muted xs">Firebase Auth Domain (authDomain)</span>
          <input type="text" id="fbAuthDomainIn" placeholder="e.g. tele-firestore-auth.firebaseapp.com" value="${esc(fb.authDomain || '')}">
        </label>

        <label class="col gap-xs">
          <span class="muted xs">Or Paste Full Firebase Config Object</span>
          <textarea id="fbPasteRaw" rows="3" placeholder='const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "..." };' style="font-size:12px;font-family:monospace"></textarea>
        </label>

        <div class="row end gap-s" style="margin-top:8px">
          <button type="button" class="btn ghost" id="fbCancelBtn">Cancel</button>
          <button type="button" class="btn primary glow" id="fbSaveBtn">Save &amp; Connect Firebase</button>
        </div>
      </div>
    `, box => {
      $('#fbCancelBtn', box).onclick = closeModal;

      $('#fbPasteRaw', box).oninput = e => {
        const val = e.target.value;
        try {
          const keyMatch = val.match(/apiKey["']?\s*:\s*["']([^"']+)["']/);
          const projectMatch = val.match(/projectId["']?\s*:\s*["']([^"']+)["']/);
          const domainMatch = val.match(/authDomain["']?\s*:\s*["']([^"']+)["']/);
          if (keyMatch && $('#fbApiKeyIn', box)) $('#fbApiKeyIn', box).value = keyMatch[1];
          if (projectMatch && $('#fbProjectIdIn', box)) $('#fbProjectIdIn', box).value = projectMatch[1];
          if (domainMatch && $('#fbAuthDomainIn', box)) $('#fbAuthDomainIn', box).value = domainMatch[1];
        } catch (_) {}
      };

      $('#fbSaveBtn', box).onclick = async () => {
        const apiKey = $('#fbApiKeyIn', box).value.trim();
        const projectId = $('#fbProjectIdIn', box).value.trim();
        const authDomain = $('#fbAuthDomainIn', box).value.trim();

        if (!apiKey) {
          return toast('Please enter a Firebase API Key', 'err');
        }

        try {
          const res = await api('/api/config/firebase', {
            method: 'POST',
            body: { apiKey, projectId, authDomain }
          });
          if (res.ok) {
            toast('Firebase credentials saved successfully! Initializing…');
            await initFirebaseClient(true);
            closeModal();
          }
        } catch (err) {
          toast(`Failed to save Firebase config: ${err.message}`, 'err');
        }
      };
    });
  }).catch(err => {
    toast(`Failed to load config: ${err.message}`, 'err');
  });
}

// ---------------- Google Firebase Email Verification Link (%LINK%) Authentication ----------------

// ---------------- Google Firebase & Fireupp Security Verification Link Engine ----------------

function showSecurityEmailLinkModal({ email, purpose, title, subtitle, onVerified, danger = false }) {
  return new Promise((resolve, reject) => {
    let pollInterval = null;
    let currentToken = null;
    let isCompleted = false;

    const cleanup = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const modalTitle = title || '✉️ Verify Your Gmail Address';
    showModal(modalTitle, `
      <div class="col gap-m" style="max-width:440px;text-align:center;padding:12px 6px;">
        <div style="font-size:46px;line-height:1;margin-bottom:6px;">${danger ? '⚠️' : '📬'}</div>
        <h3 style="margin:0;font-size:18px;font-weight:700;">Check Your Gmail Inbox</h3>
        <p class="muted" style="line-height:1.55;font-size:13.5px;margin:4px 0 12px 0;">
          ${subtitle || `A verification link has been dispatched to <b>${esc(email)}</b>. Open your Gmail and click the link to confirm.`}
        </p>

        <div class="info-banner" id="secVerifyBanner" style="background:rgba(124,92,255,0.12);border:1px solid rgba(124,92,255,0.35);border-radius:12px;padding:12px 14px;font-size:13px;color:#c0adff;display:flex;align-items:center;justify-content:center;gap:10px;">
          <span class="spinner" id="secVerifySpinner" style="width:14px;height:14px;border-width:2px;"></span>
          <span id="secVerifyStatusText">Verification link sent! Waiting for email confirmation…</span>
        </div>

        <div class="row center gap-s" style="margin-top:16px;">
          <button type="button" class="btn ${danger ? 'danger glow' : 'primary glow'}" id="btnSecurityConfirmVerified">
            ${icon('check')} <span>I've Clicked the Verification Link</span>
          </button>
          <button type="button" class="btn ghost sm" id="btnSecurityResendLink">
            ${icon('mail')} <span>Resend Link</span>
          </button>
        </div>

        <!-- 6-digit confirmation code direct fallback -->
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);text-align:center">
          <span class="muted xs">Or enter the 6-digit code from your email:</span>
          <div class="row center gap-s" style="margin-top:8px">
            <input type="text" id="secVerifyCodeInput" maxlength="6" class="input sm" placeholder="123456" style="width:110px;text-align:center;letter-spacing:4px;font-weight:700;font-size:15px">
            <button type="button" class="btn ghost sm" id="btnSecVerifyCode">Verify Code</button>
          </div>
          <div id="secVerifyFallbackInfo" style="display:none;margin-top:10px;padding:8px 12px;background:rgba(255,255,255,0.06);border-radius:10px;font-size:12px;line-height:1.5;color:#d1d5db;"></div>
        </div>

        <p class="hint xs muted" style="margin-top:10px;line-height:1.4;">
          Check your Spam or Promotions folder if not in primary inbox.
        </p>
      </div>
    `, async box => {
      hydrateIcons(box);

      const banner = $('#secVerifyBanner', box);
      const spinner = $('#secVerifySpinner', box);
      const statusText = $('#secVerifyStatusText', box);
      const confirmBtn = $('#btnSecurityConfirmVerified', box);
      const resendBtn = $('#btnSecurityResendLink', box);
      const codeInp = $('#secVerifyCodeInput', box);
      const codeBtn = $('#btnSecVerifyCode', box);

      const dispatchLink = async () => {
        try {
          const res = await api('/api/auth/send-verification-link', {
            method: 'POST',
            body: { email, purpose }
          });
          if (res.token) {
            currentToken = res.token;
          }
          if (res.code) {
            const fallbackBadge = $('#secVerifyFallbackInfo', box);
            if (fallbackBadge) {
              fallbackBadge.innerHTML = `💡 <b>Direct confirmation:</b> Code <code style="color:#a8c7fa;font-size:14px;letter-spacing:2px;font-weight:700">${res.code}</code> (<a href="${res.verifyUrl}" target="_blank" style="color:#f59e0b;font-weight:700;text-decoration:underline">click to confirm now</a>)`;
              fallbackBadge.style.display = 'block';
            }
          }
          try {
            const fbUser = firebase?.auth?.()?.currentUser;
            if (fbUser) await fbUser.sendEmailVerification();
          } catch (_) {}
        } catch (err) {
          toast(err.message, 'err');
        }
      };

      await dispatchLink();

      const proceedSuccess = async (tok) => {
        if (isCompleted) return;
        isCompleted = true;
        cleanup();
        if (banner) {
          banner.style.background = 'rgba(34,197,94,0.18)';
          banner.style.borderColor = 'rgba(34,197,94,0.5)';
          banner.style.color = '#4ade80';
        }
        if (spinner) spinner.style.display = 'none';
        if (statusText) statusText.innerHTML = '✅ Gmail verified successfully! Proceeding…';
        toast('Gmail verified successfully!');
        setTimeout(async () => {
          closeModal();
          try {
            if (onVerified) await onVerified(tok);
            resolve(tok);
          } catch (err) {
            toast(err.message, 'err');
            reject(err);
          }
        }, 600);
      };

      const checkFirebaseVerified = async () => {
        try {
          const fbUser = firebase?.auth?.()?.currentUser;
          if (fbUser) {
            await fbUser.reload();
            if (fbUser.emailVerified) {
              if (currentToken) {
                await api('/api/auth/verify-firebase', {
                  method: 'POST',
                  body: { token: currentToken, email }
                }).catch(() => {});
              }
              return true;
            }
          }
        } catch (_) {}
        return false;
      };

      pollInterval = setInterval(async () => {
        if (!currentToken || isCompleted) return;
        try {
          const st = await api(`/api/auth/verify-status?token=${encodeURIComponent(currentToken)}`);
          if (st.verified) {
            await proceedSuccess(currentToken);
            return;
          }
        } catch (_) {}
        if (await checkFirebaseVerified()) {
          await proceedSuccess(currentToken);
        }
      }, 2000);

      confirmBtn.onclick = async () => {
        if (!currentToken) return toast('Initializing verification session, please wait…', 'err');
        try {
          confirmBtn.disabled = true;
          confirmBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> Verifying…`;

          if (await checkFirebaseVerified()) {
            await proceedSuccess(currentToken);
            return;
          }

          const chk = await api('/api/auth/check-verified', {
            method: 'POST',
            body: { token: currentToken }
          });
          if (chk.verified) {
            await proceedSuccess(currentToken);
          } else {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `${icon('check')} <span>I've Clicked the Verification Link</span>`;
            hydrateIcons(confirmBtn);
            toast('The verification link has not been clicked yet. Please open your Gmail, click the link, and try again.', 'err');
          }
        } catch (err) {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = `${icon('check')} <span>I've Clicked the Verification Link</span>`;
          hydrateIcons(confirmBtn);
          toast(err.message || 'Verification link not clicked yet.', 'err');
        }
      };

      resendBtn.onclick = async () => {
        try {
          resendBtn.disabled = true;
          resendBtn.innerHTML = `<span class="spinner" style="width:12px;height:12px;border-width:2px;display:inline-block"></span> Sending…`;
          await dispatchLink();
          toast(`✉️ New verification link dispatched to ${email}!`);
          setTimeout(() => {
            resendBtn.disabled = false;
            resendBtn.innerHTML = `${icon('mail')} <span>Resend Link</span>`;
            hydrateIcons(resendBtn);
          }, 5000);
        } catch (err) {
          resendBtn.disabled = false;
          resendBtn.innerHTML = `${icon('mail')} <span>Resend Link</span>`;
          hydrateIcons(resendBtn);
          toast(err.message, 'err');
        }
      };

      codeBtn.onclick = async () => {
        const val = codeInp.value.trim();
        if (!val || val.length !== 6) return toast('Please enter the 6-digit code from your email', 'err');
        try {
          codeBtn.disabled = true;
          codeBtn.textContent = 'Verifying…';
          const r = await api('/api/auth/verify-code-direct', {
            method: 'POST',
            body: { token: currentToken, code: val }
          });
          if (r.verified) {
            await proceedSuccess(currentToken);
          }
        } catch (e) {
          codeBtn.disabled = false;
          codeBtn.textContent = 'Verify Code';
          toast(e.message, 'err');
        }
      };

      const closeBtn = $('#modalClose');
      if (closeBtn) {
        const origClose = closeBtn.onclick;
        closeBtn.onclick = (e) => {
          cleanup();
          if (origClose) origClose.call(closeBtn, e);
          reject(new Error('Email verification cancelled.'));
        };
      }
    });
  });
}

// Backward compatibility alias
const showEmailLinkVerificationModal = showSecurityEmailLinkModal;
const showLoginEmailLinkModal = showSecurityEmailLinkModal;

async function processFirebaseGoogleUser(fbUser) {
  if (!fbUser || !fbUser.email) {
    throw new Error('Google did not return a verified email address.');
  }

  const cleanEmail = fbUser.email.toLowerCase().trim();
  const idToken = await fbUser.getIdToken();
  const saltRes = await api(`/api/auth/salt?query=${encodeURIComponent(cleanEmail)}`);
  const googleSecret = `gauth:${fbUser.uid}:${cleanEmail}`;

  if (saltRes.exists) {
    const kdfSalt = saltRes.kdfSalt;
    const { authKey, encKey } = await E2E.deriveMaster(googleSecret, kdfSalt);
    const res = await api('/api/auth/google/firebase', {
      method: 'POST',
      body: {
        email: cleanEmail,
        name: fbUser.displayName || saltRes.name || cleanEmail.split('@')[0],
        avatar: null, // Do not use Google external photo; non-profile users render classic colorful avatar
        firebaseUid: fbUser.uid,
        idToken
      }
    });
    let privJwk, vaultRaw;
    try {
      const unwrapped = await E2E.unwrapIdentity(encKey, res.user);
      privJwk = unwrapped.privJwk;
      vaultRaw = unwrapped.vaultRaw;
    } catch (_) {
      const newId = await E2E.generateIdentity(encKey);
      privJwk = newId.privJwk;
      vaultRaw = newId.vaultRaw;
      await api('/api/auth/google/update-keys', {
        method: 'POST',
        body: {
          email: cleanEmail,
          firebaseUid: fbUser.uid,
          kdfSalt,
          publicKey: newId.publicKey,
          wrappedPrivateKey: newId.wrappedPrivateKey,
          wrappedVaultKey: newId.wrappedVaultKey
        }
      }).catch(() => {});
    }
    await establishSession(res.token, res.user, privJwk, vaultRaw);
    toast(`Signed in with Google as ${fbUser.displayName || cleanEmail}!`, 'ok');
    if (res.isNew || res.user?.customUsernameSet === false) {
      setTimeout(() => openUsernameSetupModal(), 400);
    }
  } else {
    const kdfSalt = E2E.b64(E2E.rand(16));
    const { authKey, encKey } = await E2E.deriveMaster(googleSecret, kdfSalt);
    const newId = await E2E.generateIdentity(encKey);
    const res = await api('/api/auth/google/firebase', {
      method: 'POST',
      body: {
        email: cleanEmail,
        name: fbUser.displayName || cleanEmail.split('@')[0],
        avatar: null, // Do not use Google external photo; non-profile users render classic colorful avatar
        firebaseUid: fbUser.uid,
        idToken,
        kdfSalt,
        publicKey: newId.publicKey,
        wrappedPrivateKey: newId.wrappedPrivateKey,
        wrappedVaultKey: newId.wrappedVaultKey
      }
    });
    await establishSession(res.token, res.user, newId.privJwk, newId.vaultRaw);
    toast(`Welcome to Zovio, ${fbUser.displayName || cleanEmail}!`, 'ok');
    if (res.isNew || res.user?.customUsernameSet === false) {
      setTimeout(() => openUsernameSetupModal(), 400);
    }
  }
}

async function loginWithGoogleFirebase() {
  $('#authError').classList.add('hidden');
  $('#authBusy').classList.remove('hidden');

  // If running inside Native Desktop App (Electron): open external browser (Chrome) for 1-click login
  if (window.fireuppNative?.isElectron && window.fireuppNative?.openExternal) {
    const authSessionId = 'fu_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    let pollInterval = null;
    let isCompleted = false;

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const handleAuthSuccess = async (data) => {
      if (isCompleted) return;
      isCompleted = true;
      stopPolling();
      try { window.fireuppNative?.focusWindow?.(); } catch (_) {}

      $('#authBusy').classList.remove('hidden');
      $('#authBusy').innerHTML = `<span class="spinner"></span> Welcome! Signing in as ${esc(data.email || 'user')}...`;
      try {
        await processFirebaseGoogleUser({
          uid: data.uid,
          email: data.email,
          displayName: data.name,
          getIdToken: async () => data.token
        });
        toast(`Welcome back, ${data.name || data.email}!`);
      } catch (err) {
        console.error('[auth] Failed to process desktop auth token:', err);
        toast(err.message || 'Authentication failed', 'err');
        $('#authError').textContent = err.message || 'Authentication failed';
        $('#authError').classList.remove('hidden');
      } finally {
        $('#authBusy').classList.add('hidden');
      }
    };

    window._desktopAuthSessionHandler = handleAuthSuccess;

    // Fast polling fallback: synchronizes within milliseconds even if Chrome protocol prompt is ignored!
    pollInterval = setInterval(async () => {
      if (isCompleted) return stopPolling();
      try {
        const res = await api(`/api/auth/desktop-session?session=${authSessionId}`);
        if (res && res.ready && res.authData) {
          handleAuthSuccess(res.authData);
        }
      } catch (_) {}
    }, 800);

    // Timeout after 3 minutes
    setTimeout(() => {
      if (!isCompleted) {
        stopPolling();
        $('#authBusy').classList.add('hidden');
      }
    }, 180000);

    $('#authBusy').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0;">
        <span class="spinner"></span>
        <div style="font-weight:700;font-size:14.5px;color:#fff;">Opening Chrome for Sign-In...</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.7);line-height:1.45;max-width:280px;text-align:center;">
          Please select your Google Account in Chrome. Zovio will log in automatically.
        </div>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button type="button" class="btn sm primary" id="reopenChromeBtn" style="padding:6px 14px;font-size:12px;">Re-open Chrome</button>
          <button type="button" class="btn sm ghost" id="cancelDesktopAuthBtn" style="padding:6px 14px;font-size:12px;">Cancel</button>
        </div>
      </div>
    `;

    const openBrowser = () => {
      window.fireuppNative.openExternal(`https://fireupp.up.railway.app/desktop-auth.html?session=${authSessionId}`);
    };

    openBrowser();

    setTimeout(() => {
      document.getElementById('reopenChromeBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openBrowser();
      });
      document.getElementById('cancelDesktopAuthBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        stopPolling();
        $('#authBusy').classList.add('hidden');
      });
    }, 100);

    return;
  }

  try {
    await initFirebaseClient();
    if (!window.firebase?.auth) {
      throw new Error('Google Firebase Auth SDK is not available.');
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    let fbUser;
    try {
      const result = await firebase.auth().signInWithPopup(provider);
      fbUser = result.user;
      try { window.location.href = 'fireupp-action://close-popups'; } catch (_) {}
    } catch (popupErr) {
      if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
        console.log('[auth] Popup blocked by webview, falling back to signInWithRedirect...');
        $('#authBusy').innerHTML = '<span class="spinner"></span> Redirecting to Google Sign-In…';
        await firebase.auth().signInWithRedirect(provider);
        return;
      }
      throw popupErr;
    }
    await processFirebaseGoogleUser(fbUser);
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') {
      toast('Google Sign-In was closed.');
    } else {
      $('#authError').textContent = err.message || 'Google authentication failed.';
      $('#authError').classList.remove('hidden');
      toast(err.message || 'Google authentication failed.', 'err');
    }
  } finally {
    $('#authBusy').classList.add('hidden');
  }
}

async function performEmailLogin({ emailOrUser, password }) {
  const cleanIdent = String(emailOrUser || '').trim().toLowerCase();
  if (!cleanIdent) throw new Error('Please enter your email address or username');
  if (!password) throw new Error('Please enter your password');

  const saltRes = await api(`/api/auth/salt?query=${encodeURIComponent(cleanIdent)}`);
  if (!saltRes.exists) {
    throw new Error('No account found with this email or username. Please click "Create Account".');
  }

  const { authKey, encKey } = await E2E.deriveMaster(password, saltRes.kdfSalt);

  await completeEmailLoginWithToken(cleanIdent, authKey, encKey);
}

async function completeEmailLoginWithToken(cleanIdent, authKey, encKey, verificationToken = null) {
  const { token, user } = await api('/api/auth/login-email', {
    method: 'POST',
    body: {
      emailOrUser: cleanIdent,
      authKey,
      verificationToken
    }
  });

  const { privJwk, vaultRaw } = await E2E.unwrapIdentity(encKey, user);
  await establishSession(token, user, privJwk, vaultRaw);
}

async function performEmailSignup({ name, email, password, confirmPassword }) {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanName) throw new Error('Please enter your full name');
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please enter a valid email address (e.g. name@gmail.com)');
  }

  const pwErr = validatePassword(password);
  if (pwErr) throw new Error(pwErr);

  if (password !== confirmPassword) {
    throw new Error('Passwords do not match. Please re-type your password.');
  }

  // Pre-check if email already exists on Zovio
  const saltRes = await api(`/api/auth/salt?query=${encodeURIComponent(cleanEmail)}`);
  if (saltRes.exists) {
    throw new Error('An account with this email address already exists. Please sign in.');
  }

  await initFirebaseClient();
  let fbUser = null;
  if (window.firebase?.auth && firebaseApp) {
    try {
      const fbCred = await firebase.auth().createUserWithEmailAndPassword(cleanEmail, password);
      fbUser = fbCred.user;
    } catch (fbErr) {
      if (fbErr.code === 'auth/email-already-in-use') {
        try {
          const cred = await firebase.auth().signInWithEmailAndPassword(cleanEmail, password);
          fbUser = cred.user;
        } catch (_) {}
      }
    }
  }

  await completeEmailSignup({ name: cleanName, email: cleanEmail, password, fbUser });
}

async function completeEmailSignup({ name, email, password, fbUser, verificationToken = null }) {
  const kdfSalt = E2E.b64(E2E.rand(16));
  const { authKey, encKey } = await E2E.deriveMaster(password, kdfSalt);
  const id = await E2E.generateIdentity(encKey);

  const { token, user } = await api('/api/auth/signup-email', {
    method: 'POST',
    body: {
      name,
      email,
      firebaseUid: fbUser ? fbUser.uid : null,
      emailVerified: true,
      authKey,
      kdfSalt,
      publicKey: id.publicKey,
      wrappedPrivateKey: id.wrappedPrivateKey,
      wrappedVaultKey: id.wrappedVaultKey,
      verificationToken
    }
  });

  await establishSession(token, user, id.privJwk, id.vaultRaw);
}

function openForgotPasswordModal() {
  showModal('Reset Your Password', `
    <div class="col gap-m" style="max-width:440px" id="forgotPwModalBody">
      <div style="font-size:36px;text-align:center;margin-bottom:2px">🔑</div>
      <p class="muted xs" style="line-height:1.55;text-align:center;">
        Enter your registered Gmail address. Google Firebase will dispatch an official password reset link directly to your inbox.
      </p>
      <label class="col gap-xs">
        <span class="muted xs">Your Registered Gmail Address</span>
        <input type="email" id="forgotEmailIn" placeholder="name@gmail.com" required autocomplete="email">
      </label>
      <div class="row end gap-s" style="margin-top:16px">
        <button type="button" class="btn ghost" id="forgotCancelBtn">Cancel</button>
        <button type="button" class="btn primary glow" id="forgotSendLinkBtn">Send Reset Link to Gmail</button>
      </div>
    </div>
  `, box => {
    $('#forgotCancelBtn', box).onclick = closeModal;
    $('#forgotSendLinkBtn', box).onclick = async () => {
      const email = ($('#forgotEmailIn', box)?.value || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return toast('Please enter a valid email address', 'err');
      }
      try {
        await initFirebaseClient();
        if (window.firebase?.auth && firebaseApp) {
          await firebase.auth().sendPasswordResetEmail(email);
          toast(`✉️ Password reset link sent to ${email} from Google Firebase! Check your inbox.`);
          closeModal();
        } else {
          toast('Firebase Auth is not initialized yet', 'err');
        }
      } catch (err) {
        toast(err.message, 'err');
      }
    };
  });
}

// SECTION 2: Perform Google Authentication
async function performGoogleAuth({ email, name, avatar, phone, password, username }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.endsWith('@gmail.com')) {
    throw new Error('Please select a valid @gmail.com Google account');
  }
  const cleanPhone = String(phone || '').trim();
  if (!cleanPhone || cleanPhone.replace(/[^0-9]/g, '').length < 10) {
    throw new Error('Please enter a valid 10-digit mobile number with country code');
  }
  const pwErr = validatePassword(password);
  if (pwErr) throw new Error(pwErr);

  const cleanUser = String(username || cleanEmail.split('@')[0]).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!cleanUser || cleanUser.length < 3) {
    throw new Error('Please choose a username of at least 3 letters, numbers or underscores');
  }

  const saltRes = await api(`/api/auth/salt?email=${encodeURIComponent(cleanEmail)}`);

  if (saltRes.exists) {
    // Existing user sign-in
    const { authKey, encKey } = await E2E.deriveMaster(password, saltRes.kdfSalt);
    const { token, user } = await api('/api/auth/google', {
      method: 'POST',
      body: {
        email: cleanEmail,
        name: name || saltRes.name,
        avatar,
        phone: cleanPhone,
        authKey
      }
    });
    const { privJwk, vaultRaw } = await E2E.unwrapIdentity(encKey, user);
    await establishSession(token, user, privJwk, vaultRaw);
  } else {
    // New user registration
    const kdfSalt = E2E.b64(E2E.rand(16));
    const { authKey, encKey } = await E2E.deriveMaster(password, kdfSalt);
    const id = await E2E.generateIdentity(encKey);

    const { token, user } = await api('/api/auth/google', {
      method: 'POST',
      body: {
        email: cleanEmail,
        name: String(name || cleanEmail.split('@')[0]).trim(),
        avatar,
        phone: cleanPhone,
        username: cleanUser,
        kdfSalt,
        authKey,
        publicKey: id.publicKey,
        wrappedPrivateKey: id.wrappedPrivateKey,
        wrappedVaultKey: id.wrappedVaultKey
      }
    });
    await establishSession(token, user, id.privJwk, id.vaultRaw);
  }
}

async function loadGoogleAccount({ email, name, avatar, color }) {
  activeGoogleAccount = {
    email: email.trim().toLowerCase(),
    name: (name || email.split('@')[0]).trim(),
    avatar: avatar || null,
    color: color || '#1a73e8'
  };

  $('#gaName').textContent = activeGoogleAccount.name;
  $('#gaEmail').textContent = activeGoogleAccount.email;

  const userSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
  if (activeGoogleAccount.avatar) {
    $('#gaAvatar').innerHTML = `<img src="${esc(activeGoogleAccount.avatar)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
  } else {
    $('#gaAvatar').style.background = activeGoogleAccount.color || '#1a73e8';
    $('#gaAvatar').innerHTML = userSvg;
  }

  $('#authError').classList.add('hidden');
  $('#authMainView').classList.add('hidden');
  $('#googleAuthStep2').classList.remove('hidden');

  // Explicitly clear phone and password inputs so NO AUTOFILL occurs!
  $('#authPhone').value = '';
  $('#authPassword').value = '';

  const defaultUser = activeGoogleAccount.email.split('@')[0].replace(/[^a-z0-9_]/g, '');
  $('#authUsername').value = defaultUser;

  try {
    const saltRes = await api(`/api/auth/salt?email=${encodeURIComponent(activeGoogleAccount.email)}`);
    activeGoogleAccount.exists = saltRes.exists;
    activeGoogleAccount.kdfSalt = saltRes.kdfSalt;

    if (saltRes.exists) {
      if (saltRes.name) $('#gaName').textContent = saltRes.name;
      if (saltRes.username) $('#authUsername').value = saltRes.username;
      $('#authSubmitText').textContent = 'Sign In to Zovio';
      $('#authPhone').focus();
    } else {
      $('#authSubmitText').textContent = 'Complete & Enter Zovio';
      $('#authUsername').focus();
    }
  } catch (err) {
    console.error(err);
  }
}

function openUsernameSetupModal() {
  const current = S.user?.username || '';
  let checkTimer = null;

  showModal('Choose Your Unique @username', `
    <div class="col gap-m username-setup-modal-wrap">
      <div class="username-setup-banner">
        <div class="username-setup-icon">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"></path>
          </svg>
        </div>
        <h4 style="margin:0 0 6px;font-size:18px;font-weight:800;color:var(--text-0)">Set Your Custom @username</h4>
        <p class="muted xs" style="line-height:1.6;max-width:390px;margin:0 auto">
          On Zovio, friends and contacts search and connect with you using your unique <strong>@username</strong>, not your display name. Choose your custom handle!
        </p>
      </div>

      <div class="col gap-xs" style="text-align:left">
        <label class="muted xs" style="font-weight:700">Custom Handle</label>
        <div class="username-field-container" id="setupUsernameBox">
          <span class="username-prefix">@</span>
          <input type="text" id="setupUsernameIn" value="${esc(current)}" placeholder="username" autocomplete="off" spellcheck="false" maxlength="30" autofocus>
          <span class="username-status-badge" id="setupUsernameBadge"></span>
        </div>
        <span class="muted xs" id="setupUsernameHelp" style="font-size:11.5px;margin-top:2px">Letters, numbers, and underscores (3–30 characters).</span>
      </div>

      <div class="username-setup-preview-card">
        <div id="setupUserPreviewAva">${avatarHTML(S.user, 'sm')}</div>
        <div class="col" style="gap:2px">
          <strong style="font-size:13.5px;color:var(--text-0)">${esc(S.user?.name || 'Your Name')}</strong>
          <span class="muted xs" id="setupHandlePreview" style="color:var(--primary);font-weight:600">@${esc(current)}</span>
        </div>
      </div>

      <div class="username-setup-actions">
        <button type="button" class="username-setup-keep-btn" id="setupKeepDefaultBtn" title="Keep this handle">
          Keep @${esc(current)}
        </button>
        <button type="button" class="username-setup-save-btn" id="setupSaveUsernameBtn" disabled>
          Claim @username &amp; Continue
        </button>
      </div>
    </div>
  `, box => {
    const input = $('#setupUsernameIn', box);
    const boxContainer = $('#setupUsernameBox', box);
    const badge = $('#setupUsernameBadge', box);
    const help = $('#setupUsernameHelp', box);
    const preview = $('#setupHandlePreview', box);
    const saveBtn = $('#setupSaveUsernameBtn', box);
    const keepBtn = $('#setupKeepDefaultBtn', box);

    function updateBadge(state, text) {
      boxContainer.classList.remove('valid', 'invalid');
      badge.className = 'username-status-badge';
      if (state === 'ok') {
        boxContainer.classList.add('valid');
        badge.classList.add('ok');
        badge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> <span>${esc(text)}</span>`;
        saveBtn.disabled = false;
      } else if (state === 'err') {
        boxContainer.classList.add('invalid');
        badge.classList.add('err');
        badge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> <span>${esc(text)}</span>`;
        saveBtn.disabled = true;
      } else if (state === 'checking') {
        badge.classList.add('checking');
        badge.innerHTML = `<span>Checking…</span>`;
        saveBtn.disabled = true;
      } else {
        badge.innerHTML = '';
        saveBtn.disabled = true;
      }
    }

    async function checkAvailability(val) {
      if (!val || val.length < 3) {
        updateBadge('err', 'Min 3 chars');
        return;
      }
      if (!/^[a-z0-9_]{3,30}$/.test(val)) {
        updateBadge('err', 'Invalid format');
        return;
      }
      if (val === current) {
        updateBadge('ok', 'Current handle');
        return;
      }
      updateBadge('checking');
      try {
        const res = await api(`/api/users/check-username?username=${encodeURIComponent(val)}`);
        if (res.available) {
          updateBadge('ok', 'Available');
        } else {
          updateBadge('err', res.error || 'Already taken');
        }
      } catch (e) {
        updateBadge('err', 'Check failed');
      }
    }

    input.oninput = () => {
      const clean = input.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
      input.value = clean;
      preview.textContent = `@${clean || 'username'}`;
      clearTimeout(checkTimer);
      if (!clean) {
        updateBadge('', '');
        return;
      }
      if (clean.length < 3) {
        updateBadge('err', 'Min 3 chars');
        return;
      }
      checkTimer = setTimeout(() => checkAvailability(clean), 220);
    };

    if (current && /^[a-z0-9_]{3,30}$/.test(current)) {
      updateBadge('ok', 'Available');
      saveBtn.disabled = false;
    }

    async function commitUsername(chosenHandle) {
      saveBtn.disabled = true;
      if (keepBtn) keepBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try {
        const updated = await api('/api/me', {
          method: 'PATCH',
          body: {
            username: chosenHandle,
            customUsernameSet: true
          }
        });
        S.user = updated;
        S.users.set(updated.id, updated);
        renderMe();
        closeModal();
        SoundFX.play('friend');
        toast(`✨ Custom handle @${chosenHandle} confirmed! Friends can now find you.`, 'ok');
      } catch (err) {
        toast(err.message || 'Failed to update username', 'err');
        saveBtn.disabled = false;
        if (keepBtn) keepBtn.disabled = false;
        saveBtn.textContent = 'Claim @username & Continue';
      }
    }

    saveBtn.onclick = () => {
      const chosen = input.value.trim().toLowerCase();
      if (!chosen) return;
      commitUsername(chosen);
    };

    keepBtn.onclick = () => {
      commitUsername(current);
    };

    setTimeout(() => { input.focus(); input.select(); }, 120);
  });
}

async function establishSession(token, user, privJwk, vaultRaw) {
  S.token = token;
  S.user = user;
  S.users.set(user.id, user);
  S.privateKey = await E2E.importPrivate(privJwk);
  S.vaultKey = await E2E.importKey(vaultRaw);
  const jwkStr = JSON.stringify(privJwk);
  // Persist across app restarts in localStorage
  localStorage.setItem('fireupp.token', token);
  localStorage.setItem('fireupp.privJwk', jwkStr);
  localStorage.setItem('fireupp.vaultRaw', vaultRaw);
  localStorage.setItem('tele.token', token);
  localStorage.setItem('tele.privJwk', jwkStr);
  localStorage.setItem('tele.vaultRaw', vaultRaw);
  // Keep sessionStorage in sync
  sessionStorage.setItem('fireupp.token', token);
  sessionStorage.setItem('fireupp.privJwk', jwkStr);
  sessionStorage.setItem('fireupp.vaultRaw', vaultRaw);
  sessionStorage.setItem('tele.token', token);
  sessionStorage.setItem('tele.privJwk', jwkStr);
  sessionStorage.setItem('tele.vaultRaw', vaultRaw);
  // Request desktop notification permission on successful sign-in
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
  await bootApp();
}

async function tryRestoreSession() {
  const token = localStorage.getItem('fireupp.token') || localStorage.getItem('tele.token') || sessionStorage.getItem('fireupp.token') || sessionStorage.getItem('tele.token');
  const privJwk = localStorage.getItem('fireupp.privJwk') || localStorage.getItem('tele.privJwk') || sessionStorage.getItem('fireupp.privJwk') || sessionStorage.getItem('tele.privJwk');
  const vaultRaw = localStorage.getItem('fireupp.vaultRaw') || localStorage.getItem('tele.vaultRaw') || sessionStorage.getItem('fireupp.vaultRaw') || sessionStorage.getItem('tele.vaultRaw');
  if (!token || !privJwk || !vaultRaw) return false;
  try {
    S.token = token;
    const user = await api('/api/me');
    await establishSession(token, user, JSON.parse(privJwk), vaultRaw);
    return true;
  } catch (err) {
    // Only wipe local session if server explicitly rejected auth (401/403)
    if (err && (err.status === 401 || err.status === 403)) {
      console.warn('[auth] Session rejected by server (401/403), clearing credentials');
      localStorage.removeItem('fireupp.token');
      localStorage.removeItem('fireupp.privJwk');
      localStorage.removeItem('fireupp.vaultRaw');
      localStorage.removeItem('tele.token');
      localStorage.removeItem('tele.privJwk');
      localStorage.removeItem('tele.vaultRaw');
      sessionStorage.clear();
      S.token = null;
      return false;
    }
    // If it's a network glitch or server restart (500/502/503), preserve credentials
    console.warn('[auth] Temporary connection issue during session restore, preserving login:', err?.message || err);
    return false;
  }
}

function logout() {
  if (S.ws) S.ws.close();
  localStorage.removeItem('fireupp.token');
  localStorage.removeItem('fireupp.privJwk');
  localStorage.removeItem('fireupp.vaultRaw');
  localStorage.removeItem('tele.token');
  localStorage.removeItem('tele.privJwk');
  localStorage.removeItem('tele.vaultRaw');
  sessionStorage.clear();
  location.reload();
}

// ---------------- Windows Desktop Notifications ----------------
function showDesktopNotification(title, opts = {}) {
  try {
    const prefs = S.user?.preferences || S.user?.prefs || {};
    if (!opts.forceTest) {
      if (prefs.winNotifications === false) return;
      if (opts.category === 'dm' && prefs.notifyDMs === false) return;
      if (opts.category === 'group' && prefs.notifyGroups === false) return;
      if (opts.category === 'channel' && prefs.notifyChannels === false) return;
      if (opts.category === 'call' && prefs.notifyCalls === false) return;
      if (opts.category === 'story' && prefs.notifyStories === false) return;
    }

    const hidePreview = prefs.notifyPreview === false && !opts.forceTest;
    const finalTitle = hidePreview ? 'Zovio — New Encrypted Activity' : title;
    const finalBody = hidePreview ? '🔒 Open Zovio to view encrypted content' : (opts.body || '');
    const isSilent = prefs.winSound === false || Boolean(opts.silent);
    const allowQuickReply = prefs.notifyQuickReply !== false && Boolean(opts.chatId) && !hidePreview;

    if (allowQuickReply && window.fireuppNative?.showQuickReplyNotif) {
      window.fireuppNative.showQuickReplyNotif({
        chatId: opts.chatId,
        title: finalTitle,
        body: finalBody
      });
      return;
    }

    if (window.fireuppNative?.notify) {
      window.fireuppNative.notify({
        title: finalTitle,
        body: finalBody,
        silent: isSilent,
        icon: opts.icon || '/icon.png'
      });
      return;
    }
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const notif = new Notification(finalTitle, {
        icon: '/icon.png',
        badge: '/icon.png',
        ...opts,
        body: finalBody,
        silent: isSilent
      });
      notif.onclick = () => {
        window.focus();
        if (typeof opts.onClick === 'function') opts.onClick();
        try {
          if (window.fireuppNative?.focusWindow) {
            window.fireuppNative.focusWindow();
          }
        } catch {}
      };
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch (err) {
    console.warn('Desktop notification error:', err);
  }
}
window.showDesktopNotification = showDesktopNotification;

// ---------------- App Boot & WebSocket ----------------
function hideZovioBootLoader() {
  const loader = document.getElementById('zovioBootLoader');
  if (!loader) return;
  loader.classList.add('fade-out');
  setTimeout(() => loader.remove(), 340);
}

async function bootApp() {
  $('#auth').classList.add('hidden');
  $('#app').classList.remove('hidden');
  renderMe();
  applyPreferencesEffects();

  const [cfg, allUsers, chats] = await Promise.all([
    api('/api/config').catch(() => S.config),
    api('/api/users').catch(() => []),
    api('/api/chats').catch(() => [])
  ]);
  if (cfg) S.config = cfg;

  // Load all reachable users into store so avatars and names always resolve smoothly
  (allUsers || []).forEach(u => u?.id && S.users.set(u.id, u));

  (chats || []).forEach(c => {
    (c.members || []).forEach(u => {
      if (typeof u === 'object' && u?.id) S.users.set(u.id, u);
    });
    S.chats.set(c.id, c);
  });
  if (!Array.from(S.chats.values()).some(c => c.type === 'self')) {
    const { keys } = await wrapNewChatKey([S.user]);
    const selfChat = await api('/api/chats/self', { method: 'POST', body: { keys } }).catch(() => null);
    if (selfChat && !selfChat.isDeleted && !(selfChat.deletedBy || []).includes(S.user?.id)) {
      S.chats.set(selfChat.id, selfChat);
    }
  }

  // Decrypt all chat lastMessages in parallel for instant startup
  await Promise.all(
    Array.from(S.chats.values())
      .filter(c => c.lastMessage)
      .map(c => decryptMsg(c, c.lastMessage).catch(() => {}))
  );

  connectWS();
  renderChatList();
  hideZovioBootLoader();

  loadStatuses();
  loadWorkspace();
  loadMeetings();
  loadCalls();

  // Warm the top 5 most recent chats in the background so opening them is instantaneous
  setTimeout(() => {
    const recentChats = Array.from(S.chats.values())
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 5);
    recentChats.forEach(async c => {
      if (S.msgs.has(c.id)) return;
      try {
        const rawMsgs = await api(`/api/chats/${c.id}/messages`);
        if (rawMsgs.length) await getChatKey(c, rawMsgs[0].keyVersion || c.keyVersion || 1).catch(() => {});
        await Promise.all(rawMsgs.map(m => decryptMsg(c, m).catch(() => {})));
        if (!S.msgs.has(c.id)) S.msgs.set(c.id, rawMsgs);
        if (window.ZovioLocalDB && S.user?.id) {
          ZovioLocalDB.saveChatMessages(S.user.id, c.id, rawMsgs).catch(() => {});
        }
        if (typeof scheduleAutoCacheChatMedia === 'function') {
          scheduleAutoCacheChatMedia(rawMsgs);
        }
      } catch {}
    });
  }, 350);

  if (S.user && S.user.customUsernameSet === false) {
    setTimeout(() => openUsernameSetupModal(), 450);
  }

  if (window.ZovioDriveBackup?.startScheduler) {
    window.ZovioDriveBackup.startScheduler();
  }
}

// ---------------- Presence / Idle / System Tray Activity ----------------
const IDLE_TIMEOUT_MS = 120000; // 2 minutes without interaction -> offline/idle
let _lastUserActivityAt = Date.now();
let _nativeWindowVisible = true;
let _lastSentPresenceActive = null;

function isAppPresenceActive() {
  if (document.hidden || !_nativeWindowVisible) return false;
  if (Date.now() - _lastUserActivityAt > IDLE_TIMEOUT_MS) return false;
  return true;
}

function syncPresenceStatus(force = false) {
  const active = isAppPresenceActive();
  if (!force && active === _lastSentPresenceActive) return;
  const becameActive = active && _lastSentPresenceActive === false;
  if (S.ws && S.ws.readyState === WebSocket.OPEN && S.token) {
    _lastSentPresenceActive = active;
    try { S.ws.send(JSON.stringify({ type: 'presence:status', active })); } catch {}
  }
  if (becameActive && S.activeChatId && S.user?.preferences?.readReceipts !== false) {
    const c = S.chats.get(S.activeChatId);
    if (c) {
      c.unread = 0;
      if (typeof renderChatList === 'function') renderChatList();
      api(`/api/chats/${c.id}/read`, { method: 'POST' }).catch(() => {});
    }
  }
}

(function initPresenceActivityWatchers() {
  const markActive = () => {
    _lastUserActivityAt = Date.now();
    syncPresenceStatus(false);
  };
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, markActive, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) _lastUserActivityAt = Date.now();
    syncPresenceStatus(false);
  });
  window.addEventListener('focus', () => {
    _nativeWindowVisible = true;
    _lastUserActivityAt = Date.now();
    syncPresenceStatus(false);
  });
  if (window.fireuppNative?.onWindowVisibility) {
    window.fireuppNative.onWindowVisibility(({ visible }) => {
      _nativeWindowVisible = !!visible;
      if (visible) _lastUserActivityAt = Date.now();
      syncPresenceStatus(false);
    });
  }
  setInterval(() => syncPresenceStatus(false), 15000);
})();

function connectWS() {
  clearTimeout(S._wsReconnectTimer);
  clearInterval(S._wsPingTimer);
  if (S.ws) {
    try {
      S.ws.onclose = null;
      S.ws.onmessage = null;
      S.ws.onerror = null;
      S.ws.close();
    } catch {}
    S.ws = null;
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}`);
  ws.binaryType = 'arraybuffer';
  S.ws = ws;
  ws.onopen = () => {
    if (S.ws !== ws) return;
    const active = isAppPresenceActive();
    _lastSentPresenceActive = active;
    ws.send(JSON.stringify({ type: 'auth', token: S.token, active }));
    clearInterval(S._wsPingTimer);
    S._wsPingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ type: 'ping' })); } catch {}
      }
    }, 25000);
  };
  ws.onerror = () => {};
  ws.onclose = () => {
    clearInterval(S._wsPingTimer);
    if (S.ws !== ws) return;
    S._wsReconnectTimer = setTimeout(() => S.token && connectWS(), 2000);
  };
  ws.onmessage = async ev => {
    if (S.ws !== ws) return;
    if (ev.data instanceof ArrayBuffer) {
      if (typeof window.handleMeetBinaryMedia === 'function') window.handleMeetBinaryMedia(ev.data);
      return;
    }
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.type === 'pong') return;
    switch (msg.type) {
      case 'auth:ok': {
        if (msg.buildHash) {
          const prevHash = S.bootBuildHash || localStorage.getItem('fireupp.installedBuildHash');
          if (!S.bootBuildHash) {
            S.bootBuildHash = msg.buildHash;
            if (!prevHash) localStorage.setItem('fireupp.installedBuildHash', msg.buildHash);
          }
          if (prevHash && prevHash !== msg.buildHash) {
            showInAppUpdatePrompt({
              version: msg.version || '1.0.42',
              buildHash: msg.buildHash,
              downloadUrl: 'https://fireupp.up.railway.app/download/Zovio_Setup.exe?v=' + msg.buildHash
            });
          }
        }
        break;
      }
      case 'chat:upsert': {
        const c = msg.chat;
        if (c.isDeleted || (c.deletedBy && c.deletedBy.includes(S.user?.id))) {
          S.chats.delete(c.id);
          renderChatList();
          break;
        }
        // Do not add empty incoming draft DMs if recipient hasn't accepted and no message exists
        if (c.type === 'dm' && c.ownerId !== S.user?.id && !c.isAccepted && !c.lastMessage) {
          break;
        }
        (c.members || []).forEach(u => S.users.set(u.id, u));
        if (c.lastMessage) await decryptMsg(c, c.lastMessage);
        S.chats.set(c.id, c);
        renderChatList();
        if (S.activeChatId === c.id) renderConvoHead();
        if (S.infoOpen && S.activeChatId === c.id) renderInfoPane();
        break;
      }
      case 'chat:removed': {
        S.chats.delete(msg.chatId);
        if (S.activeChatId === msg.chatId) {
          S.activeChatId = null;
          $('#convo').classList.add('hidden');
          $('#chatEmpty').classList.remove('hidden');
          $('#infoPane').classList.add('hidden');
        }
        renderChatList();
        break;
      }
      case 'msg:new':
      case 'msg:update': {
        await onIncomingMessage(msg.message, msg.type === 'msg:new');
        break;
      }
      case 'msg:delete-for-me': {
        const list = S.msgs.get(msg.chatId) || [];
        S.msgs.set(msg.chatId, list.filter(m => m.id !== msg.messageId));
        if (S.activeChatId === msg.chatId) {
          renderMessages('preserve');
          if (typeof window.updateInfoPaneCounters === 'function') window.updateInfoPaneCounters(msg.chatId);
        }
        break;
      }
      case 'presence': {
        const u = S.users.get(msg.userId);
        if (u) { u.online = msg.online; u.lastSeen = msg.lastSeen; }
        S.chats.forEach(c => (c.members || []).forEach(m => {
          if (m.id === msg.userId) { m.online = msg.online; m.lastSeen = msg.lastSeen; }
        }));
        renderChatList();
        if (S.activeChatId) renderConvoHead();
        break;
      }
      case 'typing': {
        onTypingEvent(msg);
        break;
      }
      case 'status:upsert': {
        const st = msg.status;
        if (st.user) S.users.set(st.user.id, st.user);
        const idx = S.statuses.findIndex(x => x.id === st.id);
        if (idx >= 0) S.statuses[idx] = st; else S.statuses.unshift(st);
        updateStatusBadge();
        if (S.view === 'status') renderStatusView();
        break;
      }
      case 'status:removed': {
        S.statuses = S.statuses.filter(x => x.id !== msg.id);
        updateStatusBadge();
        if (S.view === 'status') renderStatusView();
        break;
      }
      case 'statuses:refresh': {
        loadStatuses();
        break;
      }
      case 'user:self': {
        if (msg.user) {
          Object.assign(S.user, msg.user);
          renderMe();
          if (S.view === 'profile') renderProfileView(currentSettingsTab);
          if (S.activeChatId) {
            renderConvoHead();
            if (S.infoOpen) renderInfoPane();
          }
        }
        break;
      }
      case 'meeting:upsert': {
        const idx = S.meetings.findIndex(m => m.id === msg.meeting.id || (m.code && m.code === msg.meeting.code));
        if (idx >= 0) S.meetings[idx] = msg.meeting; else S.meetings.unshift(msg.meeting);
        if (S.view === 'meetings' || S.view === 'calls') renderMeetingsView();
        break;
      }
      case 'meeting:removed': {
        S.meetings = S.meetings.filter(m => m.id !== msg.id);
        if (S.view === 'meetings' || S.view === 'calls') renderMeetingsView();
        break;
      }
      case 'call:incoming':
        if (typeof window.showDesktopNotification === 'function') {
          window.showDesktopNotification(`Incoming Call from ${msg.callerName || 'Fireupp'}`, {
            body: `${msg.mode === 'video' ? '📹 Video' : '📞 Voice'} Call — Click to view`,
            tag: 'call-incoming'
          });
        }
        if (typeof window.handleIncomingCall === 'function') window.handleIncomingCall(msg);
        break;
      case 'call:accepted':
        if (typeof window.handleCallAccepted === 'function') window.handleCallAccepted(msg);
        break;
      case 'call:declined':
        if (typeof window.handleCallDeclined === 'function') window.handleCallDeclined(msg);
        break;
      case 'call:ended':
        if (typeof window.handleCallEnded === 'function') window.handleCallEnded(msg);
        break;
      case 'call:error':
        if (typeof window.handleCallError === 'function') window.handleCallError(msg);
        break;
      case 'call:history:new': {
        const c = msg.call;
        if (!c) break;
        const idx = S.calls.findIndex(x => x.id === c.id);
        if (idx >= 0) S.calls[idx] = c;
        else S.calls.unshift(c);
        updateCallsBadge();
        if ($('#chatCallsPane') && !$('#chatCallsPane').classList.contains('hidden')) {
          renderCallsView('#chatCallsPane');
        }
        if (typeof renderChatList === 'function') renderChatList();
        break;
      }
      case 'call:history:deleted': {
        if (!msg.callId) break;
        S.calls = S.calls.filter(c => c.id !== msg.callId);
        updateCallsBadge();
        if ($('#chatCallsPane') && !$('#chatCallsPane').classList.contains('hidden')) {
          renderCallsView('#chatCallsPane');
        }
        if (typeof renderChatList === 'function') renderChatList();
        break;
      }
      case 'meet:joined':
      case 'meet:peer':
      case 'meet:signal':
      case 'meet:state':
      case 'meet:media':
      case 'meet:reaction':
      case 'meet:left':
      case 'meet:error':
        handleMeetWS(msg);
        break;
    }
  };
}

// ---------------- Theme & Smooth Navigation ----------------
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('fireupp.theme', t);
  localStorage.setItem('tele.theme', t);
  const btn = $('#themeBtn');
  if (btn) {
    btn.querySelector('i').setAttribute('data-icon', t === 'dark' ? 'sun' : 'moon');
    hydrateIcons(btn);
  }
}

function switchView(view) {
  if (S.view !== view) SoundFX.play('nav');
  S.view = view;
  $$('.rail-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view || (b.dataset.view === 'calls' && view === 'meetings') || (b.dataset.view === 'meetings' && view === 'calls')));
  $('#meBtn')?.classList.toggle('active', view === 'profile');
  const callsEl = $('#view-calls') || $('#view-meetings');
  const views = {
    chats: $('#view-chats'),
    firecasts: $('#view-chats'),
    status: $('#view-status'),
    workspace: $('#view-workspace'),
    calls: callsEl,
    meetings: callsEl,
    profile: $('#view-profile')
  };
  $('#view-chats').classList.toggle('hidden', view !== 'chats' && view !== 'firecasts');
  $('#view-status').classList.toggle('hidden', view !== 'status');
  $('#view-workspace').classList.toggle('hidden', view !== 'workspace');
  if (callsEl) callsEl.classList.toggle('hidden', view !== 'calls' && view !== 'meetings');
  $('#view-profile').classList.toggle('hidden', view !== 'profile');

  const activeEl = views[view];
  if (activeEl) {
    activeEl.classList.remove('view-anim');
    void activeEl.offsetWidth;
    activeEl.classList.add('view-anim');
  }

  if (view === 'chats' || view === 'firecasts') {
    if (S.filter !== 'calls') S.filter = 'all';
    const isFire = view === 'firecasts';
    const c = S.activeChatId ? S.chats.get(S.activeChatId) : null;
    const isChannel = Boolean(c && c.type === 'channel');
    if (!c || (isFire && !isChannel) || (!isFire && isChannel)) {
      S.activeChatId = null;
      $('#view-chats')?.classList.remove('convo-open');
      const infoPaneEl = $('#infoPane');
      if (infoPaneEl) {
        infoPaneEl.classList.add('hidden');
        infoPaneEl.innerHTML = '';
        delete infoPaneEl.dataset.chatId;
      }
      $('#resizerRight')?.classList.add('hidden');
      $('#infoBtn')?.classList.remove('active');
      S.infoOpen = false;
      const msgsInnerEl = $('#msgsInner');
      if (msgsInnerEl) msgsInnerEl.innerHTML = '';
      const pinnedSlotEl = $('#pinnedBannerSlot');
      if (pinnedSlotEl) pinnedSlotEl.innerHTML = '';
      const convoEl = $('#convo');
      if (convoEl) {
        convoEl.classList.add('hidden');
        delete convoEl.dataset.chatId;
      }
      const empty = $('#chatEmpty');
      if (empty) {
        empty.classList.remove('hidden');
        empty.innerHTML = isFire ? `
          <div class="empty-art"><i data-icon="flame"></i></div>
          <h3>Welcome to ZovioCasts 🔥</h3>
          <p>Explore public channels, follow broadcast feeds, or launch your own ZovioCast.</p>
        ` : `
          <div class="empty-art"><i data-icon="chat"></i></div>
          <h3>Welcome to ZovioChats 💬</h3>
          <p>Pick a conversation, snap a live camera photo, or start a new encrypted chat.</p>
        `;
        hydrateIcons(empty);
      }
    }
    renderChatList();
  } else if (view === 'status') {
    renderStatusView();
  } else if (view === 'workspace') {
    renderWorkspaceView();
  } else if (view === 'calls' || view === 'meetings') {
    renderMeetingsView();
  } else if (view === 'profile') {
    renderProfileView();
  }
}

// ---------------- Full-Screen Profile & Settings Page ----------------
let currentSettingsTab = 'identity';
let cachedProfileFp = null;
let cachedProfileStatus = null;

async function openProfileModal(initialTab = 'identity') {
  if (typeof initialTab === 'string') currentSettingsTab = initialTab;
  switchView('profile');
}

async function renderProfileView(tab = currentSettingsTab) {
  currentSettingsTab = tab;
  const root = $('#view-profile');
  if (!root) return;

  if (!cachedProfileFp && S.user?.publicKey) {
    cachedProfileFp = await E2E.fingerprint(S.user.publicKey).catch(() => 'SHA256:F1R3UPP');
  }
  const fp = cachedProfileFp || 'SHA256:F1R3UPP';
  if (!cachedProfileStatus) {
    api('/api/status').then(res => { cachedProfileStatus = res; }).catch(() => {});
  }
  const st = cachedProfileStatus || {};
  let avatarData = S.user.avatar || '';
  let avatarColor = S.user.avatarColor || '#ff5722';
  const colors = ['#ff5722', '#ff9f43', '#7c5cff', '#ff5c8a', '#2ed3b7', '#4c8dff', '#a55eea', '#10b981'];
  const p = S.user.preferences || S.user.prefs || {};
  const friendCount = (S.user.friends || []).length;
  const blockedCount = (S.user.blockedUsers || []).length;

  // Check 30-day username lock
  let usernameLocked = false;
  let usernameDaysLeft = 0;
  if (S.user.lastUsernameChange) {
    const elapsed = Date.now() - S.user.lastUsernameChange;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (elapsed < thirtyDaysMs) {
      usernameLocked = true;
      usernameDaysLeft = Math.ceil((thirtyDaysMs - elapsed) / (24 * 60 * 60 * 1000));
    }
  }

  // Fast path: If layout skeleton already exists, update active nav and only render main pane
  const existingLayout = root.querySelector('.settings-full-layout');
  if (existingLayout) {
    $$('.settings-nav-item', root).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    const preview = $('#profAvaPreview', root);
    if (preview) preview.innerHTML = avatarHTML(S.user, 'xl');
    const nameEl = $('#sidebarUserName', root);
    if (nameEl) nameEl.textContent = S.user.name;
    const handleEl = $('#sidebarUserHandle', root);
    if (handleEl) handleEl.textContent = `@${S.user.username}`;
  } else {
    root.innerHTML = `
      <div class="settings-full-layout">
        <!-- SETTINGS SIDEBAR -->
        <aside class="settings-sidebar">
          <div class="settings-sidebar-head">
            <button type="button" class="btn ghost sm back-to-chats-btn" id="profBackBtn">
              ${icon('back')} <span>Back to Chats</span>
            </button>
          </div>

          <div class="settings-user-card">
            <div class="profile-avatar-container" style="width:88px;height:88px">
              <div id="profAvaPreview">${avatarHTML(S.user, 'xl')}</div>
            </div>
            <div class="settings-user-names">
              <strong class="settings-user-fullname" id="sidebarUserName">${esc(S.user.name)}</strong>
              <div class="settings-user-handle-row">
                <span class="settings-user-handle" id="sidebarUserHandle">@${esc(S.user.username)}</span>
                <span class="verified-tick" title="Verified Account">✓</span>
              </div>
              <span class="muted xs settings-user-email">${esc(S.user.email || `${S.user.username}@gmail.com`)}</span>
            </div>
            <button type="button" class="btn danger sm glow signout-sidebar-btn" id="profSignoutBtn">
              ${icon('logOut')} Sign Out
            </button>
          </div>

          <nav class="settings-nav">
            <button type="button" class="settings-nav-item ${tab === 'identity' ? 'active' : ''}" data-tab="identity">
              <i data-icon="user"></i>
              <span>Profile Identity</span>
            </button>
            <button type="button" class="settings-nav-item ${tab === 'preferences' ? 'active' : ''}" data-tab="preferences">
              <i data-icon="sliders"></i>
              <span>Preferences &amp; Customization</span>
            </button>
            <button type="button" class="settings-nav-item ${tab === 'notifications' ? 'active' : ''}" data-tab="notifications">
              <i data-icon="bell"></i>
              <span>Windows Notifications</span>
              <span class="pill green xs" style="margin-left:auto">OS</span>
            </button>
            <button type="button" class="settings-nav-item ${tab === 'friends' ? 'active' : ''}" data-tab="friends">
              <i data-icon="lock"></i>
              <span>Privacy and Users</span>
              ${(friendCount || blockedCount) ? `<span class="pill green xs" style="margin-left:auto">${friendCount}</span>` : ''}
            </button>
            <button type="button" class="settings-nav-item ${tab === 'plans' ? 'active' : ''}" data-tab="plans">
              <i data-icon="star"></i>
              <span>Storage &amp; Plans</span>
              ${S.user?.plan === 'pro' ? '<span class="pill xs" style="margin-left:auto;background:rgba(245,158,11,.22);color:#fbbf24">PRO</span>' : S.user?.plan === 'plus' ? '<span class="pill green xs" style="margin-left:auto">PLUS</span>' : ''}
            </button>
            <button type="button" class="settings-nav-item ${tab === 'security' ? 'active' : ''}" data-tab="security">
              <i data-icon="shield"></i>
              <span>Security &amp; E2EE</span>
            </button>
            <button type="button" class="settings-nav-item ${tab === 'devices' ? 'active' : ''}" data-tab="devices">
              <i data-icon="grid"></i>
              <span>Linked Devices</span>
              <span class="pill xs" style="margin-left:auto;background:rgba(124,92,255,.18);color:#a78bfa">QR</span>
            </button>
            <button type="button" class="settings-nav-item danger ${tab === 'danger' ? 'active' : ''}" data-tab="danger">
              <i data-icon="trash"></i>
              <span>Delete Account</span>
            </button>
          </nav>

          <div style="margin-top:auto;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);">
            <button type="button" class="btn ghost sm" id="profCheckUpdateBtn" style="width:100%;justify-content:center;gap:8px;font-weight:700;">
              <span>🚀</span>
              <span>Check for Updates</span>
            </button>
          </div>
        </aside>

        <!-- MAIN SETTINGS PANEL -->
        <main class="settings-main" id="settingsMainContent">
        </main>
      </div>
    `;

    hydrateIcons(root);

    $('#profBackBtn', root).onclick = () => switchView('chats');
    $('#profSignoutBtn', root).onclick = logout;
    if ($('#profCheckUpdateBtn', root)) {
      $('#profCheckUpdateBtn', root).onclick = () => checkAppVersion(true);
    }

    $$('.settings-nav-item', root).forEach(btn => {
      btn.onclick = () => {
        SoundFX.play('toggle');
        renderProfileView(btn.dataset.tab);
      };
    });
  }

  const mainArea = $('#settingsMainContent', root);

  // TAB 1: PROFILE IDENTITY
  if (tab === 'identity') {
    mainArea.innerHTML = `
      <div class="settings-pane-wrap">
        <div class="settings-pane-head">
          <h3>Profile Identity</h3>
          <p class="muted xs">Update your public display identity on Zovio.</p>
        </div>

        <!-- AVATAR & ACCENT CARD (Auto-saves immediately) -->
        <div class="prof-card glass-panel">
          <div class="prof-card-head">
            <i data-icon="sparkle"></i>
            <h4>Avatar &amp; Color Accent</h4>
          </div>

          <div class="avatar-card-layout">
            <div class="avatar-card-preview-box">
              <div id="profAvaInner">${avatarHTML(S.user, 'xl')}</div>
            </div>
            <div class="avatar-card-meta">
              <div class="row gap-s wrap align-center">
                <button type="button" class="btn ghost sm" id="profUploadBtn">
                  <i data-icon="camera"></i> <span>Change Photo</span>
                </button>
                <input type="file" id="profPhotoIn" accept="image/*" class="hidden">
                ${avatarData ? `<button type="button" class="btn ghost sm danger-text" id="profRemoveBtn">Remove Photo</button>` : ''}
              </div>
              <p class="avatar-helper-note">If you set your own photo, your selected accent color forms a glowing background border around it.</p>
            </div>
          </div>

          <div class="row gap-s align-center wrap" id="profColorRow" style="margin-top:10px">
            <span class="muted xs" style="font-weight:600">Avatar Accent:</span>
            ${colors.map(c => `<button type="button" class="color-dot ${c === avatarColor ? 'active' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}
          </div>
        </div>

        <!-- FORM CARD (Saved ONLY when user clicks Update Profile) -->
        <div class="prof-card glass-panel" style="margin-top:16px">
          <div class="prof-card-head">
            <i data-icon="user"></i>
            <h4>Personal &amp; Contact Details</h4>
          </div>

          <div class="grid-2 gap-m" style="margin-top:8px">
            <label class="col gap-xs">
              <span class="muted xs" style="font-weight:600">Display Name</span>
              <input id="profName" value="${esc(S.user.name)}" placeholder="Your full name" style="height:38px">
              <span class="xs muted">Visible across chats, calls, and status.</span>
            </label>

            <label class="col gap-xs">
              <span class="muted xs" style="font-weight:600">Username (Unique handle)</span>
              <div class="username-field-wrap">
                <span class="username-prefix">@</span>
                <input id="profUsername" value="${esc(S.user.username)}" ${usernameLocked ? 'readonly' : ''} placeholder="username" style="height:38px;padding-right:42px">
                <span id="usernameCheckStatus" class="username-inline-badge"></span>
              </div>
              ${usernameLocked
                ? `<span class="xs" style="color:#ff9800">🔒 Changed recently. Can change again in ${usernameDaysLeft} day(s).</span>`
                : `<span class="xs muted">Allowed: letters, numbers, underscores. Unique handle.</span>`
              }
            </label>
          </div>

          <label class="col gap-xs" style="margin-top:12px">
            <div class="row between align-center">
              <span class="muted xs" style="font-weight:600">Phone Number</span>
              <button type="button" class="btn ghost xs" id="phonePrivDirectBtn" style="padding:2px 8px;font-size:11px" title="Change Phone Visibility">
                ${icon('lock')} <span id="phonePrivDirectLabel">${statusPrivacyLabel(S.user.phonePrivacy)}</span>
              </button>
            </div>
            <div style="position:relative;display:flex;align-items:center">
              <i data-icon="phone" style="position:absolute;left:12px;width:15px;height:15px;opacity:0.45;pointer-events:none"></i>
              <input id="profPhone" placeholder="+91 98765 43210" value="${esc(S.user.phone || '')}" style="height:38px;padding-left:36px;width:100%">
            </div>
            <span class="xs muted">Used for direct calling and account contact. Controlled by your privacy settings.</span>
          </label>

          <label class="col gap-xs" style="margin-top:12px">
            <div class="row between align-center">
              <span class="muted xs" style="font-weight:600">Bio / About</span>
              <div class="row gap-xs align-center">
                <button type="button" class="btn ghost xs" id="bioPrivDirectBtn" style="padding:2px 8px;font-size:11px" title="Change Bio Visibility">
                  ${icon('lock')} <span id="bioPrivDirectLabel">${statusPrivacyLabel(S.user.bioPrivacy)}</span>
                </button>
                <span class="xs muted" id="profBioCount">0 / 200</span>
              </div>
            </div>
            <textarea id="profBio" class="bio-fixed-textarea" maxlength="200" placeholder="Tell people a bit about yourself, what you are working on or your interests…">${esc(S.user.bio || '')}</textarea>
          </label>

          <div class="row end align-center" style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06)">
            <button type="button" class="btn primary lg glow" id="updateProfileBtn" style="padding:10px 28px;font-weight:700">
              <i data-icon="sparkle"></i> <span>Update Profile</span>
            </button>
          </div>
        </div>
      </div>
    `;

    hydrateIcons(mainArea);

    const refreshAvatars = () => {
      const updatedUser = { ...S.user, avatar: avatarData, avatarColor };
      $('#profAvaPreview', root).innerHTML = avatarHTML(updatedUser, 'xl');
      $('#profAvaInner', mainArea).innerHTML = avatarHTML(updatedUser, 'xl');
      renderMe();
    };

    // Auto-save photo on upload
    $('#profUploadBtn', mainArea).onclick = () => $('#profPhotoIn', mainArea).click();
    $('#profPhotoIn', mainArea).onchange = async e => {
      const f = e.target.files?.[0];
      if (!f) return;
      avatarData = await fileToDataURL(f, 320, 0.85);
      S.user.avatar = avatarData;
      refreshAvatars();
      try {
        await api('/api/me', { method: 'PATCH', body: { avatar: avatarData } });
        SoundFX.play('save');
        toast('Profile photo updated in database!');
      } catch (err) {
        toast(err.message, 'err');
      }
    };

    // Auto-save photo removal
    if ($('#profRemoveBtn', mainArea)) {
      $('#profRemoveBtn', mainArea).onclick = async () => {
        avatarData = '';
        S.user.avatar = '';
        refreshAvatars();
        try {
          await api('/api/me', { method: 'PATCH', body: { avatar: null } });
          SoundFX.play('toggle');
          toast('Profile photo removed from database');
          renderProfileView('identity');
        } catch (err) {
          toast(err.message, 'err');
        }
      };
    }

    // Auto-save color accent on click
    $$('#profColorRow .color-dot', mainArea).forEach(btn => {
      btn.onclick = async () => {
        avatarColor = btn.dataset.c;
        S.user.avatarColor = avatarColor;
        $$('#profColorRow .color-dot', mainArea).forEach(b => b.classList.toggle('active', b === btn));
        refreshAvatars();
        SoundFX.play('toggle');
        try {
          await api('/api/me', { method: 'PATCH', body: { avatarColor } });
          toast('Avatar accent updated in database');
        } catch (err) {
          toast(err.message, 'err');
        }
      };
    });

    // Real-time username availability check with green tick / cross
    const usernameIn = $('#profUsername', mainArea);
    const statusTag = $('#usernameCheckStatus', mainArea);
    let checkTimeout = null;

    const runCheck = async () => {
      const val = usernameIn.value.trim().toLowerCase();
      if (!val) {
        statusTag.innerHTML = '';
        return;
      }
      if (val === S.user.username) {
        statusTag.innerHTML = '<span class="user-avail-tick lime" title="Current username">✓</span>';
        return;
      }
      statusTag.innerHTML = '<span class="user-avail-tick checking" title="Checking…">…</span>';
      try {
        const res = await api(`/api/users/check-username?username=${encodeURIComponent(val)}`);
        if (res.available) {
          statusTag.innerHTML = '<span class="user-avail-tick lime" title="Available">✓</span>';
        } else {
          statusTag.innerHTML = `<span class="user-avail-tick orange" title="${esc(res.error || 'Unavailable')}">✗</span>`;
        }
      } catch {
        statusTag.innerHTML = '<span class="user-avail-tick orange" title="Check failed">✗</span>';
      }
    };

    usernameIn.oninput = () => {
      const pos = usernameIn.selectionStart;
      const cleaned = usernameIn.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleaned !== usernameIn.value) {
        usernameIn.value = cleaned;
        try { usernameIn.setSelectionRange(pos, pos); } catch {}
      }
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(runCheck, 280);
    };
    runCheck();

    // Live Bio character count
    const bioIn = $('#profBio', mainArea);
    const bioCount = $('#profBioCount', mainArea);
    if (bioIn && bioCount) {
      const updateBioCount = () => {
        bioCount.textContent = `${bioIn.value.length} / 200`;
      };
      bioIn.oninput = updateBioCount;
      updateBioCount();
    }

    if ($('#phonePrivDirectBtn', mainArea)) {
      $('#phonePrivDirectBtn', mainArea).onclick = () => {
        openPhonePrivacyModal(newPriv => {
          if ($('#phonePrivDirectLabel', mainArea)) {
            $('#phonePrivDirectLabel', mainArea).textContent = statusPrivacyLabel(newPriv);
          }
        });
      };
    }

    if ($('#bioPrivDirectBtn', mainArea)) {
      $('#bioPrivDirectBtn', mainArea).onclick = () => {
        openBioPrivacyModal(newPriv => {
          if ($('#bioPrivDirectLabel', mainArea)) {
            $('#bioPrivDirectLabel', mainArea).textContent = statusPrivacyLabel(newPriv);
          }
        });
      };
    }

    // "Update Profile" Button click (saves text fields to database)
    $('#updateProfileBtn', mainArea).onclick = async () => {
      const btn = $('#updateProfileBtn', mainArea);
      const name = $('#profName', mainArea).value.trim();
      const username = $('#profUsername', mainArea).value.trim().toLowerCase();
      const phone = ($('#profPhone', mainArea)?.value || '').trim();
      const bio = ($('#profBio', mainArea)?.value || '').trim();

      if (!name) return toast('Display Name cannot be empty', 'err');
      if (!username) return toast('Username cannot be empty', 'err');
      if (username !== S.user.username) {
        try {
          const chk = await api(`/api/users/check-username?username=${encodeURIComponent(username)}`);
          if (!chk.available) return toast(chk.error || 'Username is already taken', 'err');
        } catch { /* server validates again on save */ }
      }
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> Updating…`;

      try {
        const updated = await api('/api/me', {
          method: 'PATCH',
          body: { name, username, phone, bio }
        });
        Object.assign(S.user, updated);
        SoundFX.play('save');
        toast('✓ Profile Identity updated in database!');
        $('#sidebarUserName', root).textContent = S.user.name;
        $('#sidebarUserHandle', root).textContent = `@${S.user.username}`;
        usernameIn.value = S.user.username;
        runCheck();
        renderMe();
      } catch (err) {
        toast(err.message, 'err');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-icon="sparkle"></i> <span>Update Profile</span>`;
        hydrateIcons(btn);
      }
    };
  }

  // TAB 2: PREFERENCES & CUSTOMIZATION (Auto-saves each switch immediately)
  else if (tab === 'preferences') {
    mainArea.innerHTML = `
      <div class="settings-pane-wrap">
        <div class="settings-pane-head">
          <div class="row between align-center">
            <div>
              <h3>Preferences &amp; Customization</h3>
              <p class="muted xs">Personalize your Zovio experience. All settings update automatically as you toggle them.</p>
            </div>
          </div>
        </div>

        <div class="prof-card glass-panel" style="margin-top:14px">
          <div class="col gap-s">
            <label class="pref-toggle-row">
              <div>
                <div class="pref-title">Send Read Receipts (✓✓)</div>
                <div class="pref-desc">Let contacts know when you have viewed their incoming messages</div>
              </div>
              <input type="checkbox" data-pref="readReceipts" ${p.readReceipts !== false ? 'checked' : ''}>
            </label>

            <label class="pref-toggle-row">
              <div>
                <div class="pref-title">Show Online Status Dot</div>
                <div class="pref-desc">Display active online presence to contacts across chats and directory</div>
              </div>
              <input type="checkbox" data-pref="showOnline" ${p.showOnline !== false ? 'checked' : ''}>
            </label>

            <label class="pref-toggle-row">
              <div>
                <div class="pref-title">Interaction &amp; Message Sounds</div>
                <div class="pref-desc">Play acoustic audio chimes for messages, reactions, friend requests, camera shutter, and UI navigation</div>
              </div>
              <input type="checkbox" data-pref="sounds" ${p.sounds !== false ? 'checked' : ''}>
            </label>

            <div class="sound-preview-strip">
              <span class="muted xs" style="font-weight:700">🔊 Test Acoustic Sound Effects:</span>
              <div class="row gap-xs wrap">
                <button type="button" class="btn ghost sm" data-testsound="send">📤 Send</button>
                <button type="button" class="btn ghost sm" data-testsound="receive">📥 Receive</button>
                <button type="button" class="btn ghost sm" data-testsound="react">😍 Reaction</button>
                <button type="button" class="btn ghost sm" data-testsound="friend">Mark Friend</button>
                <button type="button" class="btn ghost sm" data-testsound="shutter">📸 Shutter</button>
                <button type="button" class="btn ghost sm" data-testsound="delete">🗑️ Delete/Block</button>
              </div>
            </div>

            <label class="pref-toggle-row">
              <div>
                <div class="pref-title">Smooth UI Animations &amp; Glow</div>
                <div class="pref-desc">Enable GPU spring transitions, pulsating indicators, and smooth motion</div>
              </div>
              <input type="checkbox" data-pref="animations" ${p.animations !== false ? 'checked' : ''}>
            </label>

            <label class="pref-toggle-row">
              <div>
                <div class="pref-title">Press Enter to Send</div>
                <div class="pref-desc">Send message on Enter, Shift+Enter for new line in composer</div>
              </div>
              <input type="checkbox" data-pref="enterToSend" ${p.enterToSend !== false ? 'checked' : ''}>
            </label>

            <label class="pref-toggle-row">
              <div>
                <div class="pref-title">Compact Chat Density</div>
                <div class="pref-desc">Reduce message bubble spacing for higher information density on screen</div>
              </div>
              <input type="checkbox" data-pref="compactMode" ${p.compactMode ? 'checked' : ''}>
            </label>

            <label class="pref-toggle-row">
              <div>
                <div class="pref-title">Message Previews in Notifications</div>
                <div class="pref-desc">Show sender name and message content snippet in notification toasts</div>
              </div>
              <input type="checkbox" data-pref="notifyPreview" ${p.notifyPreview !== false ? 'checked' : ''}>
            </label>

            <label class="pref-toggle-row">
              <div>
                <div class="pref-title">Launch on Windows Startup</div>
                <div class="pref-desc">Automatically launch Zovio minimized in the system tray when Windows boots</div>
              </div>
              <input type="checkbox" id="openAtLoginCheckbox" data-pref="openAtLogin" ${p.openAtLogin !== false ? 'checked' : ''}>
            </label>
          </div>
        </div>

        <div class="prof-card glass-panel" style="margin-top:14px">
          <div class="col gap-s">
            <div>
              <div class="pref-title">Theme Accent Color</div>
              <div class="pref-desc">Applies across message borders, @usernames, banners, active tabs, and controls</div>
            </div>
            <div class="theme-color-grid" id="themeColorGrid">
              ${Object.entries(THEME_COLOR_PALETTE).map(([hex, info]) => {
                const isSel = (p.themeColor || '#7c5cff').toLowerCase() === hex.toLowerCase();
                return `<button type="button" class="theme-color-swatch ${isSel ? 'active' : ''}" data-themecolor="${hex}" title="${info.name}" style="background:linear-gradient(135deg, ${hex}, ${info.secondary})"></button>`;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="prof-card glass-panel" style="margin-top:14px">
          <div class="col gap-s">
            <div class="row between align-center">
              <div>
                <div class="pref-title">Chat Background Gradients</div>
                <div class="pref-desc">Choose from built-in gradient effects for your chat workspace</div>
              </div>
              <button type="button" class="btn ghost sm" id="resetChatBgBtn">Reset</button>
            </div>
            <div class="chat-bg-preset-grid" id="chatBgPresetGrid">
              ${Object.entries(CHAT_BG_PRESETS).map(([key, info]) => {
                const isPro = Boolean(window.isZovioPro?.());
                const locked = Boolean(info.proOnly && !isPro);
                const activePreset = !locked && (p.chatBgPreset || 'default') === key;
                const previewBg = info.css === 'none' ? 'var(--bg-1)' : info.css;
                return `
                  <button type="button" class="chat-bg-preset-card ${activePreset ? 'active' : ''}" data-bgpreset="${key}" style="position:relative">
                    <span class="chat-bg-preset-preview" style="background-color:var(--bg-1);background-image:${info.css === 'none' ? 'none' : previewBg}${locked ? ';opacity:.82' : ''}"></span>
                    <span class="chat-bg-preset-name">${info.name}</span>
                    ${info.proOnly ? `<span style="position:absolute;top:6px;right:6px;font-size:9px;font-weight:800;padding:1px 6px;border-radius:999px;background:${locked ? 'rgba(245,158,11,.92)' : 'rgba(124,92,255,.92)'};color:#fff">${locked ? '🔒 PRO' : '👑 PRO'}</span>` : ''}
                  </button>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    hydrateIcons(mainArea);

    const savePrefsToServer = async (msgText = 'Customization updated') => {
      applyPreferencesEffects();
      try {
        await api('/api/me', {
          method: 'PATCH',
          body: { preferences: S.user.preferences }
        });
        toast(msgText);
      } catch (err) {
        toast(err.message, 'err');
      }
    };

    $$('[data-themecolor]', mainArea).forEach(btn => {
      btn.onclick = () => {
        const hex = btn.dataset.themecolor;
        if (!S.user.preferences) S.user.preferences = {};
        S.user.preferences.themeColor = hex;
        S.user.prefs = S.user.preferences;
        $$('[data-themecolor]', mainArea).forEach(b => b.classList.toggle('active', b === btn));
        const customInp = $('#customThemeColorInput', mainArea);
        if (customInp) customInp.value = hex;
        SoundFX.play('toggle');
        savePrefsToServer('Theme color applied');
      };
    });

    const customColorInp = $('#customThemeColorInput', mainArea);
    if (customColorInp) {
      customColorInp.onchange = () => {
        const hex = customColorInp.value;
        if (!S.user.preferences) S.user.preferences = {};
        S.user.preferences.themeColor = hex;
        S.user.prefs = S.user.preferences;
        $$('[data-themecolor]', mainArea).forEach(b => b.classList.remove('active'));
        savePrefsToServer('Custom theme color applied');
      };
    }

    $$('[data-bgpreset]', mainArea).forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.bgpreset;
        if (CHAT_BG_PRESETS[key]?.proOnly && !window.isZovioPro?.()) {
          toast('Exclusive chat backgrounds are unlocked with Zovio Pro (₹599/mo)', 'warn');
          window.openStoragePlansModal?.('pro');
          return;
        }
        if (!S.user.preferences) S.user.preferences = {};
        S.user.preferences.chatBgPreset = key;
        S.user.prefs = S.user.preferences;
        $$('[data-bgpreset]', mainArea).forEach(b => b.classList.toggle('active', b === btn));
        SoundFX.play('toggle');
        savePrefsToServer('Background gradient updated');
      };
    });

    const resetBgBtn = $('#resetChatBgBtn', mainArea);
    if (resetBgBtn) {
      resetBgBtn.onclick = () => {
        if (!S.user.preferences) S.user.preferences = {};
        S.user.preferences.chatBgPreset = 'default';
        S.user.prefs = S.user.preferences;
        $$('[data-bgpreset]', mainArea).forEach(b => b.classList.toggle('active', b.dataset.bgpreset === 'default'));
        savePrefsToServer('Background reset to default');
      };
    }

    $$('[data-testsound]', mainArea).forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        SoundFX.play(btn.dataset.testsound);
      };
    });

    // Auto-save any preference switch immediately
    $$('input[data-pref]', mainArea).forEach(box => {
      box.onchange = async () => {
        const key = box.dataset.pref;
        const val = box.checked;
        if (!S.user.preferences) S.user.preferences = {};
        S.user.preferences[key] = val;
        S.user.prefs = S.user.preferences;

        if (key === 'openAtLogin' && window.fireuppNative?.setOpenAtLogin) {
          window.fireuppNative.setOpenAtLogin(val);
        }

        SoundFX.play('toggle');
        applyPreferencesEffects();

        try {
          await api('/api/me', {
            method: 'PATCH',
            body: { preferences: S.user.preferences }
          });
          toast(`Updated "${key}" in database`);
        } catch (err) {
          toast(err.message, 'err');
        }
      };
    });

    if (window.fireuppNative?.getOpenAtLogin) {
      window.fireuppNative.getOpenAtLogin().then(enabled => {
        const cb = $('#openAtLoginCheckbox');
        if (cb) cb.checked = Boolean(enabled);
      }).catch(() => {});
    }
  }

  // TAB 2.5: WINDOWS NOTIFICATIONS CUSTOMIZATION
  else if (tab === 'notifications') {
    const winNotifOn = p.winNotifications !== false;
    const notifyDMs = p.notifyDMs !== false;
    const notifyGroups = p.notifyGroups !== false;
    const notifyChannels = p.notifyChannels !== false;
    const notifyCalls = p.notifyCalls !== false;
    const notifyStories = p.notifyStories !== false;
    const notifyPreview = p.notifyPreview !== false;
    const winSound = p.winSound !== false;

    mainArea.innerHTML = `
      <div class="settings-pane-wrap">
        <div class="settings-pane-head">
          <div class="row between align-center">
            <div>
              <h3>Windows Notifications &amp; System Tray</h3>
              <p class="muted xs">Customize native Windows 10/11 Action Center banners, alert sounds, message privacy previews, and background tray behavior.</p>
            </div>
            <button type="button" class="btn primary sm glow" id="testWinNotifBtn">
              🔔 Send Test Notification
            </button>
          </div>
        </div>

        <!-- MASTER WINDOWS NOTIFICATION CARD -->
        <div class="prof-card glass-panel" style="border-color:rgba(124,92,255,0.35);background:linear-gradient(135deg, rgba(124,92,255,0.10), rgba(255,92,138,0.05))">
          <div class="prof-section-title">
            <i data-icon="bell"></i>
            <span>Master Windows Alert Controls</span>
            <span class="pill ${winNotifOn ? 'green' : ''} xs" id="winNotifStatusPill" style="margin-left:auto">${winNotifOn ? 'Active in Windows' : 'Muted'}</span>
          </div>
          <div class="settings-toggle-list">
            <label class="settings-toggle-row">
              <div class="settings-toggle-info">
                <strong>Enable Windows Desktop Notifications</strong>
                <span class="muted xs">Show native Windows toast banners when messages or calls arrive while Zovio is minimized or in the system tray.</span>
              </div>
              <input type="checkbox" class="pref-checkbox" data-pref="winNotifications" ${winNotifOn ? 'checked' : ''}>
            </label>
            <label class="settings-toggle-row">
              <div class="settings-toggle-info">
                <strong>Show Message Preview Text in Banner</strong>
                <span class="muted xs">Display the sender's name &amp; message text inside the notification. Turn off to hide text as "🔒 New Encrypted Message".</span>
              </div>
              <input type="checkbox" class="pref-checkbox" data-pref="notifyPreview" ${notifyPreview ? 'checked' : ''}>
            </label>
            <label class="settings-toggle-row">
              <div class="settings-toggle-info">
                <strong>Quick Reply from Notification</strong>
                <span class="muted xs">Reply directly inside incoming message notifications without opening the app. Disable to show standard view-only banners.</span>
              </div>
              <input type="checkbox" class="pref-checkbox" data-pref="notifyQuickReply" ${p.notifyQuickReply !== false ? 'checked' : ''}>
            </label>
            <label class="settings-toggle-row">
              <div class="settings-toggle-info">
                <strong>Windows Notification Sound</strong>
                <span class="muted xs">Play the native Windows chime alongside incoming notification banners.</span>
              </div>
              <input type="checkbox" class="pref-checkbox" data-pref="winSound" ${winSound ? 'checked' : ''}>
            </label>
            <label class="settings-toggle-row">
              <div class="settings-toggle-info">
                <strong>Launch Zovio on Windows Startup</strong>
                <span class="muted xs">Automatically start Zovio minimized in your Windows system tray when you log in so you never miss a call or message.</span>
              </div>
              <input type="checkbox" class="pref-checkbox" data-pref="openAtLogin" id="winTabOpenAtLoginCb" ${p.openAtLogin !== false ? 'checked' : ''}>
            </label>
          </div>
        </div>

        <!-- CATEGORY GRANULAR TOGGLES -->
        <div class="prof-card glass-panel" style="margin-top:16px">
          <div class="prof-section-title">
            <i data-icon="sliders"></i>
            <span>Notification Categories</span>
          </div>
          <p class="muted xs" style="margin:-4px 0 12px">Choose exactly which Zovio events trigger a Windows notification banner.</p>
          <div class="settings-toggle-list">
            <label class="settings-toggle-row">
              <div class="settings-toggle-info">
                <strong>💬 Direct Messages (1-on-1 ZovioChats)</strong>
                <span class="muted xs">Instant banners when a friend or contact sends you a direct message, photo, or voice note.</span>
              </div>
              <input type="checkbox" class="pref-checkbox" data-pref="notifyDMs" ${notifyDMs ? 'checked' : ''}>
            </label>
            <label class="settings-toggle-row">
              <div class="settings-toggle-info">
                <strong>👥 Group Chats</strong>
                <span class="muted xs">Notifications for activity and @mentions in your group conversations.</span>
              </div>
              <input type="checkbox" class="pref-checkbox" data-pref="notifyGroups" ${notifyGroups ? 'checked' : ''}>
            </label>
            <label class="settings-toggle-row">
              <div class="settings-toggle-info">
                <strong>🔥 ZovioCasts</strong>
                <span class="muted xs">Alerts when channels you follow publish a new broadcast post.</span>
              </div>
              <input type="checkbox" class="pref-checkbox" data-pref="notifyChannels" ${notifyChannels ? 'checked' : ''}>
            </label>
            <label class="settings-toggle-row">
              <div class="settings-toggle-info">
                <strong>📞 Incoming Voice &amp; Video Calls</strong>
                <span class="muted xs">High-priority Windows call alerts when someone rings you on ZovioCalls.</span>
              </div>
              <input type="checkbox" class="pref-checkbox" data-pref="notifyCalls" ${notifyCalls ? 'checked' : ''}>
            </label>
            <label class="settings-toggle-row">
              <div class="settings-toggle-info">
                <strong>📸 ZovioStatus Story @Mentions</strong>
                <span class="muted xs">Notify me in Windows whenever someone tags or @mentions me in their 24h ZovioStatus story.</span>
              </div>
              <input type="checkbox" class="pref-checkbox" data-pref="notifyStories" ${notifyStories ? 'checked' : ''}>
            </label>
          </div>
        </div>
      </div>
    `;

    hydrateIcons(mainArea);

    $('#testWinNotifBtn', mainArea).onclick = () => {
      SoundFX.play('notify');
      showDesktopNotification('Zovio Windows Notification ⚡', {
        body: (S.user?.preferences?.notifyPreview !== false)
          ? `Hey ${S.user?.name || 'there'}! Your native Windows notifications are configured and working properly.`
          : '🔒 New Encrypted Message',
        forceTest: true
      });
      toast('Test Windows notification dispatched! 🔔');
    };

    $$('.pref-checkbox', mainArea).forEach(cb => {
      cb.onchange = async () => {
        const key = cb.dataset.pref;
        const val = cb.checked;
        if (!S.user.preferences) S.user.preferences = {};
        S.user.preferences[key] = val;

        if (key === 'winNotifications') {
          const pill = $('#winNotifStatusPill', mainArea);
          if (pill) {
            pill.textContent = val ? 'Active in Windows' : 'Muted';
            pill.classList.toggle('green', val);
          }
          if (val && 'Notification' in window && Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch {}
          }
        }

        if (key === 'openAtLogin' && window.fireuppNative?.setOpenAtLogin) {
          try { await window.fireuppNative.setOpenAtLogin(val); } catch {}
        }

        SoundFX.play('toggle');
        applyPreferencesEffects();

        try {
          await api('/api/me', {
            method: 'PATCH',
            body: { preferences: S.user.preferences }
          });
          toast('Windows notification settings saved');
        } catch (err) {
          toast(err.message, 'err');
        }
      };
    });

    if (window.fireuppNative?.getOpenAtLogin) {
      window.fireuppNative.getOpenAtLogin().then(enabled => {
        const cb = $('#winTabOpenAtLoginCb', mainArea);
        if (cb) cb.checked = Boolean(enabled);
      }).catch(() => {});
    }
  }

  // TAB 3: PRIVACY & USERS
  else if (tab === 'friends') {
    const allUsers = await api('/api/users').catch(() => []);
    allUsers.forEach(u => S.users.set(u.id, u));
    const friendIds = Array.isArray(S.user.friends) ? S.user.friends : [];
    const blockedIds = Array.isArray(S.user.blockedUsers) ? S.user.blockedUsers : [];
    await ensureUsers([...friendIds, ...blockedIds]);

    let privSubTab = window._privacyUsersSubTab || 'privacy';

    const renderPrivacyAndUsersTab = () => {
      const friendObjs = (Array.isArray(S.user.friends) ? S.user.friends : []).map(id => S.users.get(id)).filter(Boolean);
      const blockedObjs = (Array.isArray(S.user.blockedUsers) ? S.user.blockedUsers : []).map(id => S.users.get(id)).filter(Boolean);
      const blockedGroupObjs = (Array.isArray(S.user.blockedGroups) ? S.user.blockedGroups : []).map(id => S.chats.get(id) || { id, name: 'Blocked Group', emoji: '👥' });
      const p = S.user.preferences || S.user.prefs || {};

      let subContentHTML = '';

      if (privSubTab === 'privacy') {
        subContentHTML = `
          <!-- BIO PRIVACY CARD -->
          <div class="prof-card glass-panel" style="margin-top:14px">
            <div class="prof-card-head">
              <i data-icon="user"></i>
              <h4>Bio Visibility</h4>
              <span class="pill blue xs" style="margin-left:auto">${statusPrivacyLabel(S.user.bioPrivacy)}</span>
            </div>
            <p class="muted xs" style="margin:4px 0 12px;line-height:1.45">
              Control who can see your Bio / About text below your name on profile details and in direct chat headers.
            </p>
            <div class="row between align-center">
              <span class="muted xs">Current setting: <b>${statusPrivacyLabel(S.user.bioPrivacy)}</b></span>
              <button type="button" class="btn primary sm glow" id="openBioPrivBtn">
                ${icon('lock')} <span>Configure Bio Privacy</span>
              </button>
            </div>
          </div>

          <!-- PHONE NUMBER PRIVACY CARD -->
          <div class="prof-card glass-panel" style="margin-top:14px">
            <div class="prof-card-head">
              <i data-icon="phone"></i>
              <h4>Phone Number Visibility</h4>
              <span class="pill amber xs" style="margin-left:auto">${statusPrivacyLabel(S.user.phonePrivacy)}</span>
            </div>
            <p class="muted xs" style="margin:4px 0 12px;line-height:1.45">
              Control who can see your phone number below your name in contact info and direct chats.
            </p>
            <div class="row between align-center">
              <span class="muted xs">Current setting: <b>${statusPrivacyLabel(S.user.phonePrivacy)}</b></span>
              <button type="button" class="btn primary sm glow" id="openPhonePrivBtn">
                ${icon('lock')} <span>Configure Phone Privacy</span>
              </button>
            </div>
          </div>

          <!-- FIRESTATUS PRIVACY CARD -->
          <div class="prof-card glass-panel" style="margin-top:14px">
            <div class="prof-card-head">
              <i data-icon="sparkle"></i>
              <h4>Status Visibility</h4>
              <span class="pill green xs" style="margin-left:auto">${statusPrivacyLabel(S.user.statusPrivacy)}</span>
            </div>
            <p class="muted xs" style="margin:4px 0 12px;line-height:1.45">
              Control who can view your 24-hour ZovioStatus updates. By default, only people you have marked as Friend can view.
            </p>
            <div class="row between align-center">
              <span class="muted xs">Current setting: <b>${statusPrivacyLabel(S.user.statusPrivacy)}</b></span>
              <button type="button" class="btn ghost sm" id="openStatusPrivBtn">
                ${icon('lock')} <span>Configure Status Privacy</span>
              </button>
            </div>
          </div>

          <!-- WHO CAN MENTION ME IN STATUS CARD -->
          <div class="prof-card glass-panel" style="margin-top:14px">
            <div class="prof-card-head">
              <i data-icon="atSign"></i>
              <h4>Who Can Mention Me in Status</h4>
              <span class="pill purple xs" style="margin-left:auto">${statusPrivacyLabel(S.user.mentionPrivacy || { mode: 'everyone' })}</span>
            </div>
            <p class="muted xs" style="margin:4px 0 12px;line-height:1.45">
              Control who can @tag or mention your account in their 24-hour ZovioStatus stories.
            </p>
            <div class="row between align-center">
              <span class="muted xs">Current setting: <b>${statusPrivacyLabel(S.user.mentionPrivacy || { mode: 'everyone' })}</b></span>
              <button type="button" class="btn primary sm glow" id="openMentionPrivBtn">
                ${icon('lock')} <span>Configure Mention Privacy</span>
              </button>
            </div>
          </div>

          <!-- DIRECT MESSAGING & PRESENCE PRIVACY CARD -->
          <div class="prof-card glass-panel" style="margin-top:14px">
            <div class="prof-card-head">
              <i data-icon="shield"></i>
              <h4>Messaging, Presence &amp; Media Privacy</h4>
            </div>
            <p class="muted xs" style="margin:4px 0 12px">
              Granular toggles to safeguard your active status, read receipts, calls, and media.
            </p>

            <div class="col gap-s">
              <!-- READ RECEIPTS TOGGLE -->
              <label class="pref-toggle-row">
                <div>
                  <div class="pref-title">Read Receipts (Blue Checkmarks)</div>
                  <div class="pref-desc">Send and receive message read confirmations. When disabled, you will neither send read ticks nor see read ticks from others.</div>
                </div>
                <input type="checkbox" data-privacy-pref="readReceipts" ${p.readReceipts !== false ? 'checked' : ''}>
              </label>

              <!-- ONLINE PRESENCE TOGGLE -->
              <label class="pref-toggle-row">
                <div>
                  <div class="pref-title">Show Online Status &amp; Last Active</div>
                  <div class="pref-desc">Allow other users to see when you are active on Zovio or when you were last seen.</div>
                </div>
                <input type="checkbox" data-privacy-pref="showOnline" ${p.showOnline !== false ? 'checked' : ''}>
              </label>

              <!-- DIRECT CALLS PRIVACY -->
              <label class="pref-toggle-row">
                <div>
                  <div class="pref-title">Calls From Friends Only</div>
                  <div class="pref-desc">Only people you have marked as Friend can start a direct video or audio call with you.</div>
                </div>
                <input type="checkbox" data-privacy-pref="callsFromFriendsOnly" ${p.callsFromFriendsOnly === true ? 'checked' : ''}>
              </label>

              <!-- FORWARDING & VIEW-ONCE PROTECTION -->
              <label class="pref-toggle-row">
                <div>
                  <div class="pref-title">Media Forwarding &amp; View-Once Protection</div>
                  <div class="pref-desc">Prevent recipients from forwarding your shared images and enforce strict one-time view on media snapshots.</div>
                </div>
                <input type="checkbox" data-privacy-pref="protectMedia" ${p.protectMedia === true ? 'checked' : ''}>
              </label>

              <!-- NOTIFICATION PREVIEW -->
              <label class="pref-toggle-row">
                <div>
                  <div class="pref-title">Message Previews in Notifications</div>
                  <div class="pref-desc">Display sender name and message snippet in popups, or keep content hidden until opened.</div>
                </div>
                <input type="checkbox" data-privacy-pref="notifyPreview" ${p.notifyPreview !== false ? 'checked' : ''}>
              </label>

              <!-- GROUP ADD PRIVACY -->
              <label class="pref-toggle-row">
                <div>
                  <div class="pref-title">Who Can Add Me to Groups</div>
                  <div class="pref-desc">Control who can add you to group chats without requiring your confirmation.</div>
                </div>
                <select class="privacy-select" id="groupAddPrivacySelect">
                  <option value="everyone" ${p.groupAddPrivacy !== 'friends' ? 'selected' : ''}>Everyone</option>
                  <option value="friends" ${p.groupAddPrivacy === 'friends' ? 'selected' : ''}>My Friends</option>
                </select>
              </label>
            </div>
          </div>
        `;
      } else {
        subContentHTML = `
          <!-- USER SEARCH BAR -->
          <div style="margin-top:14px;position:relative">
            <input id="manageUsersSearchIn" placeholder="Search friends or blocked accounts by name or @username…" style="width:100%;height:38px;padding-left:36px;border-radius:10px;background:var(--bg-2);border:1px solid var(--border);color:var(--text)">
            <i data-icon="search" style="position:absolute;left:12px;top:11px;width:16px;height:16px;opacity:0.4;pointer-events:none"></i>
          </div>

          <!-- MARKED AS FRIEND SECTION -->
          <div class="prof-card glass-panel" style="margin-top:14px" id="friendsCardSection">
            <div class="prof-card-head">
              <i data-icon="userCheck"></i>
              <h4>Marked as Friend (${friendObjs.length})</h4>
              <span class="pill green xs" style="margin-left:auto">Can view your ZovioStatus &amp; Bio</span>
            </div>
            <p class="muted xs" style="margin:4px 0 12px">
              Users listed here are your verified friends on Zovio. Removing someone immediately hides your ZovioStatus and private Bio from them.
            </p>

            ${friendObjs.length ? `
              <div class="col gap-xs" id="friendListWrap">
                ${friendObjs.map(u => `
                  <div class="manage-user-row" data-userfilter="${esc((u.name + ' ' + u.username + ' ' + (u.bio || '')).toLowerCase())}">
                    <div class="row gap-s align-center" style="min-width:0;flex:1">
                      ${avatarHTML(u, 'sm')}
                      <div style="min-width:0;flex:1">
                        <div class="row gap-xs align-center">
                          <strong style="font-size:14px">${esc(u.name)}</strong>
                          <span class="pill green xs">Friend ✓</span>
                        </div>
                        <div class="muted xs">@${esc(u.username)} ${u.bio ? `· ${esc(u.bio)}` : ''}</div>
                      </div>
                    </div>
                    <div class="row gap-xs">
                      <button type="button" class="btn ghost sm" data-openchat="${u.id}">💬 Message</button>
                      <button type="button" class="btn danger sm" data-unfriend="${u.id}">Remove from Friends</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="empty-inline-card">
                <span>You haven't marked anyone as a Friend yet. Click <b>Mark as Friend</b> inside any conversation to share your ZovioStatus.</span>
              </div>
            `}
          </div>

          <!-- BLOCKED USERS SECTION -->
          <div class="prof-card glass-panel" style="margin-top:16px" id="blockedCardSection">
            <div class="prof-card-head">
              <i data-icon="ban"></i>
              <h4>Blocked Users (${blockedObjs.length})</h4>
              <span class="pill red xs" style="margin-left:auto">🚫 Restricted</span>
            </div>
            <p class="muted xs" style="margin:4px 0 12px">
              Blocked users cannot send you messages or see your ZovioStatus or Bio. You can unblock them anytime below.
            </p>

            ${blockedObjs.length ? `
              <div class="col gap-xs" id="blockedListWrap">
                ${blockedObjs.map(u => `
                  <div class="manage-user-row blocked" data-userfilter="${esc((u.name + ' ' + u.username).toLowerCase())}">
                    <div class="row gap-s align-center" style="min-width:0;flex:1">
                      ${avatarHTML(u, 'sm')}
                      <div style="min-width:0;flex:1">
                        <div class="row gap-xs align-center">
                          <strong style="font-size:14px">${esc(u.name)}</strong>
                          <span class="pill red xs">Blocked</span>
                        </div>
                        <div class="muted xs">@${esc(u.username)}</div>
                      </div>
                    </div>
                    <button type="button" class="btn primary sm glow" data-unblock="${u.id}">🔓 Unblock</button>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="empty-inline-card">
                <span>✨ You have no blocked users.</span>
              </div>
            `}
          </div>

          <!-- BLOCKED GROUPS SECTION -->
          <div class="prof-card glass-panel" style="margin-top:16px" id="blockedGroupsCardSection">
            <div class="prof-card-head">
              <i data-icon="ban"></i>
              <h4>Blocked Groups (${blockedGroupObjs.length})</h4>
              <span class="pill red xs" style="margin-left:auto">🚫 Blocked</span>
            </div>
            <p class="muted xs" style="margin:4px 0 12px">
              Groups listed here are blocked. You will not receive messages and nobody can add you back into them until unblocked.
            </p>

            ${blockedGroupObjs.length ? `
              <div class="col gap-xs" id="blockedGroupsListWrap">
                ${blockedGroupObjs.map(g => `
                  <div class="manage-user-row blocked">
                    <div class="row gap-s align-center" style="min-width:0;flex:1">
                      <div class="ava sm" style="background:${g.avatarColor || '#ff5722'}">${g.emoji || '👥'}</div>
                      <div style="min-width:0;flex:1">
                        <strong style="font-size:14px">${esc(g.name || 'Group')}</strong>
                        <div class="muted xs">Blocked group</div>
                      </div>
                    </div>
                    <button type="button" class="btn primary sm glow" data-unblock-group="${g.id}">🔓 Unblock</button>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="empty-inline-card">
                <span>✨ You have no blocked groups.</span>
              </div>
            `}
          </div>
        `;
      }

      mainArea.innerHTML = `
        <div class="settings-pane-wrap">
          <div class="settings-pane-head">
            <div class="row between align-center wrap gap-s">
              <div>
                <h3>Privacy and Users</h3>
                <p class="muted xs">Configure who can see your Bio, ZovioStatus, Read Receipts and manage your Friends list.</p>
              </div>
            </div>
          </div>

          <!-- SUB-TABS SEGMENTED SWITCHER -->
          <div class="seg-tabs-row" style="display:flex;gap:8px;background:rgba(255,255,255,0.035);padding:4px;border-radius:12px;border:1px solid rgba(255,255,255,0.07);margin-top:14px">
            <button type="button" class="btn ${privSubTab === 'privacy' ? 'primary glow' : 'ghost'} sm" id="subTabPrivBtn" style="flex:1;justify-content:center;border-radius:9px;font-weight:700">
              ${icon('lock')} <span>Privacy Settings</span>
            </button>
            <button type="button" class="btn ${privSubTab === 'users' ? 'primary glow' : 'ghost'} sm" id="subTabUsersBtn" style="flex:1;justify-content:center;border-radius:9px;font-weight:700">
              ${icon('users')} <span>Manage Users (${friendObjs.length + blockedObjs.length})</span>
            </button>
          </div>

          ${subContentHTML}
        </div>
      `;

      hydrateIcons(mainArea);

      // Sub-tab switcher click handlers
      const pBtn = $('#subTabPrivBtn', mainArea);
      const uBtn = $('#subTabUsersBtn', mainArea);
      if (pBtn) pBtn.onclick = () => {
        window._privacyUsersSubTab = 'privacy';
        privSubTab = 'privacy';
        renderPrivacyAndUsersTab();
      };
      if (uBtn) uBtn.onclick = () => {
        window._privacyUsersSubTab = 'users';
        privSubTab = 'users';
        renderPrivacyAndUsersTab();
      };

      // Privacy subtab buttons
      const grpPrivSel = $('#groupAddPrivacySelect', mainArea);
      if (grpPrivSel) {
        grpPrivSel.onchange = async () => {
          const val = grpPrivSel.value;
          if (!S.user.preferences) S.user.preferences = {};
          S.user.preferences.groupAddPrivacy = val;
          S.user.prefs = S.user.preferences;
          await api('/api/me', { method: 'PATCH', body: { preferences: S.user.preferences } });
          toast(`Group add privacy: ${val === 'friends' ? 'My Friends' : 'Everyone'}`);
        };
      }
      if ($('#openBioPrivBtn', mainArea)) {
        $('#openBioPrivBtn', mainArea).onclick = () => openBioPrivacyModal(() => renderPrivacyAndUsersTab());
      }
      if ($('#openPhonePrivBtn', mainArea)) {
        $('#openPhonePrivBtn', mainArea).onclick = () => openPhonePrivacyModal(() => renderPrivacyAndUsersTab());
      }
      if ($('#openStatusPrivBtn', mainArea)) {
        $('#openStatusPrivBtn', mainArea).onclick = () => openStatusPrivacyModal(() => renderPrivacyAndUsersTab());
      }
      if ($('#openMentionPrivBtn', mainArea)) {
        $('#openMentionPrivBtn', mainArea).onclick = () => openMentionPrivacyModal(() => renderPrivacyAndUsersTab());
      }

      // Privacy toggle switches auto-save
      $$('input[data-privacy-pref]', mainArea).forEach(box => {
        box.onchange = async () => {
          const key = box.dataset.privacyPref;
          const val = box.checked;
          if (!S.user.preferences) S.user.preferences = {};
          S.user.preferences[key] = val;
          S.user.prefs = S.user.preferences;

          SoundFX.play('toggle');
          applyPreferencesEffects();

          try {
            await api('/api/me', {
              method: 'PATCH',
              body: { preferences: S.user.preferences }
            });
            toast(`Privacy updated: ${key}`);
          } catch (err) {
            toast(err.message, 'err');
          }
        };
      });

      // User search filtering in Manage Users subtab
      const searchIn = $('#manageUsersSearchIn', mainArea);
      if (searchIn) {
        searchIn.oninput = () => {
          const q = searchIn.value.trim().toLowerCase();
          $$('[data-userfilter]', mainArea).forEach(row => {
            const match = !q || (row.dataset.userfilter || '').includes(q);
            row.style.display = match ? '' : 'none';
          });
        };
      }

      $$('[data-unfriend]', mainArea).forEach(btn => {
        btn.onclick = async () => {
          await toggleMarkFriend(btn.dataset.unfriend);
          renderPrivacyAndUsersTab();
        };
      });
      $$('[data-unblock]', mainArea).forEach(btn => {
        btn.onclick = async () => {
          await toggleBlockUser(btn.dataset.unblock, false);
          renderPrivacyAndUsersTab();
        };
      });
      $$('[data-unblock-group]', mainArea).forEach(btn => {
        btn.onclick = async () => {
          const groupId = btn.dataset.unblockGroup;
          const res = await api('/api/users/unblock-group', { method: 'POST', body: { groupId } });
          S.user.blockedGroups = res.blockedGroups || (S.user.blockedGroups || []).filter(x => x !== groupId);
          toast('Group unblocked');
          renderPrivacyAndUsersTab();
        };
      });
      $$('[data-openchat]', mainArea).forEach(btn => {
        btn.onclick = async () => {
          const uid = btn.dataset.openchat;
          const other = S.users.get(uid);
          if (!other) return;
          const { keys } = await wrapNewChatKey([S.user, other]);
          const chat = await api('/api/chats/dm', { method: 'POST', body: { userId: other.id, keys } });
          S.chats.set(chat.id, chat);
          closeModal();
          switchView('chats');
          openChat(chat.id);
        };
      });
    };

    renderPrivacyAndUsersTab();
  }

  // TAB 4: SECURITY & E2EE
  else if (tab === 'security') {
    mainArea.innerHTML = `
      <div class="settings-pane-wrap">
        <div class="settings-pane-head">
          <h3>Security &amp; End-to-End Encryption</h3>
          <p class="muted xs">Your Zovio conversations are encrypted end-to-end with WebCrypto ECDH P-256 and AES-256-GCM.</p>
        </div>

        <div class="prof-card glass-panel" style="margin-top:14px">
          <div class="prof-card-head">
            <i data-icon="shield"></i>
            <h4>Safety Number (ECDH P-256)</h4>
            <span class="pill-verified-green xs">Verified E2EE</span>
          </div>

          <p class="muted xs" style="line-height:1.5;margin:4px 0 10px">
            Compare this safety fingerprint with your contacts to verify that your direct end-to-end encryption has not been intercepted.
          </p>

          <div class="row gap-s align-center">
            <code class="mono safety-num-box">${fp}</code>
            <button type="button" class="btn ghost sm" id="copySafetyNumBtn">${icon('copy')} Copy</button>
          </div>
        </div>

        <div class="prof-card glass-panel" style="margin-top:14px">
          <div class="prof-card-head">
            <i data-icon="folder"></i>
            <h4>Device Media Storage &amp; Cloud Relay</h4>
            <span class="pill green xs" id="localStorageBackendPill">Loading…</span>
          </div>

          <p class="muted xs" style="line-height:1.5;margin:4px 0 12px">
            Media transfers are cached locally on your device and temporarily relayed via Encrypted Cloud Relay (auto-freed after <strong id="relayGraceHoursLabel">48h</strong> once delivered to chat members).
          </p>

          <div class="row between align-center" style="gap:12px;flex-wrap:wrap;">
            <div class="muted xs" id="localStorageStatsText">Checking local device storage…</div>
            <button type="button" class="btn ghost sm" id="clearLocalMediaCacheBtn">Clear Device Cache</button>
          </div>
        </div>

        <div class="prof-card glass-panel" style="margin-top:14px">
          <div class="prof-card-head">
            <i data-icon="refresh"></i>
            <h4>Google Drive Encrypted Backup (WhatsApp Model)</h4>
            <span class="pill xs" id="gdriveStatusPill">Checking…</span>
          </div>

          <p class="muted xs" style="line-height:1.5;margin:4px 0 12px">
            Incrementally encrypts only <strong>new</strong> media &amp; chat history with your personal E2EE vault key and uploads directly to your private Google Drive app folder.
          </p>

          <div class="muted xs" id="gdriveBackupSummary" style="margin-bottom:12px;line-height:1.5;">Loading backup status…</div>

          <div class="row between align-center" style="gap:10px;flex-wrap:wrap;margin-bottom:12px;">
            <label for="gdriveScheduleSelect" class="xs" style="font-weight:600;">Auto-Backup Schedule</label>
            <select id="gdriveScheduleSelect" class="input" style="max-width:230px;padding:6px 10px;font-size:12.5px;">
              <option value="7">Every 7 days (Recommended)</option>
              <option value="1">Daily</option>
              <option value="0">Manual only</option>
            </select>
          </div>

          <div id="gdriveProgressWrap" class="hidden" style="margin-bottom:12px;">
            <div class="muted xs" id="gdriveProgressText" style="margin-bottom:6px;">Working…</div>
            <div style="height:6px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;">
              <div id="gdriveProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#10b981,#3b82f6);transition:width .2s ease;"></div>
            </div>
          </div>

          <div id="gdriveApiHelpBox" class="hidden" style="margin-bottom:12px;padding:10px 12px;border-radius:10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);font-size:12px;line-height:1.5;color:#fde68a;"></div>

          <div class="row gap-s" style="flex-wrap:wrap;">
            <button type="button" class="btn primary sm" id="gdriveConnectBtn">Connect Google Drive</button>
            <button type="button" class="btn ghost sm" id="gdriveBackupNowBtn">Back Up Now</button>
            <button type="button" class="btn ghost sm" id="gdriveRestoreBtn">Restore from Drive</button>
            <button type="button" class="btn ghost sm" id="gdriveDisconnectBtn" style="display:none;">Disconnect</button>
          </div>

          <div class="row gap-s" style="flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
            <button type="button" class="btn ghost sm" id="exportOfflineBackupBtn">${icon('download')} Export .zovio File</button>
            <button type="button" class="btn ghost sm" id="importOfflineBackupBtn">${icon('file')} Import .zovio File</button>
            <input type="file" id="importOfflineBackupInput" accept=".zovio" class="hidden">
          </div>
        </div>
      </div>
    `;

    hydrateIcons(mainArea);

    $('#copySafetyNumBtn', mainArea).onclick = () => {
      navigator.clipboard?.writeText(fp);
      SoundFX.play('save');
      toast('Safety number copied to clipboard');
    };

    const refreshStorageStats = async () => {
      const statsEl = $('#localStorageStatsText', mainArea);
      const pillEl = $('#localStorageBackendPill', mainArea);
      const graceEl = $('#relayGraceHoursLabel', mainArea);
      if (!statsEl) return;
      const stats = window.ZovioLocalDB ? await ZovioLocalDB.getStats() : { supported: false, mediaCount: 0, totalBytes: 0, chatCount: 0 };
      const mb = (stats.totalBytes / (1024 * 1024)).toFixed(2);
      statsEl.textContent = stats.supported
        ? `${stats.mediaCount} cached file(s) (${mb} MB) · ${stats.chatCount} chat snapshot(s) on this device`
        : 'Device IndexedDB unavailable in this browser';
      try {
        const srvStatus = await api('/api/status');
        cachedProfileStatus = srvStatus;
        const graceH = srvStatus.relayPolicy?.graceHours;
        if (graceEl && graceH !== undefined) {
          graceEl.textContent = graceH === 0 ? '0h (immediate)' : `${graceH}h`;
        }
        if (pillEl) {
          const s3Ok = srvStatus.s3Test?.ok || srvStatus.s3?.configured;
          pillEl.textContent = s3Ok
            ? `Backblaze B2 (${graceH ?? 48}h) + Device`
            : (srvStatus.files || 'Disk + Device');
        }
      } catch {
        if (pillEl) pillEl.textContent = 'Device Cache Active';
      }
    };
    refreshStorageStats();

    const clearCacheBtn = $('#clearLocalMediaCacheBtn', mainArea);
    if (clearCacheBtn) {
      clearCacheBtn.onclick = async () => {
        if (!window.ZovioLocalDB) return;
        await ZovioLocalDB.clearAllMedia();
        toast('Cleared local media cache on this device');
        refreshStorageStats();
      };
    }

    const gdrivePill = $('#gdriveStatusPill', mainArea);
    const gdriveSummary = $('#gdriveBackupSummary', mainArea);
    const gdriveSchedSel = $('#gdriveScheduleSelect', mainArea);
    const gdriveProgressWrap = $('#gdriveProgressWrap', mainArea);
    const gdriveProgressText = $('#gdriveProgressText', mainArea);
    const gdriveProgressBar = $('#gdriveProgressBar', mainArea);
    const gdriveConnectBtn = $('#gdriveConnectBtn', mainArea);
    const gdriveBackupNowBtn = $('#gdriveBackupNowBtn', mainArea);
    const gdriveRestoreBtn = $('#gdriveRestoreBtn', mainArea);
    const gdriveDisconnectBtn = $('#gdriveDisconnectBtn', mainArea);

    const setBackupProgress = (show, pct = 0, text = '') => {
      if (!gdriveProgressWrap) return;
      gdriveProgressWrap.classList.toggle('hidden', !show);
      if (gdriveProgressBar) gdriveProgressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      if (gdriveProgressText) gdriveProgressText.textContent = text;
    };

    const refreshDriveUI = () => {
      const st = window.ZovioDriveBackup?.getStatus ? window.ZovioDriveBackup.getStatus() : { connected: false, scheduleDays: 7 };
      if (gdriveSchedSel) gdriveSchedSel.value = String(st.scheduleDays ?? 7);
      if (gdrivePill) {
        gdrivePill.className = `pill xs ${st.connected ? (st.due ? 'amber' : 'green') : ''}`;
        gdrivePill.textContent = st.connected
          ? (st.due ? 'Backup Due' : (st.tokenValid ? 'Connected' : 'Linked'))
          : 'Not Connected';
      }
      if (gdriveConnectBtn) {
        gdriveConnectBtn.textContent = st.connected ? 'Reconnect Google Drive' : 'Connect Google Drive';
      }
      if (gdriveDisconnectBtn) {
        gdriveDisconnectBtn.style.display = st.connected ? 'inline-flex' : 'none';
      }
      if (gdriveSummary) {
        if (!st.connected) {
          gdriveSummary.textContent = 'Connect your Google account to keep encrypted chat & media backups safely synced across Windows reinstalls.';
        } else {
          const who = st.email ? `Account: ${st.email}` : 'Google Drive linked';
          const lastStr = st.lastBackupAt ? new Date(st.lastBackupAt).toLocaleString() : 'Never backed up yet';
          const nextStr = st.nextBackupAt ? new Date(st.nextBackupAt).toLocaleDateString() : 'Manual';
          gdriveSummary.textContent = `${who} · Last backup: ${lastStr} · Synced: ${st.fileCount} file(s), ${st.chatCount} chat(s) · Next auto-backup: ${nextStr}`;
        }
      }
    };
    refreshDriveUI();

    const setDriveButtonsBusy = busy => {
      [gdriveConnectBtn, gdriveBackupNowBtn, gdriveRestoreBtn, gdriveDisconnectBtn].forEach(b => {
        if (b) b.disabled = busy;
      });
    };

    if (gdriveSchedSel) {
      gdriveSchedSel.onchange = async () => {
        if (!window.ZovioDriveBackup) return;
        await window.ZovioDriveBackup.saveScheduleDays(Number(gdriveSchedSel.value));
        toast('Auto-backup schedule saved', 'ok');
        refreshDriveUI();
      };
    }

    if (gdriveConnectBtn) {
      gdriveConnectBtn.onclick = async () => {
        if (!window.ZovioDriveBackup) return;
        setDriveButtonsBusy(true);
        try {
          const res = await window.ZovioDriveBackup.connect();
          toast(`Google Drive connected${res.email ? ` (${res.email})` : ''}`, 'ok');
          refreshDriveUI();
        } catch (err) {
          toast(err.message || 'Could not connect Google Drive', 'err');
        } finally {
          setDriveButtonsBusy(false);
        }
      };
    }

    if (gdriveDisconnectBtn) {
      gdriveDisconnectBtn.onclick = async () => {
        if (!window.ZovioDriveBackup) return;
        await window.ZovioDriveBackup.disconnect();
        toast('Google Drive disconnected');
        refreshDriveUI();
      };
    }

    const gdriveHelpBox = $('#gdriveApiHelpBox', mainArea);
    const showDriveHelp = (err) => {
      if (!gdriveHelpBox) return;
      if (!err || (!err.needsDriveApiEnable && !err.activationUrl)) {
        gdriveHelpBox.classList.add('hidden');
        gdriveHelpBox.innerHTML = '';
        return;
      }
      const url = err.activationUrl || 'https://console.cloud.google.com/apis/library/drive.googleapis.com';
      gdriveHelpBox.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;">⚠️ Google Drive API is not enabled on your Google Cloud project yet</div>
        <div style="opacity:.92;margin-bottom:8px;">Open Google Cloud Console, click <strong>Enable</strong> on <em>Google Drive API</em>, wait ~1 minute, then click <strong>Back Up Now</strong> again.</div>
        <button type="button" class="btn sm primary" id="openGdriveEnableUrlBtn">Enable Google Drive API →</button>
      `;
      gdriveHelpBox.classList.remove('hidden');
      const btn = $('#openGdriveEnableUrlBtn', gdriveHelpBox);
      if (btn) {
        btn.onclick = () => {
          if (window.fireuppNative?.openExternal) window.fireuppNative.openExternal(url);
          else window.open(url, '_blank', 'noopener,noreferrer');
        };
      }
    };

    if (gdriveBackupNowBtn) {
      gdriveBackupNowBtn.onclick = async () => {
        if (!window.ZovioDriveBackup) return;
        showDriveHelp(null);
        setDriveButtonsBusy(true);
        setBackupProgress(true, 4, 'Starting encrypted backup…');
        try {
          const res = await window.ZovioDriveBackup.runBackup({
            interactive: true,
            onProgress: ({ pct, text }) => setBackupProgress(true, pct, text)
          });
          SoundFX.play('save');
          toast(`Drive backup done: ${res.newFilesUploaded} new file(s) uploaded, ${res.alreadySynced} skipped`, 'ok');
          refreshDriveUI();
        } catch (err) {
          showDriveHelp(err);
          toast(err.message || 'Google Drive backup failed', 'err');
        } finally {
          setDriveButtonsBusy(false);
          setTimeout(() => setBackupProgress(false), 1200);
        }
      };
    }

    if (gdriveRestoreBtn) {
      gdriveRestoreBtn.onclick = async () => {
        if (!window.ZovioDriveBackup) return;
        showDriveHelp(null);
        setDriveButtonsBusy(true);
        setBackupProgress(true, 4, 'Checking Google Drive backup…');
        try {
          const res = await window.ZovioDriveBackup.runRestore({
            interactive: true,
            onProgress: ({ pct, text }) => setBackupProgress(true, pct, text)
          });
          SoundFX.play('save');
          toast(`Restored ${res.restoredChats} chat(s) & ${res.restoredFiles} media file(s) from Drive`, 'ok');
          refreshStorageStats();
          refreshDriveUI();
        } catch (err) {
          showDriveHelp(err);
          toast(err.message || 'Google Drive restore failed', 'err');
        } finally {
          setDriveButtonsBusy(false);
          setTimeout(() => setBackupProgress(false), 1200);
        }
      };
    }

    const exportBtn = $('#exportOfflineBackupBtn', mainArea);
    const importBtn = $('#importOfflineBackupBtn', mainArea);
    const importInput = $('#importOfflineBackupInput', mainArea);
    if (exportBtn) {
      exportBtn.onclick = async () => {
        if (!window.ZovioDriveBackup) return;
        setBackupProgress(true, 10, 'Preparing encrypted .zovio archive…');
        try {
          const res = await window.ZovioDriveBackup.exportOfflineBackup(({ pct, text }) => setBackupProgress(true, pct, text));
          toast(`Exported ${res.chatCount} chat(s) & ${res.mediaCount} file(s)`, 'ok');
        } catch (err) {
          toast(err.message || 'Export failed', 'err');
        } finally {
          setTimeout(() => setBackupProgress(false), 1000);
        }
      };
    }
    if (importBtn && importInput) {
      importBtn.onclick = () => importInput.click();
      importInput.onchange = async () => {
        const f = importInput.files?.[0];
        importInput.value = '';
        if (!f || !window.ZovioDriveBackup) return;
        setBackupProgress(true, 10, 'Decrypting .zovio backup…');
        try {
          const res = await window.ZovioDriveBackup.importOfflineBackup(f, ({ pct, text }) => setBackupProgress(true, pct, text));
          toast(`Imported ${res.restoredChats} chat(s) & ${res.restoredFiles} file(s)`, 'ok');
          refreshStorageStats();
        } catch (err) {
          toast(err.message || 'Import failed', 'err');
        } finally {
          setTimeout(() => setBackupProgress(false), 1000);
        }
      };
    }
  }

  // TAB 4B: STORAGE & PLANS
  else if (tab === 'plans') {
    mainArea.innerHTML = `<div class="settings-pane-wrap" id="storagePlansPane"><div class="muted xs">Loading storage quota &amp; plans…</div></div>`;
    mountStoragePlansPane($('#storagePlansPane', mainArea), null, () => renderProfileView('plans'));
  }

  // TAB 4C: LINKED DEVICES (WhatsApp-style QR Device Linking)
  else if (tab === 'devices') {
    mainArea.innerHTML = `
      <div class="settings-pane-wrap">
        <div class="settings-pane-head">
          <h3>Linked Devices</h3>
          <p class="muted xs">Scan a Zovio Desktop or Web QR code from your phone to sync your account and E2EE keys instantly.</p>
        </div>

        <div class="prof-card" style="margin-top:14px">
          <div class="prof-card-head">
            <i data-icon="grid"></i>
            <h4>Link Another Device</h4>
          </div>
          <p class="muted xs" style="margin:6px 0 14px;line-height:1.55">
            Your encryption keys transfer directly via ephemeral ECDH P-256 + AES-256-GCM. The relay server never sees your private key or vault key.
          </p>
          <div class="row gap-s wrap">
            <button type="button" class="btn primary glow" id="scanQrToLinkBtn">
              <i data-icon="camera"></i> <span>Link a Device (Scan QR)</span>
            </button>
            <button type="button" class="btn ghost sm" id="showMyPairQrBtn">
              <i data-icon="grid"></i> <span>Show QR for This Device</span>
            </button>
          </div>
        </div>

        <div class="prof-card" style="margin-top:14px">
          <div class="prof-card-head">
            <i data-icon="shieldCheck"></i>
            <h4>Active Linked Sessions</h4>
          </div>
          <div id="linkedDevicesList" class="col gap-s" style="margin-top:10px">
            <div class="muted xs">Loading linked devices…</div>
          </div>
        </div>
      </div>
    `;
    hydrateIcons(mainArea);
    $('#scanQrToLinkBtn', mainArea).onclick = () => scanQrAndLinkDevice(() => renderProfileView('devices'));
    $('#showMyPairQrBtn', mainArea).onclick = () => openQrPairingModal();

    const listEl = $('#linkedDevicesList', mainArea);
    api('/api/device-link/devices').then(data => {
      const devices = Array.isArray(data?.linkedDevices) ? data.linkedDevices : [];
      if (!devices.length) {
        listEl.innerHTML = `<div class="muted xs">No linked desktop sessions yet. Open Zovio on another computer and click “Link with Zovio Phone QR”.</div>`;
        return;
      }
      listEl.innerHTML = devices.slice().reverse().map(d => `
        <div class="linked-device-row">
          <div class="col" style="gap:2px;min-width:0">
            <strong style="font-size:13.5px">${esc(d.label || 'Zovio Desktop')}</strong>
            <span class="muted xs">Linked ${new Date(d.linkedAt || Date.now()).toLocaleString()}</span>
          </div>
          <button type="button" class="btn danger sm" data-unlink-id="${esc(d.id)}">Unlink</button>
        </div>
      `).join('');
      $$('[data-unlink-id]', listEl).forEach(btn => {
        btn.onclick = async () => {
          await api(`/api/device-link/devices/${encodeURIComponent(btn.dataset.unlinkId)}`, { method: 'DELETE' }).catch(() => {});
          toast('Device removed', 'ok');
          renderProfileView('devices');
        };
      });
    }).catch(() => {
      listEl.innerHTML = `<div class="muted xs">Could not load linked devices.</div>`;
    });
  }

  // TAB 5: DANGER ZONE (Delete Account)
  else if (tab === 'danger') {
    mainArea.innerHTML = `
      <div class="settings-pane-wrap">
        <div class="settings-pane-head danger-text">
          <h3>Delete Account</h3>
          <p class="muted xs">Permanently delete your Zovio account and all associated encrypted chats and workspace data.</p>
        </div>

        <div class="prof-card danger-panel" style="margin-top:14px">
          <div class="prof-card-head danger-text">
            <i data-icon="trash"></i>
            <h4>Permanent Account Deletion</h4>
          </div>

          <p class="muted xs" style="line-height:1.6;margin:8px 0 16px">
            Warning: This action is irreversible. All your messages, private keys, workspace boards, and media will be permanently destroyed.
            To confirm ownership, authenticate with your Google account (<b>${esc(S.user.email || `${S.user.username}@gmail.com`)}</b>).
          </p>

          <button type="button" class="btn danger lg glow" id="triggerDeleteModalBtn">
            <i data-icon="trash"></i> <span>Delete My Account</span>
          </button>
        </div>
      </div>
    `;

    hydrateIcons(mainArea);

    $('#triggerDeleteModalBtn', mainArea).onclick = openDeleteAccountModal;
  }
}

function openDeleteAccountModal() {
  const email = (S.user?.email || `${S.user?.username}@gmail.com`).toLowerCase();
  showModal('Delete Zovio Account', `
    <div class="col gap-m" style="max-width:440px;text-align:center;padding:12px 6px;">
      <div style="font-size:46px;margin-bottom:6px;">⚠️</div>
      <h3 style="margin:0;font-size:18px;font-weight:700;color:#ef4444;">Permanently Delete Account</h3>
      <p class="muted" style="line-height:1.55;font-size:13.5px;margin:4px 0 14px 0;">
        This action is permanent and cannot be undone. All your messages, private keys, media, workspace items, and profile details will be permanently removed.
      </p>
      <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:12px;font-size:13px;color:#fca5a5;margin-bottom:14px;text-align:left;">
        <div><b>Account:</b> ${esc(S.user?.name || 'User')} (@${esc(S.user?.username || '')})</div>
        <div style="margin-top:3px;"><b>Email:</b> ${esc(email)}</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:var(--text-2);text-align:left;line-height:1.5;">
        <div style="font-weight:600;color:#fff;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
          <span>🔒 Google Account Verification</span>
        </div>
        Authenticate with your Google account (<b>${esc(email)}</b>) to verify ownership and permanently delete your account.
      </div>
      <button type="button" class="btn danger lg glow" id="confirmGoogleDeleteBtn" style="width:100%;padding:13px 18px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:10px;">
        <svg viewBox="0 0 24 24" width="18" height="18" style="background:#fff;border-radius:50%;padding:2px;flex-shrink:0;">
          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/>
          <path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"/>
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"/>
        </svg>
        <span id="confirmGoogleDeleteBtnText">Verify with Google & Delete Account</span>
      </button>
      <div id="deleteDesktopStatus" style="display:none;margin-top:10px;font-size:12.5px;color:#94a3b8;line-height:1.45;"></div>
      <button type="button" class="btn ghost sm" id="cancelDeleteBtn" style="margin-top:6px;">Cancel</button>
    </div>
  `, box => {
    hydrateIcons(box);
    const btn = $('#confirmGoogleDeleteBtn', box);
    const statusDiv = $('#deleteDesktopStatus', box);
    let pollInterval = null;
    let isDeleting = false;

    const cleanup = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (window._desktopAuthSessionHandler === handleDesktopDeleteResult) {
        window._desktopAuthSessionHandler = null;
      }
    };

    $('#cancelDeleteBtn', box).onclick = () => {
      cleanup();
      closeModal();
    };

    const renderDefaultBtn = () => {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" style="background:#fff;border-radius:50%;padding:2px;flex-shrink:0;">
          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/>
          <path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"/>
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"/>
        </svg>
        <span>Verify with Google & Delete Account</span>
      `;
    };

    const executeDeletion = async (authedEmail, firebaseUid) => {
      if (isDeleting) return;
      isDeleting = true;
      cleanup();

      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> Deleting account…`;
      if (statusDiv) statusDiv.style.display = 'none';

      try {
        await api('/api/auth/delete-account', {
          method: 'POST',
          body: {
            googleConfirmed: true,
            email: authedEmail,
            firebaseUid: firebaseUid || null
          }
        });

        closeModal();
        try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
        SoundFX?.play('leave');
        toast('Your account was permanently deleted.', 'ok');
        setTimeout(() => logout(), 500);
      } catch (err) {
        isDeleting = false;
        renderDefaultBtn();
        toast(err.message || 'Failed to delete account', 'err');
      }
    };

    const handleDesktopDeleteResult = async (data) => {
      if (!data || !data.email) return;
      const authedEmail = String(data.email).trim().toLowerCase();
      const expectedEmail = email.toLowerCase().trim();
      if (authedEmail !== expectedEmail) {
        toast(`Google account (${authedEmail}) does not match your Fireupp email (${expectedEmail}).`, 'err');
        return;
      }
      await executeDeletion(authedEmail, data.uid);
    };

    btn.onclick = async () => {
      // 1. Electron Desktop flow
      if (window.fireuppNative?.openExternal) {
        const deleteSessionId = 'del_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> Verifying in browser…`;
        
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
          Opening Chrome to authenticate <b>${esc(email)}</b>.<br>
          <a href="#" id="reopenDeleteBrowser" style="color:var(--brand-purple);text-decoration:underline;display:inline-block;margin-top:6px;">Click here if Chrome didn't open</a>
        `;

        const authUrl = `https://fireupp.up.railway.app/desktop-auth.html?session=${deleteSessionId}&action=delete`;
        window.fireuppNative.openExternal(authUrl);

        $('#reopenDeleteBrowser', statusDiv)?.addEventListener('click', (e) => {
          e.preventDefault();
          window.fireuppNative.openExternal(authUrl);
        });

        window._desktopAuthSessionHandler = handleDesktopDeleteResult;

        pollInterval = setInterval(async () => {
          if (isDeleting) return cleanup();
          try {
            const res = await api(`/api/auth/desktop-session?session=${deleteSessionId}`);
            if (res && res.ready && res.authData) {
              handleDesktopDeleteResult(res.authData);
            }
          } catch (_) {}
        }, 800);

        setTimeout(() => {
          if (!isDeleting) {
            cleanup();
            renderDefaultBtn();
            if (statusDiv) statusDiv.innerHTML = `<span style="color:#ef4444;">Verification timed out. Please try again.</span>`;
          }
        }, 180000);

        return;
      }

      // 2. Web Browser flow
      try {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> Authenticating with Google…`;
        await initFirebaseClient();
        if (!window.firebase?.auth) {
          throw new Error('Google Firebase Auth SDK is not available.');
        }
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await firebase.auth().signInWithPopup(provider);
        const fbUser = result?.user;
        if (!fbUser || !fbUser.email) {
          throw new Error('No Google email was returned.');
        }
        const authedEmail = fbUser.email.toLowerCase().trim();
        const expectedEmail = email.toLowerCase().trim();
        if (authedEmail !== expectedEmail) {
          throw new Error(`Google account (${authedEmail}) does not match your Fireupp email (${expectedEmail}).`);
        }
        await executeDeletion(authedEmail, fbUser.uid);
      } catch (err) {
        renderDefaultBtn();
        if (err.code === 'auth/popup-closed-by-user') {
          toast('Google sign-in popup was closed.');
        } else {
          toast(err.message || 'Google authentication failed', 'err');
        }
      }
    };
  });
}

// ==========================================================================
// FIRESTATUS — 24-Hour Status Updates (With WhatsApp-Style Status Privacy)
// ==========================================================================
function statusPrivacyLabel(priv = S.user?.statusPrivacy) {
  const mode = priv?.mode || 'friends';
  if (mode === 'everyone') return 'Everyone';
  if (mode === 'nobody') return 'Nobody';
  if (mode === 'friends_except') return `Friends Except (${(priv?.exceptIds || []).length})`;
  if (mode === 'only_share_with') return `Only Share With (${(priv?.onlyIds || []).length})`;
  return `My Friends (${(S.user?.friends || []).length})`;
}

async function openStatusPrivacyModal(onSaved) {
  const allUsers = await api('/api/users').catch(() => []);
  allUsers.forEach(u => S.users.set(u.id, u));
  const friendIds = Array.isArray(S.user?.friends) ? S.user.friends : [];
  const blockedIds = Array.isArray(S.user?.blockedUsers) ? S.user.blockedUsers : [];
  const nonBlockedUsers = allUsers.filter(u => !blockedIds.includes(u.id));
  const friendUsers = nonBlockedUsers.filter(u => friendIds.includes(u.id));

  const curPriv = S.user?.statusPrivacy || { mode: 'friends', exceptIds: [], onlyIds: [] };
  let mode = curPriv.mode || 'friends';
  let exceptIds = new Set(curPriv.exceptIds || []);
  let onlyIds = new Set(curPriv.onlyIds || []);

  showModal(`${icon('lock')} Status Privacy (Who can see my ZovioStatus)`, `
    <div class="col gap-m" style="max-width:480px">
      <p class="muted xs" style="line-height:1.5">
        Choose who can view your 24-hour ZovioStatus updates. By default, unknown people cannot see your status until you click <b>Mark as Friend</b>.
      </p>

      <div class="col gap-xs" id="statusPrivOptions">
        <label class="status-priv-radio-card ${mode === 'friends' ? 'active' : ''}" data-mode="friends">
          <input type="radio" name="stPrivMode" value="friends" ${mode === 'friends' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">My Friends (${friendUsers.length})</div>
            <div class="status-priv-radio-card-sub">Only users you have marked as Friend can see your status</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'friends_except' ? 'active' : ''}" data-mode="friends_except">
          <input type="radio" name="stPrivMode" value="friends_except" ${mode === 'friends_except' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">My Friends Except…</div>
            <div class="status-priv-radio-card-sub">Share with your Friends except specific people you exclude below</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'only_share_with' ? 'active' : ''}" data-mode="only_share_with">
          <input type="radio" name="stPrivMode" value="only_share_with" ${mode === 'only_share_with' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">Only Share With…</div>
            <div class="status-priv-radio-card-sub">Only share your status with specific people you select below</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'everyone' ? 'active' : ''}" data-mode="everyone">
          <input type="radio" name="stPrivMode" value="everyone" ${mode === 'everyone' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">Everyone</div>
            <div class="status-priv-radio-card-sub">Show your status to everyone on Zovio (except blocked users)</div>
          </div>
        </label>
      </div>

      <!-- Picker list for Friends Except or Only Share With -->
      <div id="statusPrivPickerWrap" class="col gap-xs ${mode === 'friends_except' || mode === 'only_share_with' ? '' : 'hidden'}" style="max-height:220px;overflow-y:auto;padding:10px;background:var(--bg-2);border-radius:14px;border:1px solid var(--border)">
      </div>

      <div class="row between align-center" style="margin-top:6px">
        <button type="button" class="btn ghost sm" id="goManageFriendsFromPrivBtn">👥 Manage Friends</button>
        <div class="row gap-s">
          <button type="button" class="btn ghost" id="cancelStatusPrivBtn">Cancel</button>
          <button type="button" class="btn primary glow" id="saveStatusPrivBtn">Save Privacy</button>
        </div>
      </div>
    </div>
  `, box => {
    const pickerWrap = $('#statusPrivPickerWrap', box);

    const renderPicker = () => {
      if (mode !== 'friends_except' && mode !== 'only_share_with') {
        pickerWrap.classList.add('hidden');
        return;
      }
      pickerWrap.classList.remove('hidden');
      const pool = mode === 'friends_except' ? friendUsers : nonBlockedUsers;
      const isExcept = mode === 'friends_except';

      if (!pool.length) {
        pickerWrap.innerHTML = `<div class="muted xs" style="padding:8px;text-align:center">${isExcept ? 'You have no marked Friends yet.' : 'No users found.'}</div>`;
        return;
      }

      pickerWrap.innerHTML = `
        <div class="muted xs" style="font-weight:700;margin-bottom:4px">
          ${isExcept ? 'Select friends to EXCLUDE from seeing your status:' : 'Select specific people who CAN see your status:'}
        </div>
        ${pool.map(u => {
          const checked = isExcept ? exceptIds.has(u.id) : onlyIds.has(u.id);
          return `
            <label class="row between align-center bio-priv-user-row">
              <div class="row gap-s align-center">
                ${avatarHTML(u, 'xs')}
                <div>
                  <div style="font-weight:700;font-size:13px">${esc(u.name)}</div>
                  <div class="muted xs">@${esc(u.username)} ${friendIds.includes(u.id) ? '· Friend' : ''}</div>
                </div>
              </div>
              <input type="checkbox" data-pickuid="${u.id}" style="width:18px;height:18px;accent-color:${isExcept ? '#ef4444' : '#10b981'}" ${checked ? 'checked' : ''}>
            </label>
          `;
        }).join('')}
      `;

      $$('input[data-pickuid]', pickerWrap).forEach(cb => {
        cb.onchange = () => {
          SoundFX.play('toggle');
          const uid = cb.dataset.pickuid;
          const set = isExcept ? exceptIds : onlyIds;
          if (cb.checked) set.add(uid); else set.delete(uid);
        };
      });
    };

    $$('input[name="stPrivMode"]', box).forEach(radio => {
      radio.onchange = () => {
        SoundFX.play('toggle');
        mode = radio.value;
        $$('.status-priv-radio-card', box).forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
        renderPicker();
      };
    });

    renderPicker();

    $('#cancelStatusPrivBtn', box).onclick = closeModal;
    $('#goManageFriendsFromPrivBtn', box).onclick = () => {
      closeModal();
      openProfileModal('friends');
    };

    $('#saveStatusPrivBtn', box).onclick = async () => {
      const statusPrivacy = {
        mode,
        exceptIds: [...exceptIds],
        onlyIds: [...onlyIds]
      };
      try {
        const updated = await api('/api/me', { method: 'PATCH', body: { statusPrivacy } });
        Object.assign(S.user, updated);
        SoundFX.play('save');
        toast(`Status privacy updated: ${statusPrivacyLabel(S.user.statusPrivacy)}`);
        closeModal();
        if (S.view === 'status') renderStatusView();
        if (onSaved) onSaved(S.user.statusPrivacy);
      } catch (err) {
        toast(err.message, 'err');
      }
    };
  });
}

async function openBioPrivacyModal(onSaved) {
  const allUsers = await api('/api/users').catch(() => []);
  allUsers.forEach(u => S.users.set(u.id, u));
  const friendIds = Array.isArray(S.user?.friends) ? S.user.friends : [];
  const blockedIds = Array.isArray(S.user?.blockedUsers) ? S.user.blockedUsers : [];
  const nonBlockedUsers = allUsers.filter(u => !blockedIds.includes(u.id));
  const friendUsers = nonBlockedUsers.filter(u => friendIds.includes(u.id));

  const curPriv = S.user?.bioPrivacy || { mode: 'friends', exceptIds: [], onlyIds: [] };
  let mode = curPriv.mode || 'friends';
  let exceptIds = new Set(curPriv.exceptIds || []);
  let onlyIds = new Set(curPriv.onlyIds || []);

  showModal(`${icon('lock')} Bio Privacy (Who can see my Bio)`, `
    <div class="col gap-m" style="max-width:480px">
      <p class="muted xs" style="line-height:1.5">
        Choose who can view the Bio / About on your profile card and in direct chat headers. By default, only people you have marked as Friend can see your Bio.
      </p>

      <div class="col gap-xs" id="bioPrivOptions">
        <label class="status-priv-radio-card ${mode === 'friends' ? 'active' : ''}" data-mode="friends">
          <input type="radio" name="bioPrivMode" value="friends" ${mode === 'friends' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">My Friends (${friendUsers.length})</div>
            <div class="status-priv-radio-card-sub">Only users you have marked as Friend can see your bio</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'friends_except' ? 'active' : ''}" data-mode="friends_except">
          <input type="radio" name="bioPrivMode" value="friends_except" ${mode === 'friends_except' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">My Friends Except…</div>
            <div class="status-priv-radio-card-sub">Visible to your Friends except specific people you exclude below</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'only_share_with' ? 'active' : ''}" data-mode="only_share_with">
          <input type="radio" name="bioPrivMode" value="only_share_with" ${mode === 'only_share_with' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">Only Share With…</div>
            <div class="status-priv-radio-card-sub">Only visible to specific people you select below</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'everyone' ? 'active' : ''}" data-mode="everyone">
          <input type="radio" name="bioPrivMode" value="everyone" ${mode === 'everyone' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">Everyone</div>
            <div class="status-priv-radio-card-sub">Show your bio to everyone on Zovio (except blocked users)</div>
          </div>
        </label>
      </div>

      <!-- Picker list for Friends Except or Only Share With -->
      <div id="bioPrivPickerWrap" class="col gap-xs ${mode === 'friends_except' || mode === 'only_share_with' ? '' : 'hidden'}" style="max-height:220px;overflow-y:auto;padding:10px;background:var(--bg-2);border-radius:14px;border:1px solid var(--border)">
      </div>

      <div class="row between align-center" style="margin-top:6px">
        <button type="button" class="btn ghost sm" id="goManageFriendsFromBioPrivBtn">👥 Manage Friends</button>
        <div class="row gap-s">
          <button type="button" class="btn ghost" id="cancelBioPrivBtn">Cancel</button>
          <button type="button" class="btn primary glow" id="saveBioPrivBtn">Save Privacy</button>
        </div>
      </div>
    </div>
  `, box => {
    const pickerWrap = $('#bioPrivPickerWrap', box);

    const renderPicker = () => {
      if (mode !== 'friends_except' && mode !== 'only_share_with') {
        pickerWrap.classList.add('hidden');
        return;
      }
      pickerWrap.classList.remove('hidden');
      const pool = mode === 'friends_except' ? friendUsers : nonBlockedUsers;
      const isExcept = mode === 'friends_except';

      if (!pool.length) {
        pickerWrap.innerHTML = `<div class="muted xs" style="padding:8px;text-align:center">${isExcept ? 'You have no marked Friends yet.' : 'No users found.'}</div>`;
        return;
      }

      pickerWrap.innerHTML = `
        <div class="muted xs" style="font-weight:700;margin-bottom:4px">
          ${isExcept ? 'Select friends to EXCLUDE from seeing your bio:' : 'Select specific people who CAN see your bio:'}
        </div>
        ${pool.map(u => {
          const checked = isExcept ? exceptIds.has(u.id) : onlyIds.has(u.id);
          return `
            <label class="row between align-center bio-priv-user-row">
              <div class="row gap-s align-center">
                ${avatarHTML(u, 'xs')}
                <div>
                  <div style="font-weight:700;font-size:13px">${esc(u.name)}</div>
                  <div class="muted xs">@${esc(u.username)} ${friendIds.includes(u.id) ? '· Friend' : ''}</div>
                </div>
              </div>
              <input type="checkbox" data-pickuid="${u.id}" style="width:18px;height:18px;accent-color:${isExcept ? '#ef4444' : '#10b981'}" ${checked ? 'checked' : ''}>
            </label>
          `;
        }).join('')}
      `;

      $$('input[data-pickuid]', pickerWrap).forEach(cb => {
        cb.onchange = () => {
          SoundFX.play('toggle');
          const uid = cb.dataset.pickuid;
          const set = isExcept ? exceptIds : onlyIds;
          if (cb.checked) set.add(uid); else set.delete(uid);
        };
      });
    };

    $$('input[name="bioPrivMode"]', box).forEach(radio => {
      radio.onchange = () => {
        SoundFX.play('toggle');
        mode = radio.value;
        $$('.status-priv-radio-card', box).forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
        renderPicker();
      };
    });

    renderPicker();

    $('#cancelBioPrivBtn', box).onclick = closeModal;
    $('#goManageFriendsFromBioPrivBtn', box).onclick = () => {
      closeModal();
      openProfileModal('friends');
    };

    $('#saveBioPrivBtn', box).onclick = async () => {
      const bioPrivacy = {
        mode,
        exceptIds: [...exceptIds],
        onlyIds: [...onlyIds]
      };
      try {
        const updated = await api('/api/me', { method: 'PATCH', body: { bioPrivacy } });
        Object.assign(S.user, updated);
        SoundFX.play('save');
        toast(`Bio privacy updated: ${statusPrivacyLabel(S.user.bioPrivacy)}`);
        closeModal();
        if (onSaved) onSaved(S.user.bioPrivacy);
      } catch (err) {
        toast(err.message, 'err');
      }
    };
  });
}

async function openPhonePrivacyModal(onSaved) {
  const allUsers = await api('/api/users').catch(() => []);
  allUsers.forEach(u => S.users.set(u.id, u));
  const friendIds = Array.isArray(S.user?.friends) ? S.user.friends : [];
  const blockedIds = Array.isArray(S.user?.blockedUsers) ? S.user.blockedUsers : [];
  const nonBlockedUsers = allUsers.filter(u => !blockedIds.includes(u.id));
  const friendUsers = nonBlockedUsers.filter(u => friendIds.includes(u.id));

  const curPriv = S.user?.phonePrivacy || { mode: 'friends', exceptIds: [], onlyIds: [] };
  let mode = curPriv.mode || 'friends';
  let exceptIds = new Set(curPriv.exceptIds || []);
  let onlyIds = new Set(curPriv.onlyIds || []);

  showModal(`${icon('lock')} Phone Number Privacy (Who can see my Phone Number)`, `
    <div class="col gap-m" style="max-width:480px">
      <p class="muted xs" style="line-height:1.5">
        Choose who can view your mobile phone number on contact info and direct chats. By default, only people you have marked as Friend can see your phone number.
      </p>

      <div class="col gap-xs" id="phonePrivOptions">
        <label class="status-priv-radio-card ${mode === 'friends' ? 'active' : ''}" data-mode="friends">
          <input type="radio" name="phonePrivMode" value="friends" ${mode === 'friends' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">My Friends (${friendUsers.length})</div>
            <div class="status-priv-radio-card-sub">Only users you have marked as Friend can see your phone number</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'friends_except' ? 'active' : ''}" data-mode="friends_except">
          <input type="radio" name="phonePrivMode" value="friends_except" ${mode === 'friends_except' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">My Friends Except…</div>
            <div class="status-priv-radio-card-sub">Visible to your Friends except specific people you exclude below</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'only_share_with' ? 'active' : ''}" data-mode="only_share_with">
          <input type="radio" name="phonePrivMode" value="only_share_with" ${mode === 'only_share_with' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">Only Share With…</div>
            <div class="status-priv-radio-card-sub">Only visible to specific people you select below</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'everyone' ? 'active' : ''}" data-mode="everyone">
          <input type="radio" name="phonePrivMode" value="everyone" ${mode === 'everyone' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">Everyone</div>
            <div class="status-priv-radio-card-sub">Show your phone number to everyone on Zovio (except blocked users)</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'nobody' ? 'active' : ''}" data-mode="nobody">
          <input type="radio" name="phonePrivMode" value="nobody" ${mode === 'nobody' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">Nobody</div>
            <div class="status-priv-radio-card-sub">Keep your phone number completely private and hidden from everyone</div>
          </div>
        </label>
      </div>

      <!-- Picker list for Friends Except or Only Share With -->
      <div id="phonePrivPickerWrap" class="col gap-xs ${mode === 'friends_except' || mode === 'only_share_with' ? '' : 'hidden'}" style="max-height:220px;overflow-y:auto;padding:10px;background:var(--bg-2);border-radius:14px;border:1px solid var(--border)">
      </div>

      <div class="row between align-center" style="margin-top:6px">
        <button type="button" class="btn ghost sm" id="goManageFriendsFromPhonePrivBtn">👥 Manage Friends</button>
        <div class="row gap-s">
          <button type="button" class="btn ghost" id="cancelPhonePrivBtn">Cancel</button>
          <button type="button" class="btn primary glow" id="savePhonePrivBtn">Save Privacy</button>
        </div>
      </div>
    </div>
  `, box => {
    const pickerWrap = $('#phonePrivPickerWrap', box);

    const renderPicker = () => {
      if (mode !== 'friends_except' && mode !== 'only_share_with') {
        pickerWrap.classList.add('hidden');
        return;
      }
      pickerWrap.classList.remove('hidden');
      const pool = mode === 'friends_except' ? friendUsers : nonBlockedUsers;
      const isExcept = mode === 'friends_except';

      if (!pool.length) {
        pickerWrap.innerHTML = `<div class="muted xs" style="padding:8px;text-align:center">${isExcept ? 'You have no marked Friends yet.' : 'No users found.'}</div>`;
        return;
      }

      pickerWrap.innerHTML = `
        <div class="muted xs" style="font-weight:700;margin-bottom:4px">
          ${isExcept ? 'Select friends to EXCLUDE from seeing your phone number:' : 'Select specific people who CAN see your phone number:'}
        </div>
        ${pool.map(u => {
          const checked = isExcept ? exceptIds.has(u.id) : onlyIds.has(u.id);
          return `
            <label class="row between align-center bio-priv-user-row">
              <div class="row gap-s align-center">
                ${avatarHTML(u, 'xs')}
                <div>
                  <div style="font-weight:700;font-size:13px">${esc(u.name)}</div>
                  <div class="muted xs">@${esc(u.username)} ${friendIds.includes(u.id) ? '· Friend' : ''}</div>
                </div>
              </div>
              <input type="checkbox" data-pickuid="${u.id}" style="width:18px;height:18px;accent-color:${isExcept ? '#ef4444' : '#10b981'}" ${checked ? 'checked' : ''}>
            </label>
          `;
        }).join('')}
      `;

      $$('input[data-pickuid]', pickerWrap).forEach(cb => {
        cb.onchange = () => {
          SoundFX.play('toggle');
          const uid = cb.dataset.pickuid;
          const set = isExcept ? exceptIds : onlyIds;
          if (cb.checked) set.add(uid); else set.delete(uid);
        };
      });
    };

    $$('input[name="phonePrivMode"]', box).forEach(radio => {
      radio.onchange = () => {
        SoundFX.play('toggle');
        mode = radio.value;
        $$('.status-priv-radio-card', box).forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
        renderPicker();
      };
    });

    renderPicker();

    $('#cancelPhonePrivBtn', box).onclick = closeModal;
    $('#goManageFriendsFromPhonePrivBtn', box).onclick = () => {
      closeModal();
      openProfileModal('friends');
    };

    $('#savePhonePrivBtn', box).onclick = async () => {
      const phonePrivacy = {
        mode,
        exceptIds: [...exceptIds],
        onlyIds: [...onlyIds]
      };
      try {
        const updated = await api('/api/me', { method: 'PATCH', body: { phonePrivacy } });
        Object.assign(S.user, updated);
        SoundFX.play('save');
        toast(`Phone privacy updated: ${statusPrivacyLabel(S.user.phonePrivacy)}`);
        closeModal();
        if (onSaved) onSaved(S.user.phonePrivacy);
      } catch (err) {
        toast(err.message, 'err');
      }
    };
  });
}

async function openMentionPrivacyModal(onSaved) {
  const allUsers = await api('/api/users').catch(() => []);
  allUsers.forEach(u => S.users.set(u.id, u));
  const friendIds = Array.isArray(S.user?.friends) ? S.user.friends : [];
  const blockedIds = Array.isArray(S.user?.blockedUsers) ? S.user.blockedUsers : [];
  const nonBlockedUsers = allUsers.filter(u => !blockedIds.includes(u.id));
  const friendUsers = nonBlockedUsers.filter(u => friendIds.includes(u.id));

  const curPriv = S.user?.mentionPrivacy || { mode: 'everyone', exceptIds: [], onlyIds: [] };
  let mode = curPriv.mode || 'everyone';
  let exceptIds = new Set(curPriv.exceptIds || []);
  let onlyIds = new Set(curPriv.onlyIds || []);

  showModal(`${icon('atSign')} Status Mention Privacy (Who can mention me)`, `
    <div class="col gap-m" style="max-width:480px">
      <p class="muted xs" style="line-height:1.5">
        Choose who can @tag or mention your account in their 24-hour ZovioStatus stories. When someone mentions you, you receive a direct notification and story credit.
      </p>

      <div class="col gap-xs" id="mentionPrivOptions">
        <label class="status-priv-radio-card ${mode === 'everyone' ? 'active' : ''}" data-mode="everyone">
          <input type="radio" name="mentionPrivMode" value="everyone" ${mode === 'everyone' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">Everyone</div>
            <div class="status-priv-radio-card-sub">Anyone on Zovio can tag or mention you in their status (default)</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'friends' ? 'active' : ''}" data-mode="friends">
          <input type="radio" name="mentionPrivMode" value="friends" ${mode === 'friends' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">My Friends (${friendUsers.length})</div>
            <div class="status-priv-radio-card-sub">Only people you have marked as Friend can mention you</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'friends_except' ? 'active' : ''}" data-mode="friends_except">
          <input type="radio" name="mentionPrivMode" value="friends_except" ${mode === 'friends_except' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">My Friends Except…</div>
            <div class="status-priv-radio-card-sub">Friends can mention you except specific people you exclude below</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'only_share_with' ? 'active' : ''}" data-mode="only_share_with">
          <input type="radio" name="mentionPrivMode" value="only_share_with" ${mode === 'only_share_with' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">Only Share With…</div>
            <div class="status-priv-radio-card-sub">Only specific people you select below are allowed to mention you</div>
          </div>
        </label>

        <label class="status-priv-radio-card ${mode === 'nobody' ? 'active' : ''}" data-mode="nobody">
          <input type="radio" name="mentionPrivMode" value="nobody" ${mode === 'nobody' ? 'checked' : ''}>
          <div class="status-priv-radio-card-content">
            <div class="status-priv-radio-card-title">Nobody</div>
            <div class="status-priv-radio-card-sub">Disable all story mentions; nobody can tag you in their status</div>
          </div>
        </label>
      </div>

      <!-- Picker list for Friends Except or Only Share With -->
      <div id="mentionPrivPickerWrap" class="col gap-xs ${mode === 'friends_except' || mode === 'only_share_with' ? '' : 'hidden'}" style="max-height:220px;overflow-y:auto;padding:10px;background:var(--bg-2);border-radius:14px;border:1px solid var(--border)">
      </div>

      <div class="row between align-center" style="margin-top:6px">
        <button type="button" class="btn ghost sm" id="goManageFriendsFromMentionPrivBtn">👥 Manage Friends</button>
        <div class="row gap-s">
          <button type="button" class="btn ghost" id="cancelMentionPrivBtn">Cancel</button>
          <button type="button" class="btn primary glow" id="saveMentionPrivBtn">Save Privacy</button>
        </div>
      </div>
    </div>
  `, box => {
    const pickerWrap = $('#mentionPrivPickerWrap', box);

    const renderPicker = () => {
      if (mode !== 'friends_except' && mode !== 'only_share_with') {
        pickerWrap.classList.add('hidden');
        return;
      }
      pickerWrap.classList.remove('hidden');
      const pool = mode === 'friends_except' ? friendUsers : nonBlockedUsers;
      const isExcept = mode === 'friends_except';

      if (!pool.length) {
        pickerWrap.innerHTML = `<div class="muted xs" style="padding:8px;text-align:center">${isExcept ? 'You have no marked Friends yet.' : 'No users found.'}</div>`;
        return;
      }

      pickerWrap.innerHTML = `
        <div class="muted xs" style="font-weight:700;margin-bottom:4px">
          ${isExcept ? 'Select friends to EXCLUDE from mentioning you:' : 'Select specific people who CAN mention you:'}
        </div>
        ${pool.map(u => {
          const checked = isExcept ? exceptIds.has(u.id) : onlyIds.has(u.id);
          return `
            <label class="row between align-center bio-priv-user-row">
              <div class="row gap-s align-center">
                ${avatarHTML(u, 'xs')}
                <div>
                  <div style="font-weight:700;font-size:13px">${esc(u.name)}</div>
                  <div class="muted xs">@${esc(u.username)} ${friendIds.includes(u.id) ? '· Friend' : ''}</div>
                </div>
              </div>
              <input type="checkbox" data-pickuid="${u.id}" style="width:18px;height:18px;accent-color:${isExcept ? '#ef4444' : '#10b981'}" ${checked ? 'checked' : ''}>
            </label>
          `;
        }).join('')}
      `;

      $$('input[data-pickuid]', pickerWrap).forEach(cb => {
        cb.onchange = () => {
          SoundFX.play('toggle');
          const uid = cb.dataset.pickuid;
          const set = isExcept ? exceptIds : onlyIds;
          if (cb.checked) set.add(uid); else set.delete(uid);
        };
      });
    };

    $$('input[name="mentionPrivMode"]', box).forEach(radio => {
      radio.onchange = () => {
        SoundFX.play('toggle');
        mode = radio.value;
        $$('.status-priv-radio-card', box).forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
        renderPicker();
      };
    });

    renderPicker();

    $('#cancelMentionPrivBtn', box).onclick = closeModal;
    $('#goManageFriendsFromMentionPrivBtn', box).onclick = () => {
      closeModal();
      openProfileModal('friends');
    };

    $('#saveMentionPrivBtn', box).onclick = async () => {
      const mentionPrivacy = {
        mode,
        exceptIds: [...exceptIds],
        onlyIds: [...onlyIds]
      };
      try {
        const updated = await api('/api/me', { method: 'PATCH', body: { mentionPrivacy } });
        Object.assign(S.user, updated);
        SoundFX.play('save');
        toast(`Mention privacy updated: ${statusPrivacyLabel(S.user.mentionPrivacy)}`);
        closeModal();
        if (onSaved) onSaved(S.user.mentionPrivacy);
      } catch (err) {
        toast(err.message, 'err');
      }
    };
  });
}

async function loadStatuses() {
  S.statuses = await api('/api/statuses').catch(() => []);
  S.statuses.forEach(st => { if (st.user) S.users.set(st.user.id, st.user); });
  updateStatusBadge();
  if (S.view === 'status') renderStatusView();
}

function updateStatusBadge() {
  const unseen = S.statuses.filter(st => st.userId !== S.user?.id && !(st.views || []).includes(S.user?.id)).length;
  const b = $('#badge-status');
  if (b) {
    b.textContent = unseen;
    b.classList.toggle('hidden', !unseen);
  }
}

function groupStatusesByUser() {
  const map = new Map();
  for (const st of S.statuses) {
    const uid = st.userId;
    if (!map.has(uid)) {
      map.set(uid, { user: st.user || S.users.get(uid) || { id: uid, name: 'User' }, items: [] });
    }
    map.get(uid).items.push(st);
  }
  map.forEach(g => g.items.sort((a, b) => a.createdAt - b.createdAt));
  return map;
}

function renderStatusView() {
  const root = $('#view-status');
  if (!root) return;
  const groups = groupStatusesByUser();
  const myGroup = groups.get(S.user.id) || { user: S.user, items: [] };
  const otherGroups = Array.from(groups.values()).filter(g => g.user.id !== S.user.id);
  const privText = statusPrivacyLabel(S.user?.statusPrivacy);

  const hasMyStories = myGroup.items.length > 0;
  const myLatest = hasMyStories ? myGroup.items[myGroup.items.length - 1] : null;
  const myViews = hasMyStories ? myGroup.items.reduce((s, x) => s + (x.views?.length || 0), 0) : 0;

  root.innerHTML = `
    <div style="max-width:1120px;margin:0 auto" class="col gap-m">
      <!-- CLEAN FIRESTATUS HEADER -->
      <div class="row between align-center wrap gap-s" style="padding-bottom:4px">
        <div>
          <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0">ZovioStatus</h2>
          <p class="muted xs" style="margin:3px 0 0">Disappearing photo &amp; text stories (24h)</p>
        </div>
        <div class="row gap-s align-center wrap">
          <button class="btn ghost sm" id="statusPrivacyHeroBtn" style="border-radius:999px;padding:7px 15px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12)" title="Configure who can see your status">
            ${icon('lock')} <span>Audience: ${esc(privText)} ▾</span>
          </button>
          <button class="btn primary sm glow" id="newStatusPhotoBtn" style="border-radius:999px;padding:7px 18px;font-weight:700" title="Create a new story">
            ${icon('plus')} <span>Create Story</span>
          </button>
        </div>
      </div>

      <!-- UNIFIED STORIES GRID (ALL STORIES & CREATE IN ONE) -->
      <div class="status-grid">
        <!-- CARD 1: YOUR STORY (OR CREATE STORY) -->
        ${hasMyStories ? `
          <div class="status-card" id="myStoryCard" data-stuser="${S.user.id}" style="background:${esc(myLatest.bg || 'linear-gradient(135deg,#7c5cff,#ff5c8a)')}">
            ${myLatest.mediaData ? `<img class="status-card-bg" src="${esc(myLatest.mediaData)}" alt="">` : ''}
            <div class="status-card-overlay"></div>

            <div class="card-story-bars">
              ${myGroup.items.map((_, i) => `<div class="card-story-bar ${i === myGroup.items.length - 1 ? 'active' : ''}"></div>`).join('')}
            </div>

            <div class="status-card-top">
              <div class="status-ring">
                ${avatarHTML(S.user, 'sm')}
              </div>
              <button type="button" class="status-card-badge" id="quickAddMyStoryBtn" title="Add another story update" style="cursor:pointer;border-color:rgba(255,87,34,0.5);background:rgba(255,87,34,0.3)">
                ${icon('plus')} <span>Add</span>
              </button>
            </div>

            <div class="status-card-mid">
              ${myLatest.text ? `<div class="status-card-text">${esc(myLatest.text)}</div>` : ''}
            </div>

            <div class="status-card-bottom">
              <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:95px">Your Story</strong>
              <div class="row gap-xs" style="align-items:center;opacity:.9">
                ${icon('eye')} <span>${myViews}</span>
                <span style="opacity:.5">·</span>
                <span>${fmtTime(myLatest.createdAt)}</span>
              </div>
            </div>
          </div>
        ` : `
          <div class="status-create-card" id="createStoryCard">
            <div class="status-avatar-wrapper">
              <div class="status-ring">
                ${avatarHTML(S.user, 'md')}
              </div>
              <div class="status-plus-badge" title="Add Story">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
            </div>
            <div class="status-create-meta">
              <strong class="status-create-title">Create Story</strong>
              <p class="status-create-subtitle">Share photo, camera snap, or text</p>
            </div>
            <div class="status-create-action-btn">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add to Status</span>
            </div>
          </div>
        `}

        <!-- FRIENDS' STORIES CARDS -->
        ${otherGroups.map(g => {
          const latest = g.items[g.items.length - 1];
          const allSeen = g.items.every(it => (it.views || []).includes(S.user.id));
          return `
            <div class="status-card" data-stuser="${g.user.id}" style="background:${esc(latest.bg || 'linear-gradient(135deg,#7c5cff,#ff5c8a)')}">
              ${latest.mediaData ? `<img class="status-card-bg" src="${esc(latest.mediaData)}" alt="">` : ''}
              <div class="status-card-overlay"></div>

              <div class="card-story-bars">
                ${g.items.map((_, i) => `<div class="card-story-bar ${i === g.items.length - 1 ? 'active' : ''}"></div>`).join('')}
              </div>

              <div class="status-card-top">
                <div class="status-ring ${allSeen ? 'seen' : ''}">
                  ${avatarHTML(g.user, 'sm')}
                </div>
                <span class="status-card-badge">
                  ${latest.kind === 'image' ? icon('camera') : icon('note')}
                  <span>${g.items.length}</span>
                </span>
              </div>

              <div class="status-card-mid">
                ${latest.text ? `<div class="status-card-text">${esc(latest.text)}</div>` : ''}
              </div>

              <div class="status-card-bottom">
                <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:95px">${esc(g.user.name)}</strong>
                <div class="row gap-xs" style="align-items:center;opacity:.85">
                  ${icon('eye')} <span>${latest.views?.length || 0}</span>
                  <span style="opacity:.5">·</span>
                  <span>${fmtTime(latest.createdAt)}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>`;

  hydrateIcons(root);

  if ($('#newStatusPhotoBtn', root)) $('#newStatusPhotoBtn', root).onclick = () => openCreateStatusModal('image');
  if ($('#statusPrivacyHeroBtn', root)) $('#statusPrivacyHeroBtn', root).onclick = () => openStatusPrivacyModal();
  if ($('#createStoryCard', root)) $('#createStoryCard', root).onclick = () => openCreateStatusModal('image');
  if ($('#quickAddMyStoryBtn', root)) {
    $('#quickAddMyStoryBtn', root).onclick = e => {
      e.stopPropagation();
      openCreateStatusModal('image');
    };
  }
  $$('[data-stuser]', root).forEach(el => el.onclick = () => {
    const g = groups.get(el.dataset.stuser);
    if (g) openStoryViewer(g);
  });
}

function openCreateStatusModal(initialKind = 'image') {
  const igGradients = [
    'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', // Classic Instagram
    'linear-gradient(135deg, #7c5cff 0%, #ff5c8a 100%)', // Neon Sunset
    'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Emerald Glow
    'linear-gradient(135deg, #4c8dff 0%, #7c5cff 100%)', // Electric Indigo
    'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)', // Hot Coral
    'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)', // Midnight Mist
    'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', // Dark Cyan
    'linear-gradient(135deg, #121524 0%, #1a1e36 100%)' // Deep Slate
  ];

  let gradIdx = 0;
  let pickedBg = igGradients[0];
  let bgType = initialKind === 'text' ? 'gradient' : 'camera';
  let mediaData = '';
  let camStream = null;
  let facingMode = 'user';
  let isMirrored = true;

  // Elements on canvas (Texts, Stickers, Overlay Photos)
  let elements = [];
  let selectedElId = null;
  let drawPaths = []; // [{ color, size, pts: [{x, y}] }]
  let isDrawMode = false;
  let drawColor = '#ff3b30';
  let drawBrushSize = 6;
  let activeDrawingPath = null;

  const photoFilters = [
    { id: 'none', name: 'Normal', css: 'none' },
    { id: 'vivid', name: 'Vivid', css: 'saturate(1.45) contrast(1.12)' },
    { id: 'warm', name: 'Warm', css: 'sepia(0.28) saturate(1.35) brightness(1.04)' },
    { id: 'cyber', name: 'Cyber', css: 'hue-rotate(18deg) saturate(1.5) contrast(1.15)' },
    { id: 'golden', name: 'Golden', css: 'sepia(0.45) saturate(1.5) contrast(1.08)' },
    { id: 'bw', name: 'Noir', css: 'grayscale(1) contrast(1.22)' }
  ];
  let filterIdx = 0;
  let currentFilter = 'none';

  // Multi-Slide / Multi-Picture Queue
  let slides = [
    {
      id: 'slide_' + Date.now(),
      bgType,
      pickedBg,
      mediaData: '',
      filter: 'none',
      elements: [],
      drawPaths: []
    }
  ];
  let activeSlideIdx = 0;

  // Text Mode Editor State
  let editingElId = null;
  let currentFont = 'modern';
  let currentStyle = 'badge'; // 'none' | 'badge' | 'solid' | 'glow'
  let currentAlign = 'center'; // 'left' | 'center' | 'right'
  let currentColor = '#ffffff';
  let currentSize = 28;

  const fonts = [
    { id: 'modern', name: 'MODERN', family: '"Plus Jakarta Sans", sans-serif', weight: '800' },
    { id: 'classic', name: 'CLASSIC', family: 'Georgia, serif', weight: '700' },
    { id: 'neon', name: 'NEON', family: '"Caveat", cursive, sans-serif', weight: '800' },
    { id: 'typewriter', name: 'TYPEWRITER', family: '"Courier New", Courier, monospace', weight: '700' },
    { id: 'strong', name: 'STRONG', family: 'Impact, "Arial Black", sans-serif', weight: '900' },
    { id: 'script', name: 'SCRIPT', family: '"Brush Script MT", cursive, sans-serif', weight: '600' },
    { id: 'meme', name: 'MEME', family: 'Impact, sans-serif', weight: '900' }
  ];

  const igColors = [
    '#ffffff', '#000000', '#ff3b30', '#ff9500', '#ffcc00',
    '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de', '#ff2d55'
  ];

  if (window._activeStudioStream) {
    try { window._activeStudioStream.getTracks().forEach(t => t.stop()); } catch {}
    window._activeStudioStream = null;
  }
  $('#statusStudioModal')?.remove();

  const studio = document.createElement('div');
  studio.id = 'statusStudioModal';
  studio.className = 'status-studio-overlay';
  studio.innerHTML = `
    <!-- 9:16 STORY STAGE CARD -->
    <div class="studio-canvas-stage" id="studioStage" style="background:${pickedBg}">
      <video id="studioCamVideo" class="stage-bg-media mirror hidden" autoplay muted playsinline></video>
      <img id="studioPhotoImg" class="stage-bg-media hidden" alt="">
      <canvas id="studioDrawCanvas" class="studio-draw-canvas" width="540" height="960"></canvas>

      <!-- INSTAGRAM TOP ACTION BAR -->
      <div class="ig-story-top-bar" id="igStoryTopBar">
        <button type="button" class="ig-round-btn" id="igCloseStudioBtn" title="Close Story Creator">${icon('close')}</button>
        <div class="ig-top-action-group">
          <button type="button" class="ig-round-btn ig-text-icon-btn" id="igTextModeBtn" title="Add Text"><span>Aa</span></button>
          <button type="button" class="ig-round-btn" id="igOverlayPhotoBtn" title="Add Floating Picture Sticker">🖼️</button>
          <button type="button" class="ig-round-btn" id="igStickersBtn" title="Stickers, Mentions & Widgets">${icon('smile')}</button>
          <button type="button" class="ig-round-btn" id="igFilterBtn" title="Photo Filters">✨</button>
          <button type="button" class="ig-round-btn" id="igGradientBtn" title="Change Background">${icon('palette')}</button>
          <button type="button" class="ig-round-btn" id="igUploadPhotoBtn" title="Add Photos (Multiple Supported)">${icon('image')}</button>
          <button type="button" class="ig-round-btn" id="igCamToggleBtn" title="Live Camera">${icon('camera')}</button>
          <input type="file" id="igFileIn" accept="image/*" multiple class="hidden">
          <input type="file" id="igOverlayPhotoIn" accept="image/*" multiple class="hidden">
        </div>
      </div>

      <!-- FREEHAND DRAW TOOLBAR (Shown when Draw Mode is active) -->
      <div id="igDrawToolbar" class="ig-draw-toolbar hidden">
        <div class="row gap-xs align-center" style="justify-content:space-between;width:100%">
          <div class="row gap-xs align-center">
            <button type="button" class="ig-round-btn sm" id="igDrawUndoBtn" title="Undo Stroke">↩</button>
            <button type="button" class="ig-round-btn sm" id="igDrawClearBtn" title="Clear Drawing">🗑️</button>
            <input type="range" id="igDrawSizeRange" min="2" max="24" value="6" style="width:70px;accent-color:#ff5722" title="Brush Size">
          </div>
          <button type="button" class="ig-done-btn" id="igDrawDoneBtn">Done</button>
        </div>
        <div class="ig-color-swatches" id="igDrawColors" style="padding:6px 0 0">
          ${igColors.map(c => `<div class="ig-color-dot ${c === drawColor ? 'active' : ''}" data-dcolor="${c}" style="background:${c};width:22px;height:22px"></div>`).join('')}
        </div>
      </div>

      <!-- FILTER TOAST PILL -->
      <div id="igFilterBadge" class="ig-filter-badge hidden">Filter: Normal</div>

      <!-- OVERLAYS LAYER (Draggable Texts, Stickers & Floating Pictures) -->
      <div id="studioOverlayLayer" class="studio-overlay-layer"></div>

      <!-- INSTAGRAM TRASH BIN (Appears during dragging) -->
      <div id="igTrashBin" class="ig-trash-bin hidden">🗑️</div>

      <!-- MULTI-PICTURE / MULTI-SLIDE FILMSTRIP QUEUE -->
      <div id="igSlidesStrip" class="ig-slides-strip"></div>

      <!-- CAMERA SHUTTER BAR (When in Live Camera) -->
      <div id="igCameraShutterBar" class="ig-camera-shutter-bar hidden">
        <button type="button" class="ig-shutter-side-btn" id="igCamGalleryBtn" title="Pick Photos from Gallery">${icon('image')}</button>
        <div class="ig-shutter-ring" id="igSnapShutterBtn" title="Capture Shot">
          <div class="ig-shutter-inner"></div>
        </div>
        <button type="button" class="ig-shutter-side-btn" id="igFlipCamBtn" title="Flip Camera">${icon('refresh')}</button>
      </div>

      <!-- BOTTOM STORY BAR (When Ready to Post) -->
      <div id="igStoryBottomBar" class="ig-story-bottom-bar">
        <button type="button" class="ig-your-story-btn" id="igStudioPrivBtn" title="Change who can see your status">
          <span class="ig-priv-lock-icon">${icon('lock')}</span>
          <span id="igStudioPrivLabel">${esc(statusPrivacyLabel(S.user?.statusPrivacy))} ▾</span>
        </button>
        <button type="button" class="ig-post-share-btn" id="igPostShareBtn">
          <span id="igPostShareLabel">Share Story</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      <!-- FULLSCREEN INSTAGRAM TEXT MODE OVERLAY -->
      <div id="igTextEditorOverlay" class="ig-text-editor-overlay hidden">
        <div class="ig-text-top-controls">
          <div class="ig-text-actions-left">
            <button type="button" class="ig-round-btn ig-align-btn" id="igTextAlignBtn" title="Align Text">≡</button>
            <button type="button" class="ig-style-pill-btn" id="igTextStyleBtn" title="Cycle Style: Badge, Solid, Glow, Plain">[Aa] Badge</button>
          </div>
          <div class="ig-font-carousel" id="igFontCarousel">
            ${fonts.map(f => `<button type="button" class="ig-font-pill ${f.id === currentFont ? 'active' : ''}" data-font="${f.id}" style="font-family:${f.family}">${f.name}</button>`).join('')}
          </div>
          <button type="button" class="ig-done-btn" id="igDoneTextBtn">Done</button>
        </div>

        <div class="ig-text-input-area">
          <div class="ig-size-control-bar" id="igSizeControlBar">
            <button type="button" class="ig-round-btn sm" id="igFontIncBtn" title="Increase Size" style="width:28px;height:28px;font-size:11px;font-weight:800">A+</button>
            <input type="range" class="ig-vertical-size-slider" id="igFontSizeSlider" min="16" max="56" value="${currentSize}">
            <button type="button" class="ig-round-btn sm" id="igFontDecBtn" title="Decrease Size" style="width:28px;height:28px;font-size:11px;font-weight:800">A-</button>
            <span id="igFontSizeValue" class="ig-size-badge">${currentSize}px</span>
          </div>
          <textarea class="ig-story-textarea st-text-${currentStyle}" id="igStoryTextarea" placeholder="Type thoughts here…" spellcheck="false"></textarea>
        </div>

        <div class="ig-color-swatches" id="igColorSwatches">
          ${igColors.map(c => `<div class="ig-color-dot ${c === currentColor ? 'active' : ''}" data-color="${c}" style="background:${c}"></div>`).join('')}
        </div>
      </div>

      <!-- INSTAGRAM STICKER DRAWER SHEET -->
      <div id="igStickerSheet" class="ig-sticker-sheet hidden">
        <div class="ig-sheet-handle"></div>
        <div class="ig-sheet-head">
          <span>Stickers &amp; Widgets</span>
          <button type="button" class="icon-btn" id="igCloseStickerSheetBtn">${icon('close')}</button>
        </div>
        <div class="ig-sheet-content">
          <div>
            <small class="muted xs" style="display:block;margin-bottom:8px;font-weight:700">WIDGETS &amp; MENTIONS</small>
            <div class="ig-widgets-grid">
              <div class="ig-widget-card" data-widget="mention" style="background:rgba(255,59,48,0.18);border-color:rgba(255,59,48,0.4)">@ MENTION 👤</div>
              <div class="ig-widget-card" data-widget="location" style="background:rgba(0,199,190,0.18);border-color:rgba(0,199,190,0.4)">LOCATION 📍</div>
              <div class="ig-widget-card" data-widget="time">🕒 ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div class="ig-widget-card" data-widget="date">📅 ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
              <div class="ig-widget-card" data-widget="badge" data-val="ZOVIO ⚡">ZOVIO ⚡</div>
              <div class="ig-widget-card" data-widget="badge" data-val="MOOD ✨">MOOD ✨</div>
            </div>
          </div>
          <div>
            <small class="muted xs" style="display:block;margin-bottom:8px;font-weight:700">POPULAR EMOJIS</small>
            <div class="ig-emojis-grid">
              ${['🔥', '✨', '❤️', '😍', '🚀', '💯', '👑', '🎉', '😎', '💡', '⚡', '🍕', '☕', '🌟', '🌈', '🥳', '🏆', '💎', '🍿', '🎧', '🎮', '🦋', '🥑', '🌺', '☀️', '🌸', '🎂', '🎈', '🍾', '🥂'].map(e => `<button type="button" class="ig-emoji-tile" data-emoji="${e}">${e}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- LOCATION PICKER SHEET -->
      <div id="igLocationSheet" class="ig-location-sheet hidden">
        <div class="ig-sheet-handle"></div>
        <div class="ig-sheet-head">
          <div class="row gap-xs align-center">
            <span>📍</span>
            <span>Add Location</span>
          </div>
          <button type="button" class="icon-btn" id="igCloseLocSheetBtn">${icon('close')}</button>
        </div>
        <div class="ig-sheet-body">
          <button type="button" class="btn primary sm full" id="igGpsLocBtn" style="gap:8px;margin-bottom:12px;font-weight:700">
            <span>📍 Use Current GPS Location</span>
          </button>
          <div class="row gap-xs" style="margin-bottom:12px">
            <input id="igLocInput" placeholder="Enter city, place, or venue…" style="flex:1;height:38px;padding:0 12px;border-radius:10px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.2)">
            <button type="button" class="btn primary sm" id="igLocDoneBtn">Set</button>
          </div>
          <small class="muted xs" style="display:block;margin-bottom:8px;font-weight:700">POPULAR PRESETS</small>
          <div class="ig-loc-preset-grid">
            <button type="button" class="ig-loc-chip" data-loc="Bengaluru, India">📍 Bengaluru</button>
            <button type="button" class="ig-loc-chip" data-loc="Mumbai, India">📍 Mumbai</button>
            <button type="button" class="ig-loc-chip" data-loc="Delhi, India">📍 Delhi</button>
            <button type="button" class="ig-loc-chip" data-loc="New York, USA">📍 New York</button>
            <button type="button" class="ig-loc-chip" data-loc="London, UK">📍 London</button>
            <button type="button" class="ig-loc-chip" data-loc="Tokyo, Japan">📍 Tokyo</button>
            <button type="button" class="ig-loc-chip" data-loc="Paris, France">📍 Paris</button>
            <button type="button" class="ig-loc-chip" data-loc="Gym 💪">Gym 💪</button>
            <button type="button" class="ig-loc-chip" data-loc="Coffee Shop ☕">Coffee Shop ☕</button>
            <button type="button" class="ig-loc-chip" data-loc="Home 🏠">Home 🏠</button>
            <button type="button" class="ig-loc-chip" data-loc="At Work 💻">At Work 💻</button>
          </div>
        </div>
      </div>

      <!-- MENTION PICKER SHEET -->
      <div id="igMentionSheet" class="ig-mention-sheet hidden">
        <div class="ig-sheet-handle"></div>
        <div class="ig-sheet-head">
          <div class="row gap-xs align-center">
            <span style="font-weight:900;color:#ff3b30">@</span>
            <span>Mention Someone</span>
          </div>
          <button type="button" class="icon-btn" id="igCloseMentionSheetBtn">${icon('close')}</button>
        </div>
        <div class="ig-sheet-body">
          <div class="row gap-xs" style="margin-bottom:12px">
            <div style="position:relative;flex:1">
              <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;color:#ff3b30">@</span>
              <input id="igMentionInput" placeholder="Type username or name…" style="width:100%;height:38px;padding-left:26px;border-radius:10px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.2)">
            </div>
            <button type="button" class="btn primary sm" id="igMentionDoneBtn">Mention</button>
          </div>
          <small class="muted xs" style="display:block;margin-bottom:8px;font-weight:700">SELECT CONTACT OR FRIEND</small>
          <div class="ig-mention-user-list" id="igMentionUserList"></div>
        </div>
      </div>

      <!-- IN-STUDIO PRIVACY BOTTOM SHEET -->
      <div id="igPrivacySheet" class="ig-privacy-sheet hidden">
        <div class="ig-sheet-handle"></div>
        <div class="ig-sheet-head">
          <div class="row gap-xs align-center">
            ${icon('lock')}
            <span style="font-weight:800">Who can see your ZovioStatus?</span>
          </div>
          <button type="button" class="icon-btn" id="igClosePrivSheetBtn">${icon('close')}</button>
        </div>
        <div class="ig-sheet-body" id="igPrivSheetBody"></div>
      </div>
    </div>
  `;

  document.body.appendChild(studio);
  hydrateIcons(studio);

  const stage = $('#studioStage', studio);
  const overlayLayer = $('#studioOverlayLayer', studio);
  const trashBin = $('#igTrashBin', studio);
  const shutterBar = $('#igCameraShutterBar', studio);
  const bottomBar = $('#igStoryBottomBar', studio);
  const locationSheet = $('#igLocationSheet', studio);
  const privacySheet = $('#igPrivacySheet', studio);
  const mentionSheet = $('#igMentionSheet', studio);

  let isStudioOpen = true;
  let camRequestId = 0;

  const stopCam = () => {
    camRequestId++;
    if (camStream) {
      try { camStream.getTracks().forEach(t => t.stop()); } catch {}
      camStream = null;
    }
    if (window._activeStudioStream) {
      try { window._activeStudioStream.getTracks().forEach(t => t.stop()); } catch {}
      window._activeStudioStream = null;
    }
    const v = $('#studioCamVideo', studio);
    if (v) {
      try { v.pause(); } catch {}
      v.srcObject = null;
    }
  };

  const ro = new ResizeObserver(() => {
    const sRect = stage.getBoundingClientRect();
    const sw = sRect.width || stage.clientWidth || 380;
    const sh = sRect.height || stage.clientHeight || 660;
    if (!sw || !sh) return;
    $$('.studio-movable-el', overlayLayer).forEach(m => {
      const el = elements.find(x => x.id === m.dataset.id);
      if (el) {
        const px = (el.x / 100) * sw;
        const py = (el.y / 100) * sh;
        m.style.left = '0px';
        m.style.top = '0px';
        m.style.transform = `translate3d(${px}px, ${py}px, 0px) translate(-50%, -50%)`;
      }
    });
  });
  ro.observe(stage);

  const closeStudio = () => {
    isStudioOpen = false;
    stopCam();
    try { ro.disconnect(); } catch {}
    document.removeEventListener('keydown', handleStudioKey);
    studio.remove();
  };

  const handleStudioKey = e => {
    if (e.key === 'Escape') {
      if ($('#modalRoot .modal-back')) return;
      closeStudio();
    }
  };
  document.addEventListener('keydown', handleStudioKey);

  $('#igCloseStudioBtn', studio).onclick = closeStudio;

  // Camera Management
  const startCamera = async () => {
    stopCam();
    const currentReq = ++camRequestId;
    bgType = 'camera';
    try {
      const constraints = {
        video: {
          facingMode
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Guard: if user closed the studio or switched modes or toggled again while waiting for hardware
      if (!isStudioOpen || currentReq !== camRequestId || bgType !== 'camera' || !document.body.contains(studio)) {
        try { stream.getTracks().forEach(t => t.stop()); } catch {}
        return;
      }

      camStream = stream;
      window._activeStudioStream = stream;
      const v = $('#studioCamVideo', studio);
      if (v) {
        v.srcObject = camStream;
        v.play().catch(() => {});
        v.classList.remove('hidden');
        $('#studioPhotoImg', studio).classList.add('hidden');
        shutterBar.classList.remove('hidden');
        bottomBar.classList.add('hidden');
        $('#igSlidesStrip', studio)?.classList.add('hidden');
      }
    } catch (err) {
      if (!isStudioOpen || currentReq !== camRequestId) return;
      console.warn('Camera error:', err);
      toast('Camera unavailable - switched to gradient', 'err');
      switchToGradient();
    }
  };

  const switchToGradient = () => {
    stopCam();
    mediaData = '';
    bgType = 'gradient';
    const v = $('#studioCamVideo', studio);
    if (v) {
      v.classList.add('hidden');
      v.srcObject = null;
    }
    $('#studioPhotoImg', studio).classList.add('hidden');
    shutterBar.classList.add('hidden');
    bottomBar.classList.remove('hidden');
    $('#igSlidesStrip', studio)?.classList.remove('hidden');
    stage.style.background = pickedBg;
  };

  // Flip camera
  $('#igFlipCamBtn', studio).onclick = () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    isMirrored = facingMode === 'user';
    $('#studioCamVideo', studio).classList.toggle('mirror', isMirrored);
    startCamera();
  };

  const drawCanvas = $('#studioDrawCanvas', studio);
  const drawCtx = drawCanvas ? drawCanvas.getContext('2d') : null;
  const slidesStrip = $('#igSlidesStrip', studio);

  const renderDrawCanvas = () => {
    if (!drawCtx || !drawCanvas) return;
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    const allPaths = activeDrawingPath ? [...drawPaths, activeDrawingPath] : drawPaths;
    allPaths.forEach(p => {
      if (!p.pts || p.pts.length < 2) return;
      drawCtx.save();
      drawCtx.strokeStyle = p.color || '#ff3b30';
      drawCtx.lineWidth = p.size || 6;
      drawCtx.lineCap = 'round';
      drawCtx.lineJoin = 'round';
      drawCtx.beginPath();
      drawCtx.moveTo(p.pts[0].x * drawCanvas.width, p.pts[0].y * drawCanvas.height);
      for (let i = 1; i < p.pts.length; i++) {
        drawCtx.lineTo(p.pts[i].x * drawCanvas.width, p.pts[i].y * drawCanvas.height);
      }
      drawCtx.stroke();
      drawCtx.restore();
    });
  };

  const applyFilterCSS = (filterId) => {
    const fObj = photoFilters.find(f => f.id === filterId) || photoFilters[0];
    const img = $('#studioPhotoImg', studio);
    const vid = $('#studioCamVideo', studio);
    if (img) img.style.filter = fObj.css;
    if (vid) vid.style.filter = fObj.css;
  };

  const saveCurrentSlideState = () => {
    if (!slides[activeSlideIdx]) return;
    slides[activeSlideIdx].bgType = bgType === 'camera' ? (mediaData ? 'photo' : 'gradient') : bgType;
    slides[activeSlideIdx].pickedBg = pickedBg;
    slides[activeSlideIdx].mediaData = mediaData;
    slides[activeSlideIdx].filter = currentFilter;
    slides[activeSlideIdx].elements = JSON.parse(JSON.stringify(elements));
    slides[activeSlideIdx].drawPaths = JSON.parse(JSON.stringify(drawPaths));
  };

  const renderSlidesStrip = () => {
    if (!slidesStrip) return;
    slidesStrip.classList.toggle('hidden', bgType === 'camera');
    const lbl = $('#igPostShareLabel', studio);
    if (lbl) lbl.textContent = slides.length > 1 ? `Share ${slides.length} Stories` : 'Share Story';

    slidesStrip.innerHTML = slides.map((s, idx) => {
      const isAct = idx === activeSlideIdx;
      const thumbStyle = (s.bgType === 'photo' && s.mediaData)
        ? `background-image:url('${s.mediaData}');background-size:cover;background-position:center;`
        : `background:${s.pickedBg || igGradients[0]};`;
      const countBadge = (s.elements?.length || 0) + (s.drawPaths?.length ? 1 : 0);
      return `
        <div class="ig-slide-thumb ${isAct ? 'active' : ''}" data-sidx="${idx}" style="${thumbStyle}" title="Slide ${idx + 1}">
          <span class="ig-slide-num">${idx + 1}</span>
          ${countBadge ? `<span class="ig-slide-layers-dot">✦</span>` : ''}
          ${slides.length > 1 ? `<button type="button" class="ig-slide-del-btn" data-delidx="${idx}" title="Remove Slide">✕</button>` : ''}
        </div>
      `;
    }).join('') + `
      <button type="button" class="ig-slide-add-btn" id="igAddSlidePhotoBtn" title="Add more pictures or slides to your Status">
        <span>＋</span>
        <small>Add Pic</small>
      </button>
    `;

    $$('.ig-slide-thumb', slidesStrip).forEach(thumb => {
      thumb.onclick = e => {
        if (e.target.closest('.ig-slide-del-btn')) return;
        const idx = Number(thumb.dataset.sidx);
        if (idx === activeSlideIdx) return;
        switchToSlide(idx);
      };
    });

    $$('.ig-slide-del-btn', slidesStrip).forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const idx = Number(btn.dataset.delidx);
        if (slides.length <= 1) return;
        saveCurrentSlideState();
        slides.splice(idx, 1);
        if (activeSlideIdx >= slides.length) activeSlideIdx = slides.length - 1;
        loadSlideState(activeSlideIdx);
      };
    });

    const addBtn = $('#igAddSlidePhotoBtn', slidesStrip);
    if (addBtn) {
      addBtn.onclick = () => {
        saveCurrentSlideState();
        studio._appendNewSlidesOnPick = true;
        $('#igFileIn', studio).click();
      };
    }
  };

  const loadSlideState = (idx) => {
    const s = slides[idx];
    if (!s) return;
    activeSlideIdx = idx;
    stopCam();
    bgType = s.bgType || 'gradient';
    pickedBg = s.pickedBg || igGradients[0];
    mediaData = s.mediaData || '';
    currentFilter = s.filter || 'none';
    filterIdx = Math.max(0, photoFilters.findIndex(f => f.id === currentFilter));
    elements = JSON.parse(JSON.stringify(s.elements || []));
    drawPaths = JSON.parse(JSON.stringify(s.drawPaths || []));
    selectedElId = null;

    const v = $('#studioCamVideo', studio);
    const img = $('#studioPhotoImg', studio);
    if (v) v.classList.add('hidden');
    shutterBar.classList.add('hidden');
    bottomBar.classList.remove('hidden');

    if (bgType === 'photo' && mediaData) {
      img.src = mediaData;
      img.classList.remove('hidden');
    } else {
      img.classList.add('hidden');
      stage.style.background = pickedBg;
    }
    applyFilterCSS(currentFilter);
    renderDrawCanvas();
    updateOverlayDOM();
    renderSlidesStrip();
  };

  const switchToSlide = (idx) => {
    saveCurrentSlideState();
    loadSlideState(idx);
  };

  // Capture Photo
  $('#igSnapShutterBtn', studio).onclick = () => {
    SoundFX.play('shutter');
    const v = $('#studioCamVideo', studio);
    const c = document.createElement('canvas');
    c.width = v.videoWidth || 1080;
    c.height = v.videoHeight || 1920;
    const ctx = c.getContext('2d');
    if (isMirrored) {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, c.width, c.height);
    mediaData = c.toDataURL('image/jpeg', 0.92);
    stopCam();
    v.classList.add('hidden');
    shutterBar.classList.add('hidden');
    bottomBar.classList.remove('hidden');
    const img = $('#studioPhotoImg', studio);
    img.src = mediaData;
    img.classList.remove('hidden');
    bgType = 'photo';
    saveCurrentSlideState();
    renderSlidesStrip();
  };

  // Gallery Picker (Supports selecting multiple pictures at once!)
  $('#igUploadPhotoBtn', studio).onclick = () => {
    stopCam();
    studio._appendNewSlidesOnPick = false;
    $('#igFileIn', studio).click();
  };
  $('#igCamGalleryBtn', studio).onclick = () => {
    stopCam();
    studio._appendNewSlidesOnPick = false;
    $('#igFileIn', studio).click();
  };
  $('#igFileIn', studio).onchange = async e => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = '';
    if (!fileList.length) return;
    stopCam();
    saveCurrentSlideState();

    const dataUrls = [];
    for (const f of fileList.slice(0, 10)) {
      try {
        const dUrl = await fileToDataURL(f, 1920, 0.92);
        if (dUrl) dataUrls.push(dUrl);
      } catch {}
    }
    if (!dataUrls.length) return;

    const appendMode = Boolean(studio._appendNewSlidesOnPick);
    studio._appendNewSlidesOnPick = false;

    if (!appendMode && (!slides[activeSlideIdx].mediaData && slides[activeSlideIdx].elements.length === 0)) {
      // Populate current empty slide with first image, then append any remaining images as new slides
      slides[activeSlideIdx].bgType = 'photo';
      slides[activeSlideIdx].mediaData = dataUrls[0];
      for (let i = 1; i < dataUrls.length; i++) {
        slides.push({
          id: 'slide_' + Date.now() + '_' + i,
          bgType: 'photo',
          pickedBg: igGradients[i % igGradients.length],
          mediaData: dataUrls[i],
          filter: 'none',
          elements: [],
          drawPaths: []
        });
      }
      loadSlideState(activeSlideIdx);
    } else if (!appendMode && dataUrls.length === 1) {
      // Replace current slide background with selected photo
      slides[activeSlideIdx].bgType = 'photo';
      slides[activeSlideIdx].mediaData = dataUrls[0];
      loadSlideState(activeSlideIdx);
    } else {
      // Append all selected photos as new slides and switch to the first newly added slide
      const firstNewIdx = slides.length;
      dataUrls.forEach((dUrl, i) => {
        slides.push({
          id: 'slide_' + Date.now() + '_' + i,
          bgType: 'photo',
          pickedBg: igGradients[(slides.length + i) % igGradients.length],
          mediaData: dUrl,
          filter: 'none',
          elements: [],
          drawPaths: []
        });
      });
      loadSlideState(firstNewIdx);
    }
    if (dataUrls.length > 1) {
      toast(`Added ${dataUrls.length} pictures to your story queue! 📸`);
    }
  };

  // Floating Overlay Picture Layer (Add picture(s) directly onto the current slide!)
  $('#igOverlayPhotoBtn', studio).onclick = () => {
    $('#igOverlayPhotoIn', studio).click();
  };
  $('#igOverlayPhotoIn', studio).onchange = async e => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    for (let i = 0; i < files.length; i++) {
      const dUrl = await fileToDataURL(files[i], 1280, 0.90);
      const newId = 'pic_' + Date.now() + '_' + i;
      elements.push({
        id: newId,
        type: 'photo',
        src: dUrl,
        x: Math.min(75, 45 + i * 8),
        y: Math.min(75, 45 + i * 8),
        size: 38 // percentage width of stage
      });
      selectedElId = newId;
    }
    saveCurrentSlideState();
    updateOverlayDOM();
    renderSlidesStrip();
    toast('Picture sticker added — drag or scroll to resize! 🖼️');
  };

  // Photo Filters Button
  $('#igFilterBtn', studio).onclick = () => {
    filterIdx = (filterIdx + 1) % photoFilters.length;
    currentFilter = photoFilters[filterIdx].id;
    applyFilterCSS(currentFilter);
    saveCurrentSlideState();
    const badge = $('#igFilterBadge', studio);
    if (badge) {
      badge.textContent = `✨ Filter: ${photoFilters[filterIdx].name}`;
      badge.classList.remove('hidden');
      clearTimeout(studio._filterToastTimer);
      studio._filterToastTimer = setTimeout(() => badge.classList.add('hidden'), 1400);
    }
  };

  // Freehand Brush / Draw Mode
  const setDrawMode = (active) => {
    isDrawMode = active;
    if (drawCanvas) drawCanvas.classList.toggle('drawing-active', active);
    $('#igDrawToolbar', studio)?.classList.toggle('hidden', !active);
    $('#igStoryTopBar', studio)?.classList.toggle('hidden', active);
  };
  if ($('#igDrawModeBtn', studio)) $('#igDrawModeBtn', studio).onclick = () => setDrawMode(true);
  if ($('#igDrawDoneBtn', studio)) {
    $('#igDrawDoneBtn', studio).onclick = () => {
      setDrawMode(false);
      saveCurrentSlideState();
      renderSlidesStrip();
    };
  }
  if ($('#igDrawUndoBtn', studio)) {
    $('#igDrawUndoBtn', studio).onclick = () => {
      drawPaths.pop();
      renderDrawCanvas();
    };
  }
  if ($('#igDrawClearBtn', studio)) {
    $('#igDrawClearBtn', studio).onclick = () => {
      drawPaths = [];
      renderDrawCanvas();
    };
  }
  if ($('#igDrawSizeRange', studio)) {
    $('#igDrawSizeRange', studio).oninput = e => {
      drawBrushSize = Number(e.target.value) || 6;
    };
  }
  $$('#igDrawColors .ig-color-dot', studio).forEach(dot => {
    dot.onclick = () => {
      drawColor = dot.dataset.dcolor || '#ff3b30';
      $$('#igDrawColors .ig-color-dot', studio).forEach(d => d.classList.toggle('active', d === dot));
    };
  });

  if (drawCanvas) {
    drawCanvas.onpointerdown = e => {
      if (!isDrawMode) return;
      e.preventDefault();
      e.stopPropagation();
      try { drawCanvas.setPointerCapture(e.pointerId); } catch {}
      const rect = drawCanvas.getBoundingClientRect();
      activeDrawingPath = {
        color: drawColor,
        size: drawBrushSize,
        pts: [{ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }]
      };
      renderDrawCanvas();
    };
    drawCanvas.onpointermove = e => {
      if (!isDrawMode || !activeDrawingPath) return;
      e.preventDefault();
      const rect = drawCanvas.getBoundingClientRect();
      activeDrawingPath.pts.push({
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      });
      renderDrawCanvas();
    };
    drawCanvas.onpointerup = e => {
      if (!activeDrawingPath) return;
      try { drawCanvas.releasePointerCapture(e.pointerId); } catch {}
      if (activeDrawingPath.pts.length > 1) {
        drawPaths.push(activeDrawingPath);
      }
      activeDrawingPath = null;
      renderDrawCanvas();
    };
  }

  // Toggle Live Camera
  $('#igCamToggleBtn', studio).onclick = () => {
    if (bgType === 'camera') switchToGradient();
    else startCamera();
  };

  // Cycle Instagram Gradient
  $('#igGradientBtn', studio).onclick = () => {
    gradIdx = (gradIdx + 1) % igGradients.length;
    pickedBg = igGradients[gradIdx];
    switchToGradient();
    saveCurrentSlideState();
    renderSlidesStrip();
  };

  // ---------------- Dragging & Elements ----------------
  const clampElement = (el, dom, stageRect) => {
    // Keep elements safely inside stage borders without aggressive bouncing
    const minX = 8;
    const maxX = 92;
    const minY = 10;
    const maxY = 90;
    el.x = Math.max(minX, Math.min(maxX, el.x));
    el.y = Math.max(minY, Math.min(maxY, el.y));
    if (dom) {
      const sw = (stageRect && stageRect.width) || stage.clientWidth || 380;
      const sh = (stageRect && stageRect.height) || stage.clientHeight || 660;
      const px = (el.x / 100) * sw;
      const py = (el.y / 100) * sh;
      dom.style.left = '0px';
      dom.style.top = '0px';
      dom.style.transform = `translate3d(${px}px, ${py}px, 0px) translate(-50%, -50%)`;
    }
  };

  const updateOverlayDOM = () => {
    overlayLayer.innerHTML = '';
    const stageRect = stage.getBoundingClientRect();
    const stageW = stageRect.width || stage.clientWidth || 380;
    const stageH = stageRect.height || stage.clientHeight || 660;

    elements.forEach(el => {
      const dom = document.createElement('div');
      dom.className = `studio-movable-el ${el.id === selectedElId ? 'selected' : ''}`;
      dom.dataset.id = el.id;
      dom.style.left = '0px';
      dom.style.top = '0px';
      const px = (el.x / 100) * stageW;
      const py = (el.y / 100) * stageH;
      dom.style.transform = `translate3d(${px}px, ${py}px, 0px) translate(-50%, -50%)`;

      if (el.type === 'text') {
        const fontObj = fonts.find(f => f.id === el.font) || fonts[0];
        const content = document.createElement('div');
        content.className = `studio-text-content st-text-${el.style || 'badge'}`;
        content.style.fontFamily = fontObj.family;
        content.style.fontWeight = fontObj.weight;
        content.style.fontSize = `${el.size || 28}px`;
        content.style.textAlign = el.align || 'center';
        content.textContent = el.text || 'Tap to edit';

        if (el.style === 'solid') {
          content.style.background = el.color || '#ffffff';
          content.style.color = isLightHex(el.color || '#ffffff') ? '#000000' : '#ffffff';
          content.style.textShadow = 'none';
        } else if (el.style === 'badge') {
          content.style.background = 'rgba(12, 14, 24, 0.78)';
          content.style.color = el.color || '#ffffff';
          content.style.textShadow = 'none';
        } else if (el.style === 'glow') {
          content.style.background = 'transparent';
          content.style.color = el.color || '#ffffff';
          content.style.textShadow = `0 0 14px ${el.color || '#ffffff'}, 0 0 28px ${el.color || '#ffffff'}`;
        } else {
          content.style.background = 'transparent';
          content.style.color = el.color || '#ffffff';
          content.style.textShadow = '0 2px 8px rgba(0, 0, 0, 0.85)';
        }

        dom.appendChild(content);

        dom.ondblclick = e => {
          e.stopPropagation();
          openTextEditor(el);
        };
      } else if (el.type === 'mention') {
        const content = document.createElement('div');
        content.className = 'studio-mention-badge';
        content.style.fontSize = `${el.size || 24}px`;
        const handle = String(el.val || '@user').replace(/^@/, '');
        content.innerHTML = `<span class="ig-men-at">@</span><span class="ig-men-name">${esc(handle)}</span>`;
        dom.appendChild(content);

        dom.ondblclick = e => {
          e.stopPropagation();
          openMentionPicker(el);
        };
      } else if (el.type === 'location') {
        const content = document.createElement('div');
        content.className = 'studio-location-badge';
        content.style.fontSize = `${el.size || 22}px`;
        content.innerHTML = `<span class="ig-loc-icon">📍</span><span class="ig-loc-name">${esc(el.val || 'Location')}</span>`;
        dom.appendChild(content);

        dom.ondblclick = e => {
          e.stopPropagation();
          openLocationPicker(el);
        };
      } else if (el.type === 'photo') {
        const content = document.createElement('div');
        content.className = 'studio-photo-sticker';
        const wPct = Math.max(18, Math.min(82, el.size || 38));
        content.style.width = `${Math.round((stageRect.width || 360) * (wPct / 100))}px`;
        content.innerHTML = `<img src="${el.src}" alt="" draggable="false" style="width:100%;height:auto;display:block;border-radius:14px;border:2.5px solid rgba(255,255,255,0.85);box-shadow:0 12px 32px rgba(0,0,0,0.55)">`;
        dom.appendChild(content);
      } else if (el.type === 'widget' || (el.type === 'sticker' && el.val && el.val.length > 2)) {
        const content = document.createElement('div');
        content.className = 'studio-widget-badge';
        content.style.fontSize = `${el.size || 22}px`;
        content.textContent = el.val;
        dom.appendChild(content);
      } else {
        const content = document.createElement('div');
        content.className = 'studio-sticker-content';
        content.style.fontSize = `${el.size || 48}px`;
        content.textContent = el.val;
        dom.appendChild(content);
      }

      // Mouse wheel to resize any selected element
      dom.onwheel = e => {
        e.preventDefault();
        e.stopPropagation();
        selectedElId = el.id;
        const delta = e.deltaY < 0 ? 2 : -2;
        el.size = Math.max(14, Math.min(84, (el.size || (el.type === 'sticker' ? 48 : 26)) + delta));
        updateOverlayDOM();
      };

      // Selected element floating toolbar (Size controls, Edit, Delete)
      if (el.id === selectedElId) {
        const toolbar = document.createElement('div');
        toolbar.className = 'studio-el-toolbar';

        const decBtn = document.createElement('button');
        decBtn.type = 'button';
        decBtn.className = 'studio-el-tool-btn';
        decBtn.title = 'Decrease Size (or mouse wheel down)';
        decBtn.textContent = '➖';
        decBtn.onclick = e => {
          e.stopPropagation();
          el.size = Math.max(14, (el.size || 26) - 3);
          updateOverlayDOM();
        };

        const sizeLbl = document.createElement('span');
        sizeLbl.className = 'studio-el-size-label';
        sizeLbl.textContent = `${el.size || 26}`;

        const incBtn = document.createElement('button');
        incBtn.type = 'button';
        incBtn.className = 'studio-el-tool-btn';
        incBtn.title = 'Increase Size (or mouse wheel up)';
        incBtn.textContent = '➕';
        incBtn.onclick = e => {
          e.stopPropagation();
          el.size = Math.min(84, (el.size || 26) + 3);
          updateOverlayDOM();
        };

        toolbar.appendChild(decBtn);
        toolbar.appendChild(sizeLbl);
        toolbar.appendChild(incBtn);

        if (el.type === 'text' || el.type === 'mention' || el.type === 'location') {
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'studio-el-tool-btn';
          editBtn.title = 'Edit Item';
          editBtn.textContent = '✎';
          editBtn.onclick = e => {
            e.stopPropagation();
            if (el.type === 'text') openTextEditor(el);
            else if (el.type === 'mention') openMentionPicker(el);
            else if (el.type === 'location') openLocationPicker(el);
          };
          toolbar.appendChild(editBtn);
        }

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'studio-el-tool-btn del';
        delBtn.title = 'Remove';
        delBtn.textContent = '✕';
        delBtn.onclick = e => {
          e.stopPropagation();
          deleteElement(el.id);
        };
        toolbar.appendChild(delBtn);

        dom.appendChild(toolbar);
      }

      bindElementDrag(dom, el);
      overlayLayer.appendChild(dom);

      // Clamp newly positioned / resized element within safe stage bounds
      clampElement(el, dom, stageRect);
    });
  };

  const deleteElement = id => {
    elements = elements.filter(x => x.id !== id);
    if (selectedElId === id) selectedElId = null;
    updateOverlayDOM();
  };

  const bindElementDrag = (dom, el) => {
    dom.onpointerdown = e => {
      if (e.target.closest('.studio-el-toolbar, .studio-el-tool-btn')) return;
      e.stopPropagation();
      e.preventDefault();

      selectedElId = el.id;
      $$('.studio-movable-el', overlayLayer).forEach(m => m.classList.toggle('selected', m.dataset.id === el.id));

      try { dom.setPointerCapture(e.pointerId); } catch {}

      const stageRect = stage.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const initX = el.x;
      const initY = el.y;
      const domW = dom.offsetWidth || 80;
      const domH = dom.offsetHeight || 38;

      trashBin.classList.remove('hidden');

      dom.onpointermove = ev => {
        ev.preventDefault();
        const stageW = stageRect.width || stage.clientWidth || 380;
        const stageH = stageRect.height || stage.clientHeight || 660;

        // Flexible screen boundaries: allow placing text/stickers freely anywhere across the canvas
        const minX = 8;
        const maxX = 92;
        const minY = 10;
        const maxY = 90;

        const targetX = initX + ((ev.clientX - startX) / stageW) * 100;
        const targetY = initY + ((ev.clientY - startY) / stageH) * 100;

        el.x = Math.max(minX, Math.min(maxX, targetX));
        el.y = Math.max(minY, Math.min(maxY, targetY));
        const curPx = (el.x / 100) * stageW;
        const curPy = (el.y / 100) * stageH;
        dom.style.left = '0px';
        dom.style.top = '0px';
        dom.style.transform = `translate3d(${curPx}px, ${curPy}px, 0px) translate(-50%, -50%)`;

        // Check distance to trash bin
        const trashRect = trashBin.getBoundingClientRect();
        const dist = Math.hypot(ev.clientX - (trashRect.left + trashRect.width / 2), ev.clientY - (trashRect.top + trashRect.height / 2));
        if (dist < 55) {
          trashBin.classList.add('hovered');
        } else {
          trashBin.classList.remove('hovered');
        }
      };

      dom.onpointerup = ev => {
        try { dom.releasePointerCapture(e.pointerId); } catch {}
        dom.onpointermove = null;
        dom.onpointerup = null;

        const isTrashHovered = trashBin.classList.contains('hovered');
        trashBin.classList.remove('hovered');
        trashBin.classList.add('hidden');

        if (isTrashHovered) {
          deleteElement(el.id);
          toast('Item removed', 'info');
        } else {
          updateOverlayDOM();
        }
      };
    };
  };

  stage.onpointerdown = e => {
    if (e.target === stage || e.target.id === 'studioCamVideo' || e.target.id === 'studioPhotoImg') {
      selectedElId = null;
      updateOverlayDOM();
    }
  };

  // ---------------- Instagram Text Mode ----------------
  const openTextEditor = (existingEl = null) => {
    editingElId = existingEl ? existingEl.id : null;
    const textOverlay = $('#igTextEditorOverlay', studio);
    const textarea = $('#igStoryTextarea', studio);

    if (existingEl) {
      currentFont = existingEl.font || 'modern';
      currentStyle = existingEl.style || 'badge';
      currentAlign = existingEl.align || 'center';
      currentColor = existingEl.color || '#ffffff';
      currentSize = existingEl.size || 28;
      textarea.value = existingEl.text || '';
    } else {
      textarea.value = '';
    }

    applyTextareaStyles();
    textOverlay.classList.remove('hidden');
    setTimeout(() => { textarea.focus(); }, 40);
  };

  const autoFitTextarea = () => {
    const textarea = $('#igStoryTextarea', studio);
    if (!textarea) return;
    const val = textarea.value || '';
    const lines = val.split('\n');

    // Instagram-style dynamic auto-scaling font size based on text length:
    let targetSize = currentSize;
    if (val.length > 200) targetSize = Math.min(targetSize, 18);
    else if (val.length > 120) targetSize = Math.min(targetSize, 22);
    else if (val.length > 60) targetSize = Math.min(targetSize, 26);
    textarea.style.fontSize = `${targetSize}px`;

    // Measure exact max line width so textarea badge hugs text tightly!
    const fontObj = fonts.find(f => f.id === currentFont) || fonts[0];
    const canvasMeasurer = document.createElement('canvas').getContext('2d');
    canvasMeasurer.font = `${fontObj.weight || '800'} ${targetSize}px ${fontObj.family}`;
    let maxLineW = 60;
    lines.forEach(l => {
      const w = canvasMeasurer.measureText(l || '').width;
      if (w > maxLineW) maxLineW = w;
    });

    const stageRect = stage.getBoundingClientRect();
    const maxAllowedWidth = Math.min(340, (stageRect.width || stage.clientWidth || 380) - 48);
    const fittedWidth = Math.min(maxAllowedWidth, Math.max(80, Math.ceil(maxLineW) + 40));

    textarea.style.width = `${fittedWidth}px`;
    textarea.style.marginLeft = 'auto';
    textarea.style.marginRight = 'auto';
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(50, textarea.scrollHeight)}px`;
  };

  const applyTextareaStyles = () => {
    const textarea = $('#igStoryTextarea', studio);
    if (!textarea) return;
    const fontObj = fonts.find(f => f.id === currentFont) || fonts[0];
    textarea.style.fontFamily = fontObj.family;
    textarea.style.fontWeight = fontObj.weight;
    textarea.style.textAlign = currentAlign;
    textarea.style.fontSize = `${currentSize}px`;

    textarea.className = `ig-story-textarea st-text-${currentStyle}`;
    if (currentStyle === 'solid') {
      textarea.style.background = currentColor;
      textarea.style.color = isLightHex(currentColor) ? '#000000' : '#ffffff';
      textarea.style.textShadow = 'none';
      textarea.style.padding = '10px 18px';
      textarea.style.borderRadius = '14px';
    } else if (currentStyle === 'badge') {
      textarea.style.background = 'rgba(12, 14, 24, 0.82)';
      textarea.style.color = currentColor;
      textarea.style.textShadow = 'none';
      textarea.style.padding = '10px 18px';
      textarea.style.borderRadius = '14px';
    } else if (currentStyle === 'glow') {
      textarea.style.background = 'transparent';
      textarea.style.color = currentColor;
      textarea.style.textShadow = `0 0 14px ${currentColor}, 0 0 28px ${currentColor}`;
      textarea.style.padding = '6px';
      textarea.style.borderRadius = '0';
    } else {
      textarea.style.background = 'transparent';
      textarea.style.color = currentColor;
      textarea.style.textShadow = '0 2px 8px rgba(0, 0, 0, 0.85)';
      textarea.style.padding = '6px';
      textarea.style.borderRadius = '0';
    }

    const styleBtn = $('#igTextStyleBtn', studio);
    if (styleBtn) {
      const styleIcons = { badge: '[Aa] Badge', solid: '[■] Solid', glow: '[✨] Glow', none: '[A] Plain' };
      styleBtn.textContent = styleIcons[currentStyle] || '[Aa]';
      styleBtn.title = `Style: ${currentStyle}`;
    }

    $$('#igFontCarousel .ig-font-pill', studio).forEach(p => p.classList.toggle('active', p.dataset.font === currentFont));
    $$('#igColorSwatches .ig-color-dot', studio).forEach(d => d.classList.toggle('active', d.dataset.color === currentColor));
    const slider = $('#igFontSizeSlider', studio);
    const lbl = $('#igFontSizeValue', studio);
    if (slider) slider.value = currentSize;
    if (lbl) lbl.textContent = `${currentSize}px`;

    textarea.oninput = autoFitTextarea;
    autoFitTextarea();
  };

  $('#igTextModeBtn', studio).onclick = () => openTextEditor();

  // Alignment Toggle
  const aligns = ['center', 'left', 'right'];
  $('#igTextAlignBtn', studio).onclick = () => {
    const nextIdx = (aligns.indexOf(currentAlign) + 1) % aligns.length;
    currentAlign = aligns[nextIdx];
    $('#igTextAlignBtn', studio).textContent = currentAlign === 'left' ? '⫷' : currentAlign === 'right' ? '⫸' : '≡';
    applyTextareaStyles();
  };

  // Text Background Style Toggle
  const styles = ['badge', 'none', 'solid', 'glow'];
  $('#igTextStyleBtn', studio).onclick = () => {
    const nextIdx = (styles.indexOf(currentStyle) + 1) % styles.length;
    currentStyle = styles[nextIdx];
    applyTextareaStyles();
  };

  // Font Selection
  $$('#igFontCarousel .ig-font-pill', studio).forEach(p => {
    p.onclick = () => {
      currentFont = p.dataset.font;
      applyTextareaStyles();
    };
  });

  // Color Swatches
  $$('#igColorSwatches .ig-color-dot', studio).forEach(d => {
    d.onclick = () => {
      currentColor = d.dataset.color;
      applyTextareaStyles();
    };
  });

  // Font Size Steppers & Slider
  const updateSizeControls = (size) => {
    currentSize = Math.max(16, Math.min(56, size));
    applyTextareaStyles();
  };
  $('#igFontSizeSlider', studio).oninput = e => updateSizeControls(+e.target.value);
  if ($('#igFontIncBtn', studio)) $('#igFontIncBtn', studio).onclick = () => updateSizeControls(currentSize + 3);
  if ($('#igFontDecBtn', studio)) $('#igFontDecBtn', studio).onclick = () => updateSizeControls(currentSize - 3);

  // Done Editing Text
  $('#igDoneTextBtn', studio).onclick = () => {
    const textOverlay = $('#igTextEditorOverlay', studio);
    const textarea = $('#igStoryTextarea', studio);
    const val = textarea.value.trim();

    if (!val) {
      if (editingElId) deleteElement(editingElId);
      textOverlay.classList.add('hidden');
      return;
    }

    const effectiveSize = parseInt(textarea.style.fontSize, 10) || currentSize;
    if (editingElId) {
      const el = elements.find(x => x.id === editingElId);
      if (el) {
        el.text = val;
        el.font = currentFont;
        el.style = currentStyle;
        el.align = currentAlign;
        el.color = currentColor;
        el.size = effectiveSize;
      }
    } else {
      const newId = 't_' + Date.now();
      elements.push({
        id: newId,
        type: 'text',
        text: val,
        x: 50,
        y: 45,
        font: currentFont,
        style: currentStyle,
        align: currentAlign,
        color: currentColor,
        size: effectiveSize
      });
      selectedElId = newId;
    }

    textOverlay.classList.add('hidden');
    updateOverlayDOM();
  };

  // ---------------- Location Picker ----------------
  let editingLocEl = null;
  const openLocationPicker = (existingEl = null) => {
    editingLocEl = existingEl;
    const input = $('#igLocInput', studio);
    input.value = existingEl ? existingEl.val.replace(/^📍\s*/, '') : '';
    locationSheet.classList.remove('hidden');
    setTimeout(() => input.focus(), 60);
  };

  const applyLocation = (locName) => {
    const clean = String(locName || '').trim().replace(/^📍\s*/, '');
    if (!clean) return;
    if (editingLocEl) {
      editingLocEl.val = clean;
    } else {
      const newId = 'loc_' + Date.now();
      elements.push({
        id: newId,
        type: 'location',
        val: clean,
        x: 50,
        y: 48,
        size: 22
      });
      selectedElId = newId;
    }
    locationSheet.classList.add('hidden');
    updateOverlayDOM();
  };

  $('#igCloseLocSheetBtn', studio).onclick = () => locationSheet.classList.add('hidden');

  $('#igLocDoneBtn', studio).onclick = () => {
    const val = $('#igLocInput', studio).value.trim();
    if (val) applyLocation(val);
  };
  $('#igLocInput', studio).onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = $('#igLocInput', studio).value.trim();
      if (val) applyLocation(val);
    }
  };

  $$('.ig-loc-chip', locationSheet).forEach(chip => {
    chip.onclick = () => applyLocation(chip.dataset.loc);
  });

  $('#igGpsLocBtn', studio).onclick = () => {
    const btn = $('#igGpsLocBtn', studio);
    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> Finding location…`;

    if (!navigator.geolocation) {
      btn.disabled = false;
      btn.innerHTML = origHTML;
      return toast('Geolocation not supported on this browser', 'err');
    }

    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || data.address?.state || 'My Location';
        const country = data.address?.country || '';
        const placeStr = country ? `${city}, ${country}` : city;
        applyLocation(placeStr);
        toast(`Location set: ${placeStr}`);
      } catch (err) {
        applyLocation('Current Location');
      } finally {
        btn.disabled = false;
        btn.innerHTML = origHTML;
      }
    }, err => {
      btn.disabled = false;
      btn.innerHTML = origHTML;
      toast('Could not access GPS. Please type your city name.', 'err');
    }, { timeout: 8000, enableHighAccuracy: true });
  };

  // ---------------- Mention Picker ----------------
  let editingMentionEl = null;
  const openMentionPicker = (existingEl = null) => {
    editingMentionEl = existingEl;
    const input = $('#igMentionInput', studio);
    input.value = existingEl ? existingEl.val.replace(/^@/, '') : '';
    renderMentionUserList('');
    mentionSheet.classList.remove('hidden');
    setTimeout(() => input.focus(), 60);
  };

  const applyMention = (usernameOrHandle, userId = null) => {
    const raw = String(usernameOrHandle || '').trim().replace(/^@/, '');
    if (!raw) return;
    if (userId) {
      const target = S.users.get(userId);
      if (target && target.canMention === false) {
        toast(`@${target.username || target.name} does not allow status mentions.`, 'err');
        return;
      }
    }
    const handle = `@${raw}`;
    if (editingMentionEl) {
      editingMentionEl.val = handle;
      if (userId) editingMentionEl.userId = userId;
    } else {
      const newId = 'men_' + Date.now();
      elements.push({
        id: newId,
        type: 'mention',
        val: handle,
        userId: userId,
        x: 50,
        y: 42,
        size: 24
      });
      selectedElId = newId;
    }
    mentionSheet.classList.add('hidden');
    updateOverlayDOM();
  };

  const renderMentionUserList = (filterText = '') => {
    const listEl = $('#igMentionUserList', studio);
    listEl.innerHTML = '';

    const candidates = [];
    const seen = new Set([S.user.id]);

    (S.user.friends || []).forEach(fid => {
      const u = S.users.get(fid);
      if (u && !seen.has(u.id)) {
        seen.add(u.id);
        candidates.push(u);
      }
    });

    for (const u of S.users.values()) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        candidates.push(u);
      }
    }

    const q = filterText.trim().toLowerCase().replace(/^@/, '');
    const filtered = candidates.filter(u => {
      if (!q) return true;
      return (u.username || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q);
    });

    if (!filtered.length) {
      listEl.innerHTML = `<p class="xs muted" style="padding:10px;text-align:center">Type a username above and press Mention to tag anyone.</p>`;
      return;
    }

    filtered.slice(0, 10).forEach(u => {
      const item = document.createElement('div');
      item.className = 'ig-mention-user-item';
      const isRestricted = u.canMention === false;
      item.innerHTML = `
        <div style="flex-shrink:0">${avatarHTML(u, 'sm')}</div>
        <div style="flex:1;overflow:hidden">
          <div style="font-weight:700;font-size:13px;color:#fff">${esc(u.name)}</div>
          <div style="font-size:11px;color:#ff9800;font-weight:600">@${esc(u.username || 'user')}</div>
        </div>
        ${isRestricted ? `<span class="pill xs" style="background:rgba(255,255,255,0.1);color:#94a3b8;font-weight:600">Restricted</span>` : `<span class="pill xs" style="background:rgba(255,59,48,0.2);color:#ff5c7c;font-weight:700">Tag</span>`}
      `;
      if (isRestricted) {
        item.style.opacity = '0.55';
        item.onclick = () => toast(`@${u.username || u.name} does not allow status mentions.`, 'err');
      } else {
        item.onclick = () => applyMention(u.username || u.name, u.id);
      }
      listEl.appendChild(item);
    });
  };

  $('#igCloseMentionSheetBtn', studio).onclick = () => mentionSheet.classList.add('hidden');
  $('#igMentionDoneBtn', studio).onclick = () => {
    const val = $('#igMentionInput', studio).value.trim();
    if (val) applyMention(val);
  };
  $('#igMentionInput', studio).oninput = e => {
    renderMentionUserList(e.target.value);
  };
  $('#igMentionInput', studio).onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = $('#igMentionInput', studio).value.trim();
      if (val) applyMention(val);
    }
  };

  // ---------------- Sticker Drawer ----------------
  const stickerSheet = $('#igStickerSheet', studio);
  $('#igStickersBtn', studio).onclick = () => stickerSheet.classList.toggle('hidden');
  $('#igCloseStickerSheetBtn', studio).onclick = () => stickerSheet.classList.add('hidden');

  $$('.ig-widget-card', stickerSheet).forEach(w => {
    w.onclick = () => {
      const widgetType = w.dataset.widget;
      stickerSheet.classList.add('hidden');

      if (widgetType === 'mention') {
        openMentionPicker();
      } else if (widgetType === 'location') {
        openLocationPicker();
      } else {
        let val = w.dataset.val || w.textContent.trim();
        const newId = 'w_' + Date.now();
        elements.push({
          id: newId,
          type: 'widget',
          val,
          x: 50,
          y: 50,
          size: 22
        });
        selectedElId = newId;
        updateOverlayDOM();
      }
    };
  });

  $$('.ig-emoji-tile', stickerSheet).forEach(b => {
    b.onclick = () => {
      const newId = 's_' + Date.now();
      elements.push({
        id: newId,
        type: 'sticker',
        val: b.dataset.emoji,
        x: 50,
        y: 50,
        size: 56
      });
      selectedElId = newId;
      stickerSheet.classList.add('hidden');
      updateOverlayDOM();
    };
  });

  // ---------------- Share & Publish Story (Multi-Slide / Multi-Picture Queue) ----------------
  const renderSingleSlideToCanvas = async (slide) => {
    const compCanvas = document.createElement('canvas');
    compCanvas.width = 1080;
    compCanvas.height = 1920;
    const ctx = compCanvas.getContext('2d');
    const sBgType = slide.bgType || 'gradient';
    const sPickedBg = slide.pickedBg || igGradients[0];
    const sMediaData = slide.mediaData || '';
    const sFilterObj = photoFilters.find(f => f.id === slide.filter) || photoFilters[0];
    const sElements = Array.isArray(slide.elements) ? slide.elements : [];
    const sDrawPaths = Array.isArray(slide.drawPaths) ? slide.drawPaths : [];

    // 1. Draw Background
    ctx.save();
    if (sFilterObj && sFilterObj.css && sFilterObj.css !== 'none') {
      ctx.filter = sFilterObj.css;
    }
    if (sBgType === 'photo' && sMediaData) {
      const bgImg = new Image();
      bgImg.src = sMediaData;
      await new Promise(r => { bgImg.onload = r; bgImg.onerror = r; });
      const scale = Math.max(1080 / (bgImg.width || 1080), 1920 / (bgImg.height || 1920));
      const nw = (bgImg.width || 1080) * scale, nh = (bgImg.height || 1920) * scale;
      ctx.drawImage(bgImg, (1080 - nw) / 2, (1920 - nh) / 2, nw, nh);
    } else {
      const g = ctx.createLinearGradient(0, 0, 1080, 1920);
      if (sPickedBg.includes('#f09433')) {
        g.addColorStop(0, '#f09433'); g.addColorStop(0.25, '#e6683c'); g.addColorStop(0.5, '#dc2743'); g.addColorStop(0.75, '#cc2366'); g.addColorStop(1, '#bc1888');
      } else if (sPickedBg.includes('#11998e')) {
        g.addColorStop(0, '#11998e'); g.addColorStop(1, '#38ef7d');
      } else if (sPickedBg.includes('#4c8dff')) {
        g.addColorStop(0, '#4c8dff'); g.addColorStop(1, '#7c5cff');
      } else if (sPickedBg.includes('#f857a6')) {
        g.addColorStop(0, '#f857a6'); g.addColorStop(1, '#ff5858');
      } else if (sPickedBg.includes('#0f2027')) {
        g.addColorStop(0, '#0f2027'); g.addColorStop(1, '#2c5364');
      } else if (sPickedBg.includes('#121524')) {
        g.addColorStop(0, '#121524'); g.addColorStop(1, '#1a1e36');
      } else {
        g.addColorStop(0, '#7c5cff'); g.addColorStop(1, '#ff5c8a');
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1080, 1920);
    }
    ctx.restore();

    // 1.5 Draw Freehand Brush Paths
    for (const p of sDrawPaths) {
      if (!p.pts || p.pts.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = p.color || '#ff3b30';
      ctx.lineWidth = (p.size || 6) * 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p.pts[0].x * 1080, p.pts[0].y * 1920);
      for (let i = 1; i < p.pts.length; i++) {
        ctx.lineTo(p.pts[i].x * 1080, p.pts[i].y * 1920);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Floating Pictures, Text, Mentions, Locations & Stickers
    for (const el of sElements) {
      const px = (el.x / 100) * 1080;
      const py = (el.y / 100) * 1920;

      if (el.type === 'photo' && el.src) {
        const pImg = new Image();
        pImg.src = el.src;
        await new Promise(r => { pImg.onload = r; pImg.onerror = r; });
        const targetW = Math.max(200, Math.min(920, ((el.size || 38) / 100) * 1080));
        const aspect = (pImg.height || 1) / (pImg.width || 1);
        const targetH = targetW * aspect;
        const drawX = Math.max(targetW / 2 + 16, Math.min(1080 - targetW / 2 - 16, px));
        const drawY = Math.max(targetH / 2 + 24, Math.min(1920 - targetH / 2 - 24, py));
        const left = drawX - targetW / 2;
        const top = drawY - targetH / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 32;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(left, top, targetW, targetH, 28) : ctx.rect(left, top, targetW, targetH);
        ctx.clip();
        ctx.drawImage(pImg, left, top, targetW, targetH);
        ctx.restore();

        ctx.save();
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(left, top, targetW, targetH, 28) : ctx.rect(left, top, targetW, targetH);
        ctx.stroke();
        ctx.restore();
      } else if (el.type === 'text') {
        const fontObj = fonts.find(f => f.id === el.font) || fonts[0];
        const text = String(el.text || '');
        const maxTextW = 940;

        let baseSize = (el.size || 28) * 2.8;
        if (text.length > 220) baseSize = Math.min(baseSize, 42);
        else if (text.length > 120) baseSize = Math.min(baseSize, 56);
        else if (text.length > 60) baseSize = Math.min(baseSize, 72);

        ctx.save();
        ctx.font = `${fontObj.weight || '800'} ${baseSize}px ${fontObj.family}`;
        ctx.textAlign = el.align || 'center';
        ctx.textBaseline = 'middle';

        const paragraphs = text.split('\n');
        const lines = [];
        for (const p of paragraphs) {
          if (!p.trim()) { lines.push(''); continue; }
          const words = p.split(/\s+/);
          let cur = '';
          for (const w of words) {
            const test = cur ? `${cur} ${w}` : w;
            if (ctx.measureText(test).width <= maxTextW) {
              cur = test;
            } else {
              if (cur) lines.push(cur);
              if (ctx.measureText(w).width > maxTextW) {
                let chunk = '';
                for (const ch of w) {
                  if (ctx.measureText(chunk + ch).width <= maxTextW) {
                    chunk += ch;
                  } else {
                    lines.push(chunk);
                    chunk = ch;
                  }
                }
                cur = chunk;
              } else {
                cur = w;
              }
            }
          }
          if (cur) lines.push(cur);
        }

        const lineMetrics = lines.map(l => ctx.measureText(l).width);
        const maxLineW = Math.max(...lineMetrics, 60);
        const lineH = baseSize * 1.35;
        const padX = 36, padY = 20;
        const boxW = Math.min(1020, maxLineW + padX * 2);
        const boxH = lines.length * lineH + padY * 2;

        const drawX = Math.max(boxW / 2 + 10, Math.min(1080 - boxW / 2 - 10, px));
        const drawY = Math.max(boxH / 2 + 20, Math.min(1920 - boxH / 2 - 20, py));
        const boxLeft = drawX - boxW / 2;

        if (el.style === 'badge') {
          ctx.fillStyle = 'rgba(12, 14, 24, 0.78)';
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(boxLeft, drawY - boxH / 2, boxW, boxH, 24) : ctx.rect(boxLeft, drawY - boxH / 2, boxW, boxH);
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.stroke();
          ctx.fillStyle = el.color || '#ffffff';
        } else if (el.style === 'solid') {
          ctx.fillStyle = el.color || '#ffffff';
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(boxLeft, drawY - boxH / 2, boxW, boxH, 24) : ctx.rect(boxLeft, drawY - boxH / 2, boxW, boxH);
          ctx.fill();
          ctx.fillStyle = isLightHex(el.color || '#ffffff') ? '#000000' : '#ffffff';
        } else if (el.style === 'glow') {
          ctx.shadowColor = el.color || '#ffffff';
          ctx.shadowBlur = 36;
          ctx.fillStyle = el.color || '#ffffff';
        } else {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 14;
          ctx.fillStyle = el.color || '#ffffff';
        }

        lines.forEach((line, i) => {
          const lineY = (drawY - boxH / 2 + padY + lineH / 2) + i * lineH;
          const textX = el.align === 'left' ? (boxLeft + padX) : (el.align === 'right' ? (boxLeft + boxW - padX) : drawX);
          if (el.style === 'glow') {
            ctx.fillText(line, textX, lineY);
          }
          ctx.fillText(line, textX, lineY);
        });
        ctx.restore();

      } else if (el.type === 'mention') {
        const fontSize = (el.size || 24) * 2.8;
        ctx.save();
        ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = String(el.val || '@user');
        const metrics = ctx.measureText(text);
        const padX = 44, padY = 20;
        const boxW = Math.min(1020, metrics.width + padX * 2);
        const boxH = fontSize * 1.35 + padY * 2;
        const drawX = Math.max(boxW / 2 + 25, Math.min(1080 - boxW / 2 - 25, px));
        const drawY = Math.max(boxH / 2 + 50, Math.min(1920 - boxH / 2 - 50, py));

        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(drawX - boxW / 2, drawY - boxH / 2, boxW, boxH, boxH / 2) : ctx.rect(drawX - boxW / 2, drawY - boxH / 2, boxW, boxH);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0f111a';
        ctx.fillText(text, drawX, drawY);
        ctx.restore();

      } else if (el.type === 'location') {
        const fontSize = (el.size || 22) * 2.8;
        ctx.save();
        ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = `📍 ${el.val || 'Location'}`;
        const metrics = ctx.measureText(text);
        const padX = 44, padY = 20;
        const boxW = Math.min(1020, metrics.width + padX * 2);
        const boxH = fontSize * 1.35 + padY * 2;
        const drawX = Math.max(boxW / 2 + 25, Math.min(1080 - boxW / 2 - 25, px));
        const drawY = Math.max(boxH / 2 + 50, Math.min(1920 - boxH / 2 - 50, py));

        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(drawX - boxW / 2, drawY - boxH / 2, boxW, boxH, boxH / 2) : ctx.rect(drawX - boxW / 2, drawY - boxH / 2, boxW, boxH);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText(text, drawX, drawY);
        ctx.restore();

      } else if (el.type === 'widget' || (el.type === 'sticker' && el.val && el.val.length > 2)) {
        const fontSize = (el.size || 22) * 2.8;
        ctx.save();
        ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", "Apple Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = String(el.val || '');
        const metrics = ctx.measureText(text);
        const padX = 44, padY = 20;
        const boxW = metrics.width + padX * 2;
        const boxH = fontSize * 1.35 + padY * 2;
        const drawX = Math.max(boxW / 2 + 25, Math.min(1080 - boxW / 2 - 25, px));
        const drawY = Math.max(boxH / 2 + 50, Math.min(1920 - boxH / 2 - 50, py));

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(15, 18, 32, 0.88)';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(drawX - boxW / 2, drawY - boxH / 2, boxW, boxH, boxH / 2) : ctx.rect(drawX - boxW / 2, drawY - boxH / 2, boxW, boxH);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, drawX, drawY);
        ctx.restore();

      } else {
        const fontSize = (el.size || 48) * 2.6;
        ctx.save();
        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20;
        const drawX = Math.max(fontSize / 2 + 25, Math.min(1080 - fontSize / 2 - 25, px));
        const drawY = Math.max(fontSize / 2 + 50, Math.min(1920 - fontSize / 2 - 50, py));
        ctx.fillText(el.val, drawX, drawY);
        ctx.restore();
      }
    }

    return compCanvas.toDataURL('image/jpeg', 0.85);
  };

  const publishStory = async () => {
    stopCam();
    saveCurrentSlideState();
    const btn = $('#igPostShareBtn', studio);
    btn.disabled = true;
    btn.textContent = slides.length > 1 ? `Posting ${slides.length} Stories…` : 'Posting…';

    try {
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const finalDataUrl = await renderSingleSlideToCanvas(slide);
        const sElements = Array.isArray(slide.elements) ? slide.elements : [];

        const mentionedUserIds = sElements
          .filter(el => el.type === 'mention')
          .map(el => {
            if (el.userId) return el.userId;
            const handle = String(el.val || '').replace(/^@/, '').trim().toLowerCase();
            const target = Array.from(S.users.values()).find(u =>
              (u.username && u.username.toLowerCase() === handle) ||
              (u.name && u.name.toLowerCase() === handle)
            );
            return target ? target.id : null;
          })
          .filter(Boolean);

        await api('/api/statuses', {
          method: 'POST',
          body: {
            kind: 'image',
            text: '',
            bg: slide.pickedBg || pickedBg,
            mediaData: finalDataUrl,
            privacy: S.user?.statusPrivacy || { mode: 'friends', exceptIds: [], onlyIds: [] },
            mentionedUserIds
          }
        });
      }

      SoundFX.play('save');
      closeStudio();
      await loadStatuses();
      toast(slides.length > 1 ? `${slides.length} stories shared to ZovioStatus! ✨` : 'Story shared to ZovioStatus! ✨');
    } catch (e) {
      toast(e.message, 'err');
      btn.disabled = false;
      btn.textContent = slides.length > 1 ? `Share ${slides.length} Stories` : 'Share Story';
    }
  };

  $('#igPostShareBtn', studio).onclick = publishStory;
  // ---------------- In-Studio Privacy Sheet ----------------
  $('#igClosePrivSheetBtn', studio).onclick = () => privacySheet.classList.add('hidden');

  const openPrivacySheet = async () => {
    privacySheet.classList.remove('hidden');
    const body = $('#igPrivSheetBody', studio);
    body.innerHTML = `<div class="row center" style="padding:40px"><span class="spinner" style="width:24px;height:24px;border-width:2.5px;display:inline-block"></span></div>`;

    let allUsers = Array.from(S.users.values());
    if (allUsers.length < 5) {
      try {
        const fetched = await api('/api/users');
        fetched.forEach(u => S.users.set(u.id, u));
        allUsers = Array.from(S.users.values());
      } catch {}
    }

    const friendIds = Array.isArray(S.user?.friends) ? S.user.friends : [];
    const blockedIds = Array.isArray(S.user?.blockedUsers) ? S.user.blockedUsers : [];
    const nonBlockedUsers = allUsers.filter(u => u.id !== S.user?.id && !blockedIds.includes(u.id));
    const friendUsers = nonBlockedUsers.filter(u => friendIds.includes(u.id));

    const curPriv = S.user?.statusPrivacy || { mode: 'friends', exceptIds: [], onlyIds: [] };
    let tempMode = curPriv.mode || 'friends';
    let tempExcept = new Set(curPriv.exceptIds || []);
    let tempOnly = new Set(curPriv.onlyIds || []);

    const renderSheetContent = () => {
      body.innerHTML = `
        <div class="col gap-xs" style="margin-bottom:12px">
          <label class="status-priv-radio-card ${tempMode === 'friends' ? 'active' : ''}" data-smode="friends">
            <input type="radio" name="igStPriv" value="friends" ${tempMode === 'friends' ? 'checked' : ''}>
            <div class="status-priv-radio-card-content">
              <div class="status-priv-radio-card-title">My Friends (${friendUsers.length})</div>
              <div class="status-priv-radio-card-sub">Only users marked as Friend can see your story</div>
            </div>
          </label>

          <label class="status-priv-radio-card ${tempMode === 'friends_except' ? 'active' : ''}" data-smode="friends_except">
            <input type="radio" name="igStPriv" value="friends_except" ${tempMode === 'friends_except' ? 'checked' : ''}>
            <div class="status-priv-radio-card-content">
              <div class="status-priv-radio-card-title">Friends Except… (${tempExcept.size} excluded)</div>
              <div class="status-priv-radio-card-sub">Hide your status from specific friends</div>
            </div>
          </label>

          <label class="status-priv-radio-card ${tempMode === 'only_share_with' ? 'active' : ''}" data-smode="only_share_with">
            <input type="radio" name="igStPriv" value="only_share_with" ${tempMode === 'only_share_with' ? 'checked' : ''}>
            <div class="status-priv-radio-card-content">
              <div class="status-priv-radio-card-title">Only Share With… (${tempOnly.size} selected)</div>
              <div class="status-priv-radio-card-sub">Share with chosen contacts only</div>
            </div>
          </label>

          <label class="status-priv-radio-card ${tempMode === 'everyone' ? 'active' : ''}" data-smode="everyone">
            <input type="radio" name="igStPriv" value="everyone" ${tempMode === 'everyone' ? 'checked' : ''}>
            <div class="status-priv-radio-card-content">
              <div class="status-priv-radio-card-title">Everyone</div>
              <div class="status-priv-radio-card-sub">Any user on Zovio can view your story</div>
            </div>
          </label>
        </div>

        ${(tempMode === 'friends_except' || tempMode === 'only_share_with') ? `
          <div style="max-height:160px;overflow-y:auto;padding:8px;background:rgba(255,255,255,0.04);border-radius:12px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.1)">
            ${(tempMode === 'friends_except' ? friendUsers : nonBlockedUsers).map(u => {
              const isChecked = tempMode === 'friends_except' ? tempExcept.has(u.id) : tempOnly.has(u.id);
              return `
                <label class="row between align-center" style="padding:6px 8px;border-radius:8px;cursor:pointer">
                  <div class="row gap-s align-center">
                    ${avatarHTML(u, 'xs')}
                    <span style="font-size:13px;font-weight:700">${esc(u.name)}</span>
                  </div>
                  <input type="checkbox" data-igpuid="${u.id}" ${isChecked ? 'checked' : ''}>
                </label>
              `;
            }).join('')}
          </div>
        ` : ''}

        <button type="button" class="btn primary glow full" id="igSavePrivBtn" style="height:42px;font-weight:800;border-radius:12px">
          Save Privacy
        </button>
      `;

      $$('input[name="igStPriv"]', body).forEach(r => {
        r.onchange = () => {
          tempMode = r.value;
          renderSheetContent();
        };
      });

      $$('input[data-igpuid]', body).forEach(cb => {
        cb.onchange = () => {
          const uid = cb.dataset.igpuid;
          const targetSet = tempMode === 'friends_except' ? tempExcept : tempOnly;
          if (cb.checked) targetSet.add(uid); else targetSet.delete(uid);
        };
      });

      $('#igSavePrivBtn', body).onclick = async () => {
        const btn = $('#igSavePrivBtn', body);
        btn.disabled = true;
        btn.textContent = 'Saving…';
        const statusPrivacy = {
          mode: tempMode,
          exceptIds: [...tempExcept],
          onlyIds: [...tempOnly]
        };
        try {
          const updated = await api('/api/me', { method: 'PATCH', body: { statusPrivacy } });
          Object.assign(S.user, updated);
          const lbl = $('#igStudioPrivLabel', studio);
          if (lbl) lbl.textContent = `${statusPrivacyLabel(S.user.statusPrivacy)} ▾`;
          privacySheet.classList.add('hidden');
          toast(`Privacy updated: ${statusPrivacyLabel(S.user.statusPrivacy)}`);
        } catch (e) {
          toast(e.message, 'err');
          btn.disabled = false;
          btn.textContent = 'Save Privacy';
        }
      };
    };

    renderSheetContent();
  };

  if ($('#igStudioPrivBtn', studio)) {
    $('#igStudioPrivBtn', studio).onclick = () => {
      openPrivacySheet();
    };
  }

  // Initialize
  renderSlidesStrip();
  if (initialKind === 'image') {
    startCamera();
  } else {
    switchToGradient();
    openTextEditor();
  }
}

window.openStoryViewerForUser = function(userId) {
  const groups = groupStatusesByUser();
  const targetGroup = groups.get(userId);
  if (targetGroup && targetGroup.items.length) {
    openStoryViewer(targetGroup);
  } else {
    loadStatuses().then(() => {
      const g = groupStatusesByUser().get(userId);
      if (g && g.items.length) openStoryViewer(g);
      else toast('Story expired or unavailable');
    });
  }
};

function openStoryViewer(initialGroup, customGroupList = null) {
  const viewer = $('#storyViewer');
  if (!viewer) return;

  const groupsMap = groupStatusesByUser();
  const myG = groupsMap.get(S.user.id) || { user: S.user, items: [] };
  const otherG = Array.from(groupsMap.values()).filter(g => g.user.id !== S.user.id);
  const groupList = customGroupList || [
    ...(myG.items.length ? [myG] : []),
    ...otherG
  ].filter(g => g.items && g.items.length > 0);

  if (!groupList.length) return;

  let groupIdx = groupList.findIndex(g => g.user.id === (initialGroup?.user?.id || initialGroup?.id));
  if (groupIdx === -1) groupIdx = 0;

  let idx = 0;
  let timer = null;
  let isPaused = false;

  const closeViewer = () => {
    clearInterval(timer);
    window.removeEventListener('keydown', onKey);
    const audio = viewer.querySelector('#storyAudioElem');
    if (audio) { audio.pause(); audio.src = ''; }
    viewer.classList.add('hidden');
    viewer.innerHTML = '';
    renderStatusView();
  };

  const nextStatus = () => {
    const curG = groupList[groupIdx];
    if (curG && idx < curG.items.length - 1) {
      idx++;
      renderSlide();
    } else {
      nextUser();
    }
  };

  const prevStatus = () => {
    if (idx > 0) {
      idx--;
      renderSlide();
    } else {
      prevUser(true);
    }
  };

  const nextUser = () => {
    if (groupIdx < groupList.length - 1) {
      groupIdx++;
      idx = 0;
      renderSlide('next');
    } else {
      closeViewer();
    }
  };

  const prevUser = (toLast = false) => {
    if (groupIdx > 0) {
      groupIdx--;
      const curG = groupList[groupIdx];
      idx = toLast ? Math.max(0, (curG?.items?.length || 1) - 1) : 0;
      renderSlide('prev');
    }
  };

  const onKey = e => {
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowRight') nextStatus();
    else if (e.key === 'ArrowLeft') prevStatus();
  };
  window.addEventListener('keydown', onKey);

  const renderSlide = (dir = 'none') => {
    clearInterval(timer);
    const currentGroup = groupList[groupIdx];
    if (!currentGroup || !currentGroup.items || !currentGroup.items.length) {
      return closeViewer();
    }
    const st = currentGroup.items[idx];
    if (!st) return closeViewer();

    if (!(st.views || []).includes(S.user.id)) {
      api(`/api/statuses/${st.id}/view`, { method: 'POST' }).catch(() => {});
    }

    const reacts = Object.entries(st.reactions || {});
    viewer.classList.remove('hidden');
    viewer.innerHTML = `
      <div class="story-stage ${dir === 'next' ? 'story-slide-next' : (dir === 'prev' ? 'story-slide-prev' : '')}" id="storyStage" style="background:${esc(st.bg || 'linear-gradient(135deg,#7c5cff,#ff5c8a)')}">
        ${st.mediaData ? `<img src="${esc(st.mediaData)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none">` : ''}
        <div class="status-card-overlay" style="pointer-events:none"></div>

        <!-- TOP BAR: STORY BARS & USER HEADER -->
        <div style="position:relative;z-index:10">
          <div class="story-bars">
            ${currentGroup.items.map((_, i) => `<div class="story-bar"><div id="sbar-${i}" style="width:${i < idx ? 100 : 0}%"></div></div>`).join('')}
          </div>
          <div class="row between" style="padding:10px 16px;color:#fff">
            <div class="row gap-s" style="align-items:center">
              ${avatarHTML(currentGroup.user, 'sm')}
              <div>
                <div style="font-weight:700;font-size:13.5px">${esc(currentGroup.user.name)}</div>
                <div style="font-size:11px;opacity:.85;display:flex;align-items:center;gap:4px">
                  <span>${fmtTime(st.createdAt)}</span>
                  <span>·</span>
                  ${icon('eye')} <span>${(st.views || []).length}</span>
                  ${groupList.length > 1 ? `<span class="pill xs" style="background:rgba(255,255,255,0.18);margin-left:4px">${groupIdx + 1}/${groupList.length}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="row gap-xs">
              ${(st.userId === S.user.id || st.user?.id === S.user.id) ? `<button class="icon-btn" id="delStoryBtn" style="color:#fff" title="Delete status">${icon('trash')}</button>` : ''}
              <button class="icon-btn" id="closeStoryBtn" style="color:#fff" title="Close">${icon('close')}</button>
            </div>
          </div>
        </div>

        <!-- INVISIBLE TAP ZONES FOR EITHER END OF THE CARD -->
        <div class="story-tap-areas" id="storyTapAreas">
          <div class="story-tap-zone prev" id="storyTapPrev" title="Tap left for previous status"></div>
          <div class="story-tap-zone next" id="storyTapNext" title="Tap right for next status"></div>
        </div>

        <!-- MIDDLE CONTENT -->
        <div style="position:relative;z-index:4;padding:24px 20px;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:auto 0;pointer-events:none;width:100%">
          ${st.text ? `
            <div style="font-size:${(st.text || '').length > 180 ? '17px' : (st.text || '').length > 90 ? '21px' : '26px'};font-weight:800;line-height:1.42;text-shadow:0 2px 14px rgba(0,0,0,0.9),0 0 30px rgba(0,0,0,0.7);max-width:88%;word-break:break-word;overflow-wrap:break-word;white-space:pre-wrap;box-sizing:border-box;background:${st.mediaData ? 'rgba(0,0,0,0.48)' : 'transparent'};padding:${st.mediaData ? '10px 18px' : '0'};border-radius:${st.mediaData ? '16px' : '0'};backdrop-filter:${st.mediaData ? 'blur(8px)' : 'none'}">
              ${esc(st.text)}
            </div>
          ` : ''}
        </div>

        <!-- BOTTOM BAR: REACTIONS (ARROWS REMOVED) -->
        <div style="position:relative;z-index:10;padding:12px 16px;background:rgba(0,0,0,0.5);backdrop-filter:blur(14px)">
          ${reacts.length ? `
            <div class="row gap-xs wrap" style="margin-bottom:8px">
              ${reacts.map(([em, uids]) => `<span class="pill" style="background:rgba(255,255,255,0.22);color:#fff">${esc(em)} ${uids.length}</span>`).join('')}
            </div>` : ''}
          <div class="row between align-center">
            <div class="row gap-xs">
              ${['🔥', '❤️', '👏', '😂', '😍', '🎉'].map(em => `<button class="btn sm" data-streact="${em}" style="background:rgba(255,255,255,0.15);color:#fff;padding:6px 9px;border:none">${em}</button>`).join('')}
            </div>
            ${groupList.length > 1 ? `<span class="muted xs" style="color:rgba(255,255,255,0.6);font-size:11px">Swipe ⇄ for next user</span>` : ''}
          </div>
        </div>
      </div>`;

    hydrateIcons(viewer);
    $('#closeStoryBtn', viewer).onclick = closeViewer;

    // Tap either end of the card
    $('#storyTapPrev', viewer).onclick = e => {
      e.stopPropagation();
      prevStatus();
    };
    $('#storyTapNext', viewer).onclick = e => {
      e.stopPropagation();
      nextStatus();
    };

    // Swipe gestures on the card to switch between users
    const stage = viewer.querySelector('#storyStage');
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isSwiping = false;

    stage.onpointerdown = e => {
      if (e.target.closest('button, [data-streact]')) return;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      isPaused = true;
      isSwiping = false;
      try { stage.setPointerCapture(e.pointerId); } catch {}
    };

    stage.onpointermove = e => {
      if (!startTime) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy)) {
        isSwiping = true;
      }
    };

    stage.onpointerup = e => {
      if (!startTime) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const dt = Date.now() - startTime;
      startTime = 0;
      isPaused = false;
      try { stage.releasePointerCapture(e.pointerId); } catch {}

      // Horizontal swipe to change user
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < -40) {
          // Swiped left -> next user
          nextUser();
        } else if (dx > 40) {
          // Swiped right -> previous user
          prevUser();
        }
        return;
      }

      // If clicked outside the tap zones
      if (!isSwiping && dt < 450 && Math.abs(dx) < 15 && Math.abs(dy) < 15) {
        if (e.target.closest('button, [data-streact], #storyTapPrev, #storyTapNext')) return;
        const rect = stage.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        if (clickX < rect.width * 0.45) prevStatus(); else nextStatus();
      }
    };

    stage.onpointercancel = () => {
      startTime = 0;
      isPaused = false;
    };

    // Custom Audio Player Wire-Up
    const audio = viewer.querySelector('#storyAudioElem');
    const playBtn = viewer.querySelector('#storyPlayToggleBtn');
    const eqWave = viewer.querySelector('#storyEqWave');
    const progress = viewer.querySelector('#storyAudioProgress');

    if (audio && playBtn) {
      audio.onplay = () => {
        playBtn.innerHTML = icon('pause');
        if (eqWave) eqWave.classList.add('active');
        isPaused = false;
      };
      audio.onpause = () => {
        playBtn.innerHTML = icon('play');
        if (eqWave) eqWave.classList.remove('active');
        isPaused = true;
      };
      audio.ontimeupdate = () => {
        if (progress && audio.duration) {
          progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
        }
      };
      playBtn.onclick = () => {
        if (audio.paused) audio.play(); else audio.pause();
      };
      const seek = viewer.querySelector('#storyAudioSeek');
      if (seek) {
        seek.onclick = e => {
          const rect = seek.getBoundingClientRect();
          const p = (e.clientX - rect.left) / rect.width;
          if (audio.duration) audio.currentTime = p * audio.duration;
        };
      }
    }

    if ($('#delStoryBtn', viewer)) {
      $('#delStoryBtn', viewer).onclick = async e => {
        e.stopPropagation();
        SoundFX.play('delete');
        try {
          await api(`/api/statuses/${st.id}`, { method: 'DELETE' });
        } catch (err) {
          console.warn('Delete status API error:', err);
        }
        S.statuses = S.statuses.filter(x => x.id !== st.id);
        updateStatusBadge();
        currentGroup.items.splice(idx, 1);
        toast('Story deleted');
        if (!currentGroup.items.length) {
          groupList.splice(groupIdx, 1);
          if (groupIdx >= groupList.length) groupIdx = Math.max(0, groupList.length - 1);
          idx = 0;
          if (!groupList.length) closeViewer(); else renderSlide();
        } else {
          idx = Math.min(idx, currentGroup.items.length - 1);
          renderSlide();
        }
      };
    }
    $$('[data-streact]', viewer).forEach(b => b.onclick = async e => {
      e.stopPropagation();
      SoundFX.play('react');
      await api(`/api/statuses/${st.id}/react`, { method: 'POST', body: { emoji: b.dataset.streact } });
      toast(`Reacted ${b.dataset.streact}`);
    });

    // Story bar progress animation
    let pct = 0;
    const bar = $(`#sbar-${idx}`, viewer);
    timer = setInterval(() => {
      if (isPaused) return;
      pct += 1.5;
      if (bar) bar.style.width = `${pct}%`;
      if (pct >= 100) {
        clearInterval(timer);
        nextStatus();
      }
    }, 100);
  };

  renderSlide();
}

// ---------------- DOM Ready ----------------
// ---------------- FireCalls History Engine ----------------
function formatDuration(sec) {
  const s = Math.max(0, parseInt(sec, 10) || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function fmtCallDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${timeStr}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

function formatDaysLeft(expiresAt) {
  if (!expiresAt) return '30d left';
  const msLeft = expiresAt - Date.now();
  const days = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  return `${days}d left`;
}

function updateCallsBadge() {
  const badge = $('#badge-calls');
  if (!badge) return;
  const missed = S.calls.filter(c => !c.isCaller && c.status !== 'completed').length;
  if (missed > 0) {
    badge.textContent = missed > 99 ? '99+' : missed;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function loadCalls() {
  try {
    const list = await api('/api/calls/history');
    S.calls = Array.isArray(list) ? list : [];
    updateCallsBadge();
    return S.calls;
  } catch (err) {
    console.warn('Failed to load call history:', err);
    return [];
  }
}

async function deleteCallHistory(callId) {
  if (!callId) return;
  try {
    await api(`/api/calls/history/${callId}`, { method: 'DELETE' });
    S.calls = S.calls.filter(c => c.id !== callId);
    updateCallsBadge();
    if ($('#chatCallsPane') && !$('#chatCallsPane').classList.contains('hidden')) {
      renderCallsView('#chatCallsPane');
    }
    if (typeof renderChatList === 'function') {
      renderChatList();
    }
  } catch (err) {
    toast('Failed to delete call: ' + err.message, 'err');
  }
}

function renderCallsView(target = '#chatCallsPane') {
  const root = $(target) || $('#chatCallsPane') || $('#view-calls');
  if (!root) return;

  const filter = S.callsFilter || 'all';
  const filtered = S.calls.filter(c => {
    if (filter === 'missed') return !c.isCaller && c.status !== 'completed';
    if (filter === 'audio') return (c.mode || 'audio') === 'audio';
    if (filter === 'video') return c.mode === 'video';
    return true;
  });

  const counts = {
    all: S.calls.length,
    missed: S.calls.filter(c => !c.isCaller && c.status !== 'completed').length,
    audio: S.calls.filter(c => (c.mode || 'audio') === 'audio').length,
    video: S.calls.filter(c => c.mode === 'video').length
  };

  root.innerHTML = `
    <div class="calls-hub-wrap">
      <header class="calls-hub-head">
        <div class="col gap-xs">
          <div class="row gap-s" style="align-items:center">
            <div class="fireupp-logo-wrap" style="width:34px;height:34px;border-radius:10px;padding:2px">
              <img src="/logo-64.png" width="26" height="26" style="border-radius:6px;display:block" alt="Zovio">
            </div>
            <h2 class="calls-hub-title">ZovioCalls History</h2>
          </div>
          <p class="calls-hub-sub">Audio & video calls with duration, date & 30-day automatic auto-deletion ⏳</p>
        </div>

        <div class="row gap-s" style="align-items:center">
          <button class="btn primary glow" id="callsNewCallBtn" title="Start a voice or video call">
            ${icon('phone')} <span>Start Call</span>
          </button>
        </div>
      </header>

      <!-- Auto-Deletion Policy Banner -->
      <div class="calls-policy-card">
        <div class="calls-policy-icon">⏳</div>
        <div class="calls-policy-text">
          <strong>30-Day Auto-Purge Policy Active</strong>
          <p>Every call record is automatically and permanently deleted from our servers 30 days after the call date.</p>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="calls-filter-bar">
        <button class="calls-tab-btn ${filter === 'all' ? 'active' : ''}" data-cfilter="all">
          <span>All Calls</span> <b class="tab-count">${counts.all}</b>
        </button>
        <button class="calls-tab-btn ${filter === 'missed' ? 'active' : ''}" data-cfilter="missed">
          <span>Missed</span> <b class="tab-count ${counts.missed > 0 ? 'red' : ''}">${counts.missed}</b>
        </button>
        <button class="calls-tab-btn ${filter === 'audio' ? 'active' : ''}" data-cfilter="audio">
          <span>Voice</span> <b class="tab-count">${counts.audio}</b>
        </button>
        <button class="calls-tab-btn ${filter === 'video' ? 'active' : ''}" data-cfilter="video">
          <span>Video</span> <b class="tab-count">${counts.video}</b>
        </button>
      </div>

      <!-- Call Records List -->
      <div class="calls-list-container">
        ${filtered.length > 0 ? `
          <div class="calls-list">
            ${filtered.map(c => {
              const peer = c.peer || { name: 'Contact', avatarColor: '#7c5cff' };
              const isVideo = c.mode === 'video';
              const isAnswered = c.status === 'completed';
              const isDeclined = c.status === 'declined';
              const isMissed = !isAnswered && !isDeclined && !c.isCaller;

              let statusClass = isAnswered ? 'answered' : (isMissed ? 'missed' : 'declined');
              let statusLabel = '';
              let dirIcon = '';

              if (c.isCaller) {
                dirIcon = '↗';
                statusLabel = isAnswered
                  ? `Outgoing ${isVideo ? 'Video' : 'Voice'} Call · Talked for ${formatDuration(c.duration)}`
                  : `Cancelled Call`;
              } else {
                dirIcon = '↙';
                if (isAnswered) {
                  statusLabel = `Incoming ${isVideo ? 'Video' : 'Voice'} Call · Talked for ${formatDuration(c.duration)}`;
                } else if (isDeclined) {
                  statusLabel = `Declined Call`;
                } else {
                  statusLabel = `Missed Call`;
                }
              }

              return `
                <div class="call-row ${statusClass}" data-call-id="${esc(c.id)}">
                  <div class="call-row-avatar">
                    ${avatarHTML(peer, 'md')}
                  </div>

                  <div class="call-row-main">
                    <div class="call-row-top">
                      <strong class="call-peer-name-text">${esc(peer.name || 'Contact')}</strong>
                      ${peer.username ? `<span class="call-peer-handle">@${esc(peer.username)}</span>` : ''}
                    </div>

                    <div class="call-row-sub ${statusClass}">
                      <span class="call-dir-arrow ${statusClass}">${dirIcon}</span>
                      <span class="call-status-desc">${esc(statusLabel)}</span>
                    </div>

                    <div class="call-row-meta">
                      <span class="call-time-tag">${fmtCallDate(c.createdAt)}</span>
                      <span class="call-expire-pill" title="This log will be automatically purged 30 days after the call date">
                        ⏳ ${formatDaysLeft(c.expiresAt)}
                      </span>
                    </div>
                  </div>

                  <div class="call-row-actions">
                    <button type="button" class="icon-btn call-action-btn voice" data-peer-id="${esc(peer.id || '')}" data-chat-id="${esc(c.chatId || '')}" data-call-mode="audio" title="Start Voice Call">
                      ${icon('phone')}
                    </button>
                    <button type="button" class="icon-btn call-action-btn video" data-peer-id="${esc(peer.id || '')}" data-chat-id="${esc(c.chatId || '')}" data-call-mode="video" title="Start Video Call">
                      ${icon('video')}
                    </button>
                    <button type="button" class="icon-btn call-action-btn del" data-del-call="${esc(c.id)}" title="Delete from history">
                      ${icon('trash')}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="no-content-box calls-empty">
            <div class="nc-ico" style="background:rgba(255,87,34,0.12);color:var(--brand)">
              ${icon('phone')}
            </div>
            <h4>${filter === 'missed' ? 'No Missed Calls' : 'No Call History Yet'}</h4>
            <p>${filter === 'missed' ? 'You have caught all your incoming calls!' : 'Your audio and video call history with duration and auto-delete countdown will appear here.'}</p>
            <button class="btn primary sm" id="callsEmptyNewBtn" style="margin-top:10px">
              ${icon('phone')} <span>Start a Call</span>
            </button>
          </div>
        `}
      </div>
    </div>
  `;

  hydrateIcons(root);

  // Tabs
  $$('.calls-tab-btn', root).forEach(b => {
    b.onclick = () => {
      S.callsFilter = b.dataset.cfilter || 'all';
      renderCallsView(target);
    };
  });

  // Call actions
  const onNewCall = () => {
    if (typeof openStartCallModal === 'function') {
      openStartCallModal();
    } else if (typeof openNewChatModal === 'function') {
      openNewChatModal();
    }
  };
  $('#callsNewCallBtn', root)?.addEventListener('click', onNewCall);
  $('#callsEmptyNewBtn', root)?.addEventListener('click', onNewCall);

  $$('.call-action-btn[data-call-mode]', root).forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const mode = btn.dataset.callMode || 'audio';
      const peerId = btn.dataset.peerId;
      if (typeof directCallUser === 'function') {
        directCallUser(peerId, mode);
      }
    };
  });

  $$('[data-del-call]', root).forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      deleteCallHistory(btn.dataset.delCall);
    };
  });
}

window.loadCalls = loadCalls;
window.renderCallsView = renderCallsView;
window.formatDuration = formatDuration;

window.addEventListener('DOMContentLoaded', async () => {
  hydrateIcons();
  applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');

  // Google Identity Services & OAuth initialization
  await setupGoogleOAuth();

  // Handle return from Google OAuth redirect flow
  const urlP = new URLSearchParams(window.location.search);
  if (urlP.get('g_email')) {
    const gEmail = urlP.get('g_email');
    const gName = urlP.get('g_name');
    const gAvatar = urlP.get('g_avatar');
    window.history.replaceState({}, '', '/');
    loadGoogleAccount({ email: gEmail, name: gName, avatar: gAvatar });
  } else if (urlP.get('google_error')) {
    toast(`Google Sign-In: ${urlP.get('google_error')}`, 'err');
    window.history.replaceState({}, '', '/');
  }

  // Listen for desktop auth callback (from Chrome fireupp:// deep link)
  if (window.fireuppNative?.onAuthCallback) {
    window.fireuppNative.onAuthCallback(async (data) => {
      console.log('[Electron] Received deep-link auth callback:', data?.email);
      if (typeof window._desktopAuthSessionHandler === 'function') {
        window._desktopAuthSessionHandler(data);
        return;
      }
      if (data?.action === 'drive') return;
      if (!data || !data.email || !data.token) {
        toast('Invalid authorization response from browser', 'err');
        return;
      }
      $('#authBusy').classList.remove('hidden');
      $('#authBusy').innerHTML = `<span class="spinner"></span> Signing in as ${esc(data.email)}...`;
      try {
        await processFirebaseGoogleUser({
          uid: data.uid,
          email: data.email,
          displayName: data.name,
          getIdToken: async () => data.token
        });
        toast(`Welcome back, ${data.name || data.email}!`);
      } catch (err) {
        console.error('[auth] Failed to process desktop auth token:', err);
        toast(err.message || 'Authentication failed', 'err');
        $('#authError').textContent = err.message || 'Authentication failed';
        $('#authError').classList.remove('hidden');
      } finally {
        $('#authBusy').classList.add('hidden');
      }
    });
  }

  // Handle return from Firebase Google Auth redirect flow
  try {
    await initFirebaseClient();
    if (window.firebase?.auth) {
      const redirectRes = await firebase.auth().getRedirectResult();
      if (redirectRes && redirectRes.user) {
        $('#authBusy').classList.remove('hidden');
        $('#authBusy').innerHTML = '<span class="spinner"></span> Signing in with Google…';
        await processFirebaseGoogleUser(redirectRes.user);
      }
    }
  } catch (redirectErr) {
    console.warn('[auth] Redirect result error:', redirectErr);
    if (redirectErr.code && redirectErr.code !== 'auth/null-user') {
      toast(`Google Sign-In: ${redirectErr.message}`, 'err');
    }
  }

  // Auth UI bindings
  const runAuth = async fn => {
    $('#authError').classList.add('hidden');
    $('#authBusy').classList.remove('hidden');
    try { await fn(); } catch (e) {
      $('#authError').textContent = e.message;
      $('#authError').classList.remove('hidden');
    } finally {
      $('#authBusy').classList.add('hidden');
    }
  };

  // Platform layout markers (keeps Windows titlebar hidden on Android/mobile browsers)
  const ua = navigator.userAgent || '';
  const isDesktopHost = Boolean(window.fireuppNative?.isElectron || ua.includes('FireuppDesktop'));
  const isMobileHost = Boolean(window.Capacitor || window.ZovioAndroid?.isAvailable?.() || ua.includes('ZovioAndroid') || ua.includes('Android'));
  document.body.classList.toggle('is-desktop-app', isDesktopHost);
  document.body.classList.toggle('is-mobile-app', !isDesktopHost && isMobileHost);

  // Google Sign-In Button Trigger (Firebase Google Auth) & WhatsApp QR Link Sign-In
  if ($('#googleSignInBtn')) $('#googleSignInBtn').onclick = loginWithGoogleFirebase;
  if ($('#googleSignUpBtn')) $('#googleSignUpBtn').onclick = loginWithGoogleFirebase;
  if ($('#googleLoginBtn')) $('#googleLoginBtn').onclick = loginWithGoogleFirebase;
  if ($('#qrLinkSignInBtn')) $('#qrLinkSignInBtn').onclick = openQrPairingModal;

  // Rail bindings
  $$('.rail-btn[data-view]').forEach(b => b.onclick = () => switchView(b.dataset.view));
  $('#themeBtn').onclick = () => {
    SoundFX.play('toggle');
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  };
  $('#meBtn').onclick = () => openProfileModal('identity');
  $('#newBtn').onclick = () => {
    SoundFX.play('click');
    S.view === 'firecasts' ? openNewChannelModal() : openNewChatModal();
  };
  const searchIn = $('#listSearch');
  const searchClear = $('#listSearchClear');
  if (searchIn) {
    searchIn.oninput = e => {
      const val = e.target.value.trim().toLowerCase();
      S.search = val;
      if (searchClear) searchClear.classList.toggle('hidden', !e.target.value);
      renderChatList();
    };
  }
  if (searchClear) {
    searchClear.onclick = () => {
      if (searchIn) {
        searchIn.value = '';
        S.search = '';
        searchClear.classList.add('hidden');
        searchIn.focus();
      }
      renderChatList();
    };
  }

  // Global acoustic interaction sounds across buttons, chips, and menus
  document.addEventListener('click', e => {
    const interactive = e.target.closest('button, .chip, .chat-row, .attach-item, .chat-ctx-item');
    if (!interactive) return;
    if (interactive.dataset.testsound) return; // handled explicitly
    if (interactive.id === 'sendBtn' || interactive.id === 'igSnapShutterBtn' || interactive.id === 'snapPhotoBtn') return;
    SoundFX.play('click');
  }, { passive: true });

  // Native desktop app polish: Custom window controls & titlebar dragging
  const titlebar = document.getElementById('desktopTitlebar');
  if (titlebar) {
    titlebar.addEventListener('mousedown', e => {
      if (e.button === 0 && !e.target.closest('.titlebar-btn')) {
        window.location.href = 'fireupp-action://start-dragging';
      }
    });
    titlebar.addEventListener('dblclick', e => {
      if (!e.target.closest('.titlebar-btn')) {
        window.location.href = 'fireupp-action://toggle-maximize';
      }
    });
  }

  document.getElementById('tbMinBtn')?.addEventListener('click', () => {
    if (window.fireuppNative?.minimize) window.fireuppNative.minimize();
    else window.location.href = 'fireupp-action://minimize';
  });

  document.getElementById('tbMaxBtn')?.addEventListener('click', () => {
    if (window.fireuppNative?.maximize) window.fireuppNative.maximize();
    else window.location.href = 'fireupp-action://toggle-maximize';
  });

  document.getElementById('tbCloseBtn')?.addEventListener('click', () => {
    if (window.fireuppNative?.close) window.fireuppNative.close();
    else window.location.href = 'fireupp-action://close';
  });

  // Native desktop app polish: disable default browser context menu
  document.addEventListener('contextmenu', e => {
    if (!e.target.closest('input, textarea, [contenteditable="true"]')) {
      e.preventDefault();
    }
  });

  // Disable Ctrl + Scroll zooming
  window.addEventListener('wheel', e => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });

  // Disable browser shortcuts (F5, Ctrl+R, Ctrl+P, Ctrl+U, Ctrl+S, Ctrl+G, Ctrl+F, Ctrl +/- zoom)
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (
      e.key === 'F5' ||
      ((e.ctrlKey || e.metaKey) && ['r', 'p', 'u', 's', 'g', 'f', '=', '+', '-', '0'].indexOf(k) !== -1)
    ) {
      e.preventDefault();
    }
  });

  if (!(await tryRestoreSession())) {
    $('#auth').classList.remove('hidden');
    hideZovioBootLoader();
  }

  // Wire WhatsApp-style notification quick reply & open-chat IPC callbacks
  window.fireuppNative?.onNotificationReply?.(({ chatId, text }) => {
    if (typeof window.sendQuickReplyFromNotification === 'function') {
      window.sendQuickReplyFromNotification(chatId, text);
    }
  });
  window.fireuppNative?.onNotificationOpenChat?.((chatId) => {
    if (chatId && typeof openChat === 'function') openChat(chatId);
  });

  // Celebrate if an in-app update was just installed
  const justUpdatedVer = sessionStorage.getItem('fireupp.justUpdated');
  if (justUpdatedVer) {
    sessionStorage.removeItem('fireupp.justUpdated');
    setTimeout(() => {
      SoundFX.play('friend');
      toast(`✨ Zovio has been updated to ${justUpdatedVer}!`, 'ok');
    }, 650);
  }

  // Bind Titlebar 1-Click Update Pill
  const tbUpdateBtn = document.getElementById('tbUpdateBtn');
  if (tbUpdateBtn) {
    tbUpdateBtn.onclick = () => {
      installInAppUpdate(S.latestUpdateInfo || { version: '1.0.42', buildHash: S.latestBuildHash || String(Date.now()) });
    };
  }

  // Check for app updates on boot, every 30s, and whenever window regains focus
  setTimeout(() => checkAppVersion(false), 1800);
  setInterval(() => checkAppVersion(false), 30000);
  window.addEventListener('focus', () => checkAppVersion(false));
});

async function installInAppUpdate(info = {}) {
  const versionLabel = info.version ? `v${info.version}` : 'Latest Build';
  const buildHash = info.buildHash || String(Date.now());

  localStorage.setItem('fireupp.installedBuildHash', buildHash);
  if (info.version) localStorage.setItem('fireupp.installedVersion', info.version);
  sessionStorage.setItem('fireupp.justUpdated', versionLabel);

  const tbBtn = document.getElementById('tbUpdateBtn');
  const tbText = document.getElementById('tbUpdateBtnText');
  if (tbBtn && tbText) {
    tbBtn.disabled = true;
    tbText.textContent = 'Installing Update…';
  }

  let loader = document.getElementById('zovioUpdateLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'zovioUpdateLoader';
    loader.className = 'zovio-loader-overlay';
    document.body.appendChild(loader);
  }

  loader.innerHTML = `
    <div class="zovio-loader-card">
      <div class="zovio-loader-ring">
        <img src="/logo-128.png" width="56" height="56" alt="Zovio" class="zovio-loader-logo">
      </div>
      <div class="zovio-loader-title" id="updStatusTitle">Updating Zovio (${esc(versionLabel)})</div>
      <div class="zovio-loader-sub" id="updStatusSub">Applying latest update package &amp; refreshing cache…</div>
      <div class="zovio-loader-bar is-determinate">
        <div id="updProgressBar" class="zovio-loader-bar-fill" style="width:22%;animation:none;"></div>
      </div>
    </div>
  `;

  const bar = loader.querySelector('#updProgressBar');
  const sub = loader.querySelector('#updStatusSub');

  setTimeout(() => {
    if (bar) bar.style.width = '58%';
    if (sub) sub.textContent = 'Clearing old assets & synchronizing components…';
  }, 300);

  setTimeout(() => {
    if (bar) bar.style.width = '100%';
    if (sub) sub.textContent = 'Restarting Zovio now…';
  }, 750);

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (_) {}

  setTimeout(async () => {
    if (window.fireuppNative?.installAppUpdate) {
      await window.fireuppNative.installAppUpdate().catch(() => {});
    }
    const cleanUrl = window.location.origin + window.location.pathname + '?_upd=' + encodeURIComponent(buildHash);
    window.location.replace(cleanUrl);
  }, 1100);
}

function showInAppUpdatePrompt(res, forceShow = false) {
  if (!res) return;
  S.latestUpdateInfo = res;
  S.latestBuildHash = res.buildHash;

  // Always show the persistent 1-Click pill in the top desktop titlebar
  const tbBtn = document.getElementById('tbUpdateBtn');
  const tbText = document.getElementById('tbUpdateBtnText');
  if (tbBtn) {
    tbBtn.classList.remove('hidden');
    if (tbText) tbText.textContent = 'New Update Available — Click to Install';
  }

  const dismissKey = 'dismissed_update_' + (res.buildHash || res.version);
  if (!forceShow && sessionStorage.getItem(dismissKey)) return;

  let banner = document.getElementById('appUpdateBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'appUpdateBanner';
    banner.className = 'inapp-update-banner';
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="display:flex;align-items:center;gap:9px;font-weight:800;font-size:14.5px;color:#fff;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:rgba(16,185,129,0.2);color:#34d399;font-size:16px;">⚡</span>
        <div>
          <div>New Update Available</div>
          <div style="font-size:11px;font-weight:600;color:#94a3b8;">Version ${esc(res.version || '1.0.42')} &bull; Ready to install</div>
        </div>
      </div>
      <button type="button" id="closeUpdateBanner" style="background:none;border:none;color:#94a3b8;font-size:16px;cursor:pointer;padding:2px 6px;" title="Dismiss">✕</button>
    </div>
    <div style="font-size:12.5px;color:#cbd5e1;line-height:1.45;">
      A new Zovio update is ready! Click below to install it directly inside the app — no need to re-download or run the .exe installer.
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
      <button type="button" id="installUpdateNowBtn" class="btn sm primary glow" style="flex:1;justify-content:center;padding:9px 16px;font-size:12.5px;font-weight:800;background:linear-gradient(135deg,#10b981,#059669);border:none;">
        ⚡ Click to Install Update
      </button>
      <button type="button" id="dismissUpdateBtn" class="btn sm ghost" style="padding:9px 12px;font-size:12px;">Later</button>
    </div>
  `;

  const close = () => {
    sessionStorage.setItem(dismissKey, '1');
    banner.remove();
  };
  banner.querySelector('#closeUpdateBanner').onclick = close;
  banner.querySelector('#dismissUpdateBtn').onclick = close;
  banner.querySelector('#installUpdateNowBtn').onclick = () => installInAppUpdate(res);
}

async function checkAppVersion(manualTrigger = false) {
  try {
    const res = await fetch('/api/app/version?_t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => null);
    if (!res || !res.version) {
      if (manualTrigger) toast('Could not reach update server.', 'err');
      return;
    }

    const savedHash = localStorage.getItem('fireupp.installedBuildHash');
    const savedVer = localStorage.getItem('fireupp.installedVersion');

    // First time running or unversioned client: mark current version as installed
    if (!savedHash && !savedVer) {
      localStorage.setItem('fireupp.installedBuildHash', res.buildHash);
      localStorage.setItem('fireupp.installedVersion', res.version);
      if (manualTrigger) {
        toast(`You are running the latest version of Zovio (v${res.version})!`, 'ok');
      }
      return;
    }

    // A real update exists ONLY if there was already a saved hash/version and it differs from the server
    const hasActualUpdate = (Boolean(savedVer) && Boolean(res.version) && res.version !== savedVer) ||
                            (Boolean(savedHash) && Boolean(res.buildHash) && res.buildHash !== savedHash);

    if (hasActualUpdate) {
      showInAppUpdatePrompt(res, manualTrigger);
    } else {
      // Hide any titlebar update pill and banner when there is no new update
      const tbBtn = document.getElementById('tbUpdateBtn');
      if (tbBtn) tbBtn.classList.add('hidden');
      const banner = document.getElementById('appUpdateBanner');
      if (banner) banner.remove();
      if (manualTrigger) {
        toast(`You are running the latest version of Zovio (v${res.version || '1.0.42'})!`, 'ok');
      }
    }
  } catch (_) {}
}
window.checkAppVersion = checkAppVersion;
window.installInAppUpdate = installInAppUpdate;

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) { existing.addEventListener('load', resolve); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load Razorpay Checkout SDK'));
    document.head.appendChild(s);
  });
}

async function activatePlanCheckout(planId, planObj, onDone) {
  try {
    if (planId === 'free') {
      const res = await api('/api/billing/activate', { method: 'POST', body: { planId: 'free' } });
      if (res.user) S.user = { ...S.user, ...res.user };
      applyPreferencesEffects();
      toast('Switched to Free Tier (1.5 GB cloud + unlimited local/Drive overflow)');
      onDone?.(res);
      return;
    }

    const orderResp = await api('/api/billing/create-order', { method: 'POST', body: { planId } });
    const isElectron = Boolean(window.fireuppNative?.isElectron && window.fireuppNative?.openExternal);
    if (orderResp.live && orderResp.order?.id && orderResp.keyId) {
      // Desktop Electron blocks `about:blank` 3DS/OTP bank popups inside the embedded webview;
      // route Razorpay checkout through the user's system browser via `/checkout.html?sid=...` just like Google OAuth.
      if (isElectron && orderResp.sessionId) {
        const payUrl = `${window.location.origin}/checkout.html?sid=${encodeURIComponent(orderResp.sessionId)}`;
        window.fireuppNative.openExternal(payUrl);
        toast('Opened secure Razorpay checkout in your browser — finish payment to unlock automatically');

        const startedAt = Date.now();
        let paidUser = null;
        while (Date.now() - startedAt < 180000) {
          if (S.user?.plan === planId) {
            paidUser = S.user;
            break;
          }
          try {
            const st = await api(`/api/billing/checkout-session/${encodeURIComponent(orderResp.sessionId)}`);
            if (st?.paid) {
              paidUser = st.user || S.user;
              break;
            }
          } catch {}
          await new Promise(r => setTimeout(r, 1400));
        }

        if (paidUser) {
          S.user = { ...S.user, ...paidUser };
          applyPreferencesEffects();
          try { window.fireuppNative?.focusWindow?.(); } catch {}
          toast(`${planObj.name} activated! Cloud quota: ${fmtBytes(planObj.quotaBytes)}`, 'ok');
          onDone?.({ ok: true, user: paidUser });
        } else {
          toast('Payment window still open in your browser — Zovio will update as soon as payment finishes');
        }
        return;
      }

      await loadRazorpayScript();
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: orderResp.keyId,
          amount: orderResp.order.amount,
          currency: orderResp.order.currency || 'INR',
          name: 'Zovio Cloud',
          description: `${planObj.name} (${fmtBytes(planObj.quotaBytes)} storage)`,
          order_id: orderResp.order.id,
          prefill: { name: S.user?.name || '', email: S.user?.email || '' },
          theme: { color: '#7c5cff' },
          handler: async (resp) => {
            try {
              const res = await api('/api/billing/activate', {
                method: 'POST',
                body: {
                  planId,
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature
                }
              });
              if (res.user) S.user = { ...S.user, ...res.user };
              applyPreferencesEffects();
              toast(`${planObj.name} activated! Cloud quota: ${fmtBytes(planObj.quotaBytes)}`, 'ok');
              onDone?.(res);
              resolve();
            } catch (err) { reject(err); }
          },
          modal: { ondismiss: () => resolve() }
        });
        rzp.open();
      });
      return;
    }

    // Gateway keys not attached yet -> activate preview mode cleanly with clear user notice
    const res = await api('/api/billing/activate', { method: 'POST', body: { planId } });
    if (res.user) S.user = { ...S.user, ...res.user };
    applyPreferencesEffects();
    toast(`${planObj.name} activated (Preview Mode · ${fmtBytes(planObj.quotaBytes)})`, 'ok');
    onDone?.(res);
  } catch (err) {
    toast(err?.message || 'Plan update failed', 'err');
  }
}

async function mountStoragePlansPane(container, highlightPlanId = null, onUpdated = null) {
  if (!container) return;
  try {
    const data = await api('/api/billing/plans');
    const activePlan = (data.plans || []).find(p => p.id === data.currentPlan) || { id: 'free', name: 'Free Tier', proPerks: false };
    if (S.user) {
      S.user.plan = data.currentPlan || 'free';
      S.user.proPerks = Boolean(activePlan.proPerks);
      S.user.cloudQuotaBytes = data.quotaBytes;
      S.user.cloudUsedBytes = data.usage?.totalBytes || 0;
    }

    const bd = data.usage || {};
    const used = Number(bd.totalBytes || 0);
    const quota = Math.max(1, Number(data.quotaBytes || (1.5 * 1024 ** 3)));
    const pct = Math.min(100, Math.round((used / quota) * 1000) / 10);
    const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : 'linear-gradient(90deg,#7c5cff,#10b981)';
    const localStats = window.ZovioLocalDB ? await ZovioLocalDB.getStats().catch(() => null) : null;
    const isLiveGateway = Boolean(data.liveGatewayConfigured);

    container.innerHTML = `
      <div class="settings-pane-head" style="margin-bottom:14px">
        <h3>Cloud Storage &amp; Zovio Plans</h3>
        <p class="muted xs">All encrypted files, ZovioSpace notes, calendar events, whiteboards, messages &amp; statuses count toward your cloud quota. Over-limit items stay in your device cache and sync to your 7-day Google Drive backup.</p>
      </div>

      <div class="prof-card" style="margin-bottom:16px">
        <div class="row between align-center" style="margin-bottom:8px">
          <div>
            <div style="font-weight:800;font-size:15px">Your Cloud Storage (${esc(activePlan.name)})</div>
            <div class="muted xs">${fmtBytes(used)} used of ${fmtBytes(quota)} (${pct}%)</div>
          </div>
          <span class="pill ${pct >= 90 ? 'red' : data.currentPlan === 'pro' ? 'amber' : 'green'}">${fmtBytes(Math.max(0, quota - used))} free</span>
        </div>

        <div style="height:10px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;margin-bottom:10px">
          <div style="height:100%;width:${pct}%;background:${barColor};transition:width .25s ease"></div>
        </div>

        <div class="row wrap gap-m muted xs">
          <span>📁 Files &amp; Media: <b>${fmtBytes(bd.filesBytes || 0)}</b></span>
          <span>📝 Workspace (Notes/Events/Boards): <b>${fmtBytes(bd.workspaceBytes || 0)}</b></span>
          <span>💬 Messages: <b>${fmtBytes(bd.messagesBytes || 0)}</b></span>
          <span>📸 Statuses: <b>${fmtBytes(bd.statusesBytes || 0)}</b></span>
          ${localStats?.supported ? `<span>💾 Local Cache: <b>${fmtBytes(localStats.totalBytes || 0)}</b> (${localStats.mediaCount || 0} files)</span>` : ''}
        </div>
      </div>

      ${!isLiveGateway ? `
        <div style="padding:10px 12px;margin-bottom:14px;border-radius:10px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);font-size:12px;color:#cbd5e1">
          ℹ️ <b>Preview Billing Mode:</b> Razorpay merchant keys (<code>RAZORPAY_KEY_ID</code> / <code>RAZORPAY_KEY_SECRET</code>) are not configured on this server yet, so plan upgrades activate in instant preview mode.
        </div>` : ''}

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
        ${data.plans.map(plan => {
          const isCurrent = data.currentPlan === plan.id;
          const isHighlight = highlightPlanId === plan.id || (plan.id === 'pro' && !highlightPlanId);
          return `
            <div class="prof-card" style="margin:0;display:flex;flex-direction:column;justify-content:space-between;border:${isHighlight ? '1.5px solid rgba(245,158,11,0.75)' : isCurrent ? '1.5px solid var(--brand)' : '1px solid var(--border)'};background:${plan.id === 'pro' ? 'linear-gradient(160deg, rgba(245,158,11,0.08), rgba(124,92,255,0.08))' : 'var(--bg-2)'}">
              <div>
                <div class="row between align-center" style="margin-bottom:6px">
                  <span style="font-weight:800;font-size:16px">${plan.id === 'pro' ? '👑 ' : plan.id === 'plus' ? '⚡ ' : '🌱 '}${esc(plan.name)}</span>
                  ${isCurrent ? '<span class="pill green xs">Current</span>' : plan.id === 'pro' ? '<span class="pill amber xs">Best Value</span>' : ''}
                </div>
                <div style="font-size:24px;font-weight:900;margin:6px 0 2px">${plan.priceInr === 0 ? 'Free' : `₹${plan.priceInr}`}<span class="muted xs" style="font-weight:500">${plan.priceInr === 0 ? '' : ' / month'}</span></div>
                <div style="font-size:12.5px;font-weight:700;color:var(--brand);margin-bottom:10px">${fmtBytes(plan.quotaBytes)} Cloud Storage</div>
                <ul style="list-style:none;padding:0;margin:0 0 14px;display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--text-2)">
                  ${(plan.features || []).map(pk => `<li>✓ ${esc(pk)}</li>`).join('')}
                </ul>
              </div>
              <button type="button" class="btn sm ${isCurrent ? 'ghost' : plan.id === 'pro' ? 'primary glow' : 'primary'}" data-select-plan="${plan.id}" ${isCurrent ? 'disabled' : ''}>
                ${isCurrent ? 'Active Plan' : plan.priceInr === 0 ? 'Switch to Free' : `${isLiveGateway ? 'Upgrade' : 'Activate'} ${esc(plan.name)} (₹${plan.priceInr})`}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    $$('[data-select-plan]', container).forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.dataset.selectPlan;
        const pObj = data.plans.find(x => x.id === pid);
        if (!pObj) return;
        btn.disabled = true;
        try {
          await activatePlanCheckout(pid, pObj, () => {
            mountStoragePlansPane(container, highlightPlanId, onUpdated);
            onUpdated?.();
          });
        } finally {
          btn.disabled = false;
        }
      };
    });
  } catch (err) {
    container.innerHTML = `<div class="muted xs">Could not load storage plans: ${esc(err?.message || 'Error')}</div>`;
  }
}

window.openStoragePlansModal = (highlightPlanId = null) => {
  showModal('Cloud Storage & Plans', `<div id="plansModalMount" style="min-width:min(740px,88vw)"><div class="muted xs">Loading storage quota &amp; plans…</div></div>`, body => {
    mountStoragePlansPane($('#plansModalMount', body), highlightPlanId, () => {
      if ($('#view-profile') && !$('#view-profile').classList.contains('hidden')) {
        renderProfileView('plans');
      }
    });
  });
};

// ==========================================================================
// ANDROID CAPACITOR + NATIVE KOTLIN MEDIA BRIDGE & WHATSAPP QR LINKING
// ==========================================================================
(function initZovioAndroidBridge() {
  const getMediaPlugin = () => window.Capacitor?.Plugins?.ZovioMedia || null;
  const getAppPlugin = () => window.Capacitor?.Plugins?.App || null;

  window.ZovioAndroid = {
    isAvailable: () => Boolean(getMediaPlugin() || window.Capacitor?.getPlatform?.() === 'android'),
    ensurePermissions: async (opts = {}) => {
      const p = getMediaPlugin();
      if (!p?.ensurePermissions) return { granted: true };
      return await p.ensurePermissions({ video: Boolean(opts.video), audio: opts.audio !== false });
    },
    startCallService: async (opts = {}) => {
      const p = getMediaPlugin();
      if (!p?.startCallService) return { ok: false };
      return await p.startCallService({
        title: String(opts.title || 'Zovio Call'),
        video: Boolean(opts.video)
      });
    },
    stopCallService: async () => {
      const p = getMediaPlugin();
      if (!p?.stopCallService) return { ok: false };
      return await p.stopCallService();
    },
    setSpeakerphone: async (enabled = true) => {
      const p = getMediaPlugin();
      if (!p?.setSpeakerphone) return { speaker: Boolean(enabled) };
      return await p.setSpeakerphone({ enabled: Boolean(enabled) });
    },
    startScreenShare: async (opts = {}) => {
      const p = getMediaPlugin();
      if (!p?.startScreenShare) throw new Error('Native Android MediaProjection plugin unavailable');
      return await p.startScreenShare({
        maxWidth: opts.maxWidth || 1280,
        maxHeight: opts.maxHeight || 720,
        fps: opts.fps || 20,
        shareAudio: opts.shareAudio !== false
      });
    },
    stopScreenShare: async () => {
      const p = getMediaPlugin();
      if (!p?.stopScreenShare) return { ok: true };
      return await p.stopScreenShare();
    },
    scanQr: async () => {
      const p = getMediaPlugin();
      if (!p?.scanQr) return null;
      const res = await p.scanQr();
      return res?.rawValue || null;
    }
  };

  // Wire Android hardware Back button smoothly across modals, calls, and chats
  const wireAndroidBack = () => {
    const capApp = getAppPlugin();
    if (!capApp?.addListener) return;
    capApp.addListener('backButton', ({ canGoBack }) => {
      if ($('#modalRoot')?.innerHTML.trim()) {
        closeModal?.();
        return;
      }
      if ($('#meetRoom') && !$('#meetRoom').classList.contains('hidden')) {
        if (typeof window.leaveMeetingRoom === 'function') window.leaveMeetingRoom();
        return;
      }
      if (S.infoOpen && typeof setInfoPaneVisibility === 'function') {
        setInfoPaneVisibility(false);
        return;
      }
      const vc = $('#view-chats');
      if (vc && !vc.classList.contains('hidden') && vc.classList.contains('convo-open')) {
        vc.classList.remove('convo-open');
        return;
      }
      if (S.view && S.view !== 'chats') {
        switchView('chats');
        return;
      }
      if (canGoBack) {
        window.history.back();
      } else {
        capApp.minimizeApp?.();
      }
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAndroidBack);
  } else {
    wireAndroidBack();
  }
})();

function renderQrSvgMarkup(text) {
  if (typeof window.qrcode !== 'function') {
    return `<div style="padding:24px;color:#111;font-weight:700">QR Engine Loading…</div>`;
  }
  const qr = window.qrcode(0, 'M');
  qr.addData(String(text));
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

function bufToB64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBuf(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function openQrPairingModal() {
  let pollTimer = null;
  let cancelled = false;
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
  const created = await fetch('/api/device-link/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pubJwk })
  }).then(r => r.json());
  if (!created?.sid) {
    toast(created?.error || 'Could not start QR pairing session', 'err');
    return;
  }

  const qrPayload = JSON.stringify({
    v: 1,
    type: 'zovio-link',
    sid: created.sid,
    server: window.location.origin,
    pubJwk
  });

  showModal('Link Device with Zovio QR', `
    <div class="qr-pair-modal">
      <div class="qr-pair-box">
        ${renderQrSvgMarkup(qrPayload)}
        <div class="qr-pair-logo-badge">
          <img src="/logo-64.png" width="24" height="24" style="border-radius:6px" alt="Zovio">
        </div>
      </div>
      <div id="qrPairStatus" class="pill amber">Waiting for your phone to scan…</div>
      <div class="qr-pair-steps">
        <b>How to sign in instantly:</b><br>
        1. Open <b>Zovio</b> on your Android phone<br>
        2. Tap your profile avatar &rarr; <b>Linked Devices</b><br>
        3. Tap <b>Link a Device (Scan QR)</b> and point at this screen
      </div>
    </div>
  `, () => {
    const closeBtn = $('#modalRoot .modal-close');
    const cleanup = () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
    closeBtn?.addEventListener('click', cleanup, { once: true });
    $('#modalRoot .modal-back')?.addEventListener('click', e => {
      if (e.target.classList.contains('modal-back')) cleanup();
    });

    pollTimer = setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/device-link/poll/${encodeURIComponent(created.sid)}`).then(r => r.json());
        if (res?.error) {
          clearInterval(pollTimer);
          const st = $('#qrPairStatus');
          if (st) { st.className = 'pill red'; st.textContent = res.error; }
          return;
        }
        if (res?.status === 'approved' && res.pubPhone && res.iv && res.ct) {
          clearInterval(pollTimer);
          const st = $('#qrPairStatus');
          if (st) { st.className = 'pill green'; st.textContent = 'Encrypted session received! Signing in…'; }

          const peerPub = await crypto.subtle.importKey(
            'jwk', res.pubPhone, { name: 'ECDH', namedCurve: 'P-256' }, false, []
          );
          const aesKey = await crypto.subtle.deriveKey(
            { name: 'ECDH', public: peerPub }, kp.privateKey,
            { name: 'AES-GCM', length: 256 }, false, ['decrypt']
          );
          const plainBuf = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: b64ToBuf(res.iv) }, aesKey, b64ToBuf(res.ct)
          );
          const bundle = JSON.parse(new TextDecoder().decode(plainBuf));
          closeModal();
          await establishSession(bundle.token, bundle.user, bundle.privJwk, bundle.vaultRaw);
          toast('Linked and signed in via Zovio QR!', 'ok');
        }
      } catch {}
    }, 1500);
  });
}

async function approvePairingQrPayload(rawText, onSuccess) {
  let parsed = null;
  try { parsed = JSON.parse(String(rawText || '').trim()); } catch {}
  if (!parsed || parsed.type !== 'zovio-link' || !parsed.sid || !parsed.pubJwk) {
    throw new Error('Not a valid Zovio pairing QR code');
  }
  const token = S.token || localStorage.getItem('fireupp.token');
  const privStr = localStorage.getItem('fireupp.privJwk');
  const vaultRaw = localStorage.getItem('fireupp.vaultRaw');
  if (!token || !privStr || !vaultRaw || !S.user) {
    throw new Error('Sign in on this device first before linking another device');
  }

  const kpPhone = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const pubPhone = await crypto.subtle.exportKey('jwk', kpPhone.publicKey);
  const desktopPub = await crypto.subtle.importKey(
    'jwk', parsed.pubJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: desktopPub }, kpPhone.privateKey,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payloadBytes = new TextEncoder().encode(JSON.stringify({
    token,
    privJwk: JSON.parse(privStr),
    vaultRaw,
    user: S.user
  }));
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, payloadBytes);
  const deviceLabel = navigator.userAgent.includes('Windows') ? 'Zovio Windows Desktop' : 'Zovio Web / Desktop';

  await api('/api/device-link/approve', {
    method: 'POST',
    body: {
      sid: parsed.sid,
      pubPhone,
      iv: bufToB64(iv),
      ct: bufToB64(ctBuf),
      deviceLabel
    }
  });
  toast('Device linked! Signing in on the other screen…', 'ok');
  onSuccess?.();
}

async function scanQrAndLinkDevice(onSuccess) {
  try {
    // 1. Prefer Native Android CameraX + MLKit Barcode Scanner when running in Zovio Android APK
    if (window.ZovioAndroid?.isAvailable?.() && window.Capacitor?.Plugins?.ZovioMedia?.scanQr) {
      const raw = await window.ZovioAndroid.scanQr();
      if (!raw) return; // user cancelled
      await approvePairingQrPayload(raw, onSuccess);
      return;
    }

    // 2. Fallback: Live web camera with native BarcodeDetector or paste prompt
    if ('BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia) {
      let camStream = null;
      let stopped = false;
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      showModal('Scan Zovio Linking QR', `
        <div class="col gap-m" style="align-items:center;text-align:center">
          <video id="webQrVideo" autoplay playsinline muted style="width:100%;max-width:340px;border-radius:16px;background:#000;aspect-ratio:1/1;object-fit:cover"></video>
          <div class="muted xs">Point your camera at the Zovio Desktop QR code…</div>
          <div class="row gap-s" style="width:100%">
            <input id="manualQrPaste" placeholder="Or paste pairing JSON…" style="flex:1">
            <button type="button" class="btn primary sm" id="manualQrApproveBtn">Link</button>
          </div>
        </div>
      `, async body => {
        const stopCam = () => {
          stopped = true;
          try { camStream?.getTracks().forEach(t => t.stop()); } catch {}
        };
        $('#modalRoot .modal-close')?.addEventListener('click', stopCam, { once: true });
        $('#manualQrApproveBtn', body).onclick = async () => {
          const val = $('#manualQrPaste', body).value.trim();
          if (!val) return;
          try {
            stopCam();
            closeModal();
            await approvePairingQrPayload(val, onSuccess);
          } catch (err) { toast(err.message, 'err'); }
        };
        try {
          camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const vid = $('#webQrVideo', body);
          vid.srcObject = camStream;
          const scanLoop = async () => {
            if (stopped || !vid.isConnected) return;
            try {
              if (vid.readyState >= 2) {
                const codes = await detector.detect(vid);
                if (codes.length && codes[0].rawValue) {
                  stopCam();
                  closeModal();
                  await approvePairingQrPayload(codes[0].rawValue, onSuccess);
                  return;
                }
              }
            } catch {}
            requestAnimationFrame(scanLoop);
          };
          requestAnimationFrame(scanLoop);
        } catch (err) {
          toast('Camera unavailable: ' + err.message, 'err');
        }
      });
      return;
    }

    // 3. Minimal manual fallback when camera BarcodeDetector is absent
    showModal('Paste Pairing Code', `
      <div class="col gap-m">
        <p class="muted xs">Paste the Zovio pairing payload to approve another device cleanly.</p>
        <textarea id="manualQrPayloadInput" rows="3" placeholder='{"v":1,"type":"zovio-link",...}'></textarea>
        <button type="button" class="btn primary" id="confirmManualQrLinkBtn">Approve Device Link</button>
      </div>
    `, body => {
      $('#confirmManualQrLinkBtn', body).onclick = async () => {
        try {
          await approvePairingQrPayload($('#manualQrPayloadInput', body).value, () => {
            closeModal();
            onSuccess?.();
          });
        } catch (err) { toast(err.message, 'err'); }
      };
    });
  } catch (err) {
    toast(err.message || 'QR linking failed', 'err');
  }
}

window.openQrPairingModal = openQrPairingModal;
window.scanQrAndLinkDevice = scanQrAndLinkDevice;
window.approvePairingQrPayload = approvePairingQrPayload;
