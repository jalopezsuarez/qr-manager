// DB — Google Apps Script backend adapter
// API URL embedded in base64 for zero-config deployment

const DB = {
  // Base64-encoded API URL (decode via atob())
  _API_B64: 'aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J6VU1mZHlnSm90QzljUDJ2QW9kamh3UENSMWw3M3BvQlNhLXg4OEFsZkplQmd5QzFZWWVOWnl0TWdoaWRZS2lJYTkvZXhlYw==',

  apiUrl: null,

  init() {
    // Decode base64 API URL
    this.apiUrl = atob(this._API_B64);
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

  // Folders
  async listFolders(userId) {
    const data = await this._post({ action: 'list_folders', user_id: userId });
    return data.items || [];
  },

  async createFolder(userId, name) {
    const data = await this._post({ action: 'create_folder', user_id: userId, name });
    return data.item;
  },

  async updateFolder(id, name) {
    const data = await this._post({ action: 'update_folder', id, name });
    return data.item;
  },

  async deleteFolder(id) {
    await this._post({ action: 'delete_folder', id });
  },

  deployId() {
    if (!this.apiUrl) return null;
    const match = this.apiUrl.match(/\/macros\/s\/([^/]+)\//);
    return match ? match[1] : null;
  }
};
