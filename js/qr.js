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

  async create(userId, name, targetUrl, expiresAt = null, folderId = null, maxScans = null) {
    const code = await this._uniqueCode();
    const data = await DB._post({ action: 'create_qr', user_id: userId, name, target_url: targetUrl, short_code: code, expires_at: expiresAt, folder_id: folderId, max_scans: maxScans });
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

  async update(id, name, targetUrl, expiresAt = null, folderId = null, maxScans = null) {
    const data = await DB._post({ action: 'update_qr', id, name, target_url: targetUrl, expires_at: expiresAt, folder_id: folderId, max_scans: maxScans });
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
  },

  generateSVG(text, size = 220) {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;';
    document.body.appendChild(container);

    try {
      new QRCode(container, {
        text,
        width: size,
        height: size,
        correctLevel: QRCode.CorrectLevel.M,
        useSVG: true
      });

      const svgNode = container.querySelector('svg');
      if (svgNode) {
        if (!svgNode.getAttribute('xmlns')) {
          svgNode.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        if (!svgNode.getAttribute('viewBox')) {
          svgNode.setAttribute('viewBox', `0 0 ${size} ${size}`);
        }
        if (!svgNode.getAttribute('shape-rendering')) {
          svgNode.setAttribute('shape-rendering', 'crispEdges');
        }
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + svgNode.outerHTML;
      }

      const canvas = container.querySelector('canvas');
      if (canvas) {
        return this._canvasToSVG(canvas);
      }

      const table = container.querySelector('table');
      if (table) {
        return this._tableToSVG(table);
      }

      throw new Error('No se pudo generar una representación del QR para exportar');
    } finally {
      container.remove();
    }
  },

  _canvasToSVG(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('No se pudo leer el canvas del QR');
    }

    const width = canvas.width;
    const height = canvas.height;
    const data = ctx.getImageData(0, 0, width, height).data;
    const parts = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
      `<rect width="${width}" height="${height}" fill="#fff"/>`
    ];

    for (let y = 0; y < height; y++) {
      let runStart = -1;
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const alpha = data[offset + 3];
        const brightness = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
        const dark = alpha > 127 && brightness < 128;

        if (dark && runStart === -1) {
          runStart = x;
        }

        const runEnded = runStart !== -1 && (!dark || x === width - 1);
        if (runEnded) {
          const end = dark && x === width - 1 ? x + 1 : x;
          parts.push(`<rect x="${runStart}" y="${y}" width="${end - runStart}" height="1" fill="#000"/>`);
          runStart = -1;
        }
      }
    }

    parts.push('</svg>');
    return parts.join('\n');
  },

  _tableToSVG(table) {
    const rows = Array.from(table.rows || []);
    if (!rows.length || !rows[0].cells.length) {
      throw new Error('No se pudo leer la tabla del QR');
    }

    const height = rows.length;
    const width = rows[0].cells.length;
    const parts = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
      `<rect width="${width}" height="${height}" fill="#fff"/>`
    ];

    rows.forEach((row, y) => {
      Array.from(row.cells).forEach((cell, x) => {
        const bg = window.getComputedStyle(cell).backgroundColor;
        if (bg !== 'rgb(255, 255, 255)' && bg !== 'rgba(0, 0, 0, 0)') {
          parts.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="#000"/>`);
        }
      });
    });

    parts.push('</svg>');
    return parts.join('\n');
  }
};
