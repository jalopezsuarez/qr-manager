// DB — Google Apps Script backend adapter
// Same public API as the previous sql.js version.

const DB = {
  apiUrl: null,

  init() {
    const stored = localStorage.getItem('gs_api_url');
    if (stored) this.apiUrl = stored;
    // apiUrl can be set later via DB.setApiUrl() from the config modal
  },

  setApiUrl(url) {
    this.apiUrl = url.replace(/\/+$/, '');
    localStorage.setItem('gs_api_url', this.apiUrl);
  },

  hasApiUrl() {
    return !!this.apiUrl;
  },

  async _post(body) {
    if (!this.apiUrl) throw new Error('API URL no configurada. Click en el engranaje para configurarla.');
    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // avoid CORS preflight
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!data.success && data.error) throw new Error(data.error);
    return data;
  },

  async _get(params) {
    if (!this.apiUrl) throw new Error('API URL no configurada.');
    const url = new URL(this.apiUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!data.success && data.error) throw new Error(data.error);
    return data;
  },

  // Seed default admin user if not exists
  async seedIfNeeded(passwordHash) {
    await this._post({ action: 'seed_user', username: 'admin', password_hash: passwordHash });
  },

  async needsSeed() {
    // Always attempt seed — Apps Script handles dedup
    return true;
  },

  async getSetting(key) {
    try {
      const data = await this._get({ action: 'get_setting', key });
      return data.value;
    } catch (_) {
      return null;
    }
  },

  async setSetting(key, value) {
    await this._post({ action: 'set_setting', key, value });
  },

  deployId() {
    if (!this.apiUrl) return null;
    const match = this.apiUrl.match(/\/macros\/s\/([^/]+)\//);
    return match ? match[1] : null;
  }
};
