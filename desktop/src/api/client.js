const BASE_URL = 'https://zovio.up.railway.app';
const WS_URL = 'wss://zovio.up.railway.app';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('fireupp_token') || null;
    this.user = JSON.parse(localStorage.getItem('fireupp_user') || 'null');
    this.ws = null;
    this.wsListeners = new Set();
  }

  setSession(token, user) {
    this.token = token;
    this.user = user;
    if (token) {
      localStorage.setItem('fireupp_token', token);
      localStorage.setItem('fireupp_user', JSON.stringify(user));
      this.connectWS();
    } else {
      localStorage.removeItem('fireupp_token');
      localStorage.removeItem('fireupp_user');
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }
  }

  async fetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
    }

    return res.json().catch(() => ({}));
  }

  connectWS() {
    if (!this.token || this.ws) return;
    try {
      this.ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(this.token)}`);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.wsListeners.forEach(listener => listener(data));
        } catch (e) {
          console.warn('[WS Parse Err]', e);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.token) {
          setTimeout(() => this.connectWS(), 2500);
        }
      };
    } catch (e) {
      console.warn('[WS Connect Err]', e);
    }
  }

  sendWS(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  onWSMessage(callback) {
    this.wsListeners.add(callback);
    return () => this.wsListeners.delete(callback);
  }
}

export const api = new ApiClient();
