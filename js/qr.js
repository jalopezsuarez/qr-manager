const QR_CRUD = {
  _generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[arr[i] % chars.length];
    return code;
  },

  async _uniqueCode() {
    let code, exists = true;
    while (exists) {
      code = this._generateCode();
      try {
        const data = await DB._post({ action: 'get_qr_by_code', short_code: code });
        exists = data.success && data.item;
      } catch (_) {
        exists = false;
      }
    }
    return code;
  },

  async create(userId, name, targetUrl) {
    const code = await this._uniqueCode();
    const data = await DB._post({ action: 'create_qr', user_id: userId, name, target_url: targetUrl, short_code: code });
    return data.item;
  },

  async list(userId) {
    const data = await DB._post({ action: 'list_qr', user_id: userId });
    return data.items || [];
  },

  async get(id) {
    const data = await DB._post({ action: 'get_qr', id });
    return data.item || null;
  },

  async getByCode(shortCode) {
    const data = await DB._post({ action: 'get_qr_by_code', short_code: shortCode });
    return data.item || null;
  },

  async update(id, name, targetUrl) {
    const data = await DB._post({ action: 'update_qr', id, name, target_url: targetUrl });
    return data.item;
  },

  async remove(id) {
    await DB._post({ action: 'delete_qr', id });
  },

  redirectUrl(shortCode) {
    let baseUrl = DB._cachedBaseUrl || window.location.origin;

    // Handle GitHub Pages: if pathname is /repo-name/..., include it
    if (window.location.pathname && window.location.pathname !== '/') {
      const path = window.location.pathname.replace(/\/$/, '').split('/')[1]; // get /repo-name
      if (path && !baseUrl.includes(path)) {
        baseUrl = baseUrl + '/' + path;
      }
    }

    baseUrl = baseUrl.replace(/\/+$/, '');
    const deployId = DB.deployId();

    // New compressed format: ?q={deployId}{code}
    if (deployId) {
      return baseUrl + '/r?q=' + deployId + shortCode;
    }

    // Fallback to old format if deployId not available
    const params = new URLSearchParams({ code: shortCode });
    if (DB.apiUrl) params.set('api', DB.apiUrl);
    return baseUrl + '/r?' + params.toString();
  }
};
