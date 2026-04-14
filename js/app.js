const App = {
  editingId: null,
  currentFolderId: null,
  currentView: 'qr-list',
  analyticsDays: 30,
  folders: [],
  themeStorageKey: 'qr-manager-theme',

  async bootstrap() {
    $('#loading').show();
    try {
      DB.init(); // decode apiUrl from base64
      await this._initApp();
    } catch (err) {
      console.error('Bootstrap error:', err);
      $('#loading-text').text('Error: ' + err.message).addClass('text-red-500');
    }
  },

  async _initApp() {
    try {
      // Cache base_url for QR redirect links — always correct on HTTPS static hosting
      DB._cachedBaseUrl = window.location.origin;

      this.bindEvents();
      this.updateThemeButtons();
      if (Auth.isLoggedIn()) {
        await this.showDashboard();
      } else {
        this.showLogin();
      }
    } catch (err) {
      $('#loading').hide();
      $('#loading-text').text('Error: ' + err.message).addClass('text-red-500');
      $('#loading').show();
    }
  },

  bindEvents() {
    // Login
    $('#login-form').on('submit', async e => {
      e.preventDefault();
      const user = $('#login-user').val().trim();
      const pass = $('#login-pass').val().trim();
      $('#login-error').hide();
      $('#btn-login').prop('disabled', true).text('Entrando...');
      try {
        const result = await Auth.login(user, pass);
        if (result) {
          await this.showDashboard();
        } else {
          $('#login-error').text('Usuario o password incorrectos').show();
        }
      } catch (err) {
        $('#login-error').text('Error: ' + err.message).show();
      } finally {
        $('#btn-login').prop('disabled', false).text('Entrar');
      }
    });

    // Logout
    $('#btn-logout').on('click', () => {
      Auth.logout();
      this.showLogin();
    });

    // New QR
    $('#btn-new-qr').on('click', () => this.openModal());

    // Save QR form
    $('#qr-form').on('submit', async e => {
      e.preventDefault();
      const name = $('#qr-name').val().trim();
      const url = $('#qr-url').val().trim();
      const expiresAt = $('#qr-expires').val() || null;
      const folderId = $('#qr-folder').val() || null;
      const maxScans = $('#qr-max-scans').val() || null;

      // Password handling
      let passwordHash;
      const passwordVal = $('#qr-password').val();
      const removePassword = $('#qr-remove-password').is(':checked');
      if (removePassword) {
        passwordHash = ''; // signal to clear
      } else if (passwordVal) {
        passwordHash = await Auth.hashPassword(passwordVal);
      }
      // undefined = don't change existing (for edits)

      if (!name || !url) return;
      const $btn = $('#btn-save-qr').prop('disabled', true).text('Guardando...');
      try {
        const user = Auth.currentUser();
        if (this.editingId) {
          await QR_CRUD.update(this.editingId, name, url, expiresAt, folderId, maxScans, passwordHash);
        } else {
          await QR_CRUD.create(user.id, name, url, expiresAt, folderId, maxScans, passwordHash || null);
        }
        this.closeModal();
        await this.renderList();
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        $btn.prop('disabled', false).text('Guardar');
      }
    });

    // Folder Events
    $('#btn-new-folder').on('click', () => this.openFolderModal());
    
    $('#folder-form').on('submit', async e => {
      e.preventDefault();
      const name = $('#folder-name').val().trim();
      const id = $('#folder-id').val();
      if (!name) return;
      const $btn = $('#btn-save-folder').prop('disabled', true).text('Guardando...');
      try {
        const user = Auth.currentUser();
        if (id) {
          await DB.updateFolder(id, name);
        } else {
          await DB.createFolder(user.id, name);
        }
        $('#folder-modal').hide();
        await this.renderFolders();
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        $btn.prop('disabled', false).text('Guardar');
      }
    });

    $('#folder-list').on('click', '.folder-item', e => {
      const id = $(e.currentTarget).data('id') || null;
      this.currentFolderId = id;
      this.renderFolders();
      this.renderList();
    });

    $('#folder-list').on('click', '.btn-edit-folder', e => {
      e.stopPropagation();
      const id = $(e.currentTarget).data('id');
      const folder = this.folders.find(f => String(f.id) === String(id));
      if (folder) this.openFolderModal(folder);
    });

    $('#folder-list').on('click', '.btn-delete-folder', async e => {
      e.stopPropagation();
      if (!confirm('¿Eliminar esta carpeta? Los QRs no se borrarán, quedarán sin carpeta.')) return;
      const id = $(e.currentTarget).data('id');
      try {
        await DB.deleteFolder(id);
        if (String(this.currentFolderId) === String(id)) this.currentFolderId = null;
        await this.renderFolders();
        await this.renderList();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Modals close
    $('#btn-cancel, #modal-backdrop').on('click', () => this.closeModal());
    $('#btn-cancel-folder, #folder-backdrop').on('click', () => $('#folder-modal').hide());
    $('#btn-close-detail, #detail-backdrop').on('click', () => $('#qr-detail').hide());

    // QR list actions (delegated)
    $('#qr-list').on('click', '.btn-view', async e => {
      await this.showDetail($(e.currentTarget).data('id'));
    });
    $('#qr-list').on('click', '.btn-edit', e => {
      this.openModal($(e.currentTarget).data('id'));
    });
    $('#qr-list').on('click', '.btn-delete', async e => {
      if (!confirm('Eliminar este codigo QR?')) return;
      const $btn = $(e.currentTarget).prop('disabled', true).text('...');
      try {
        await QR_CRUD.remove($(e.currentTarget).data('id'));
        await this.renderList();
      } catch (err) {
        alert('Error: ' + err.message);
        $btn.prop('disabled', false).text('Eliminar');
      }
    });
    $('#qr-list').on('click', '.btn-copy', e => {
      const url = $(e.currentTarget).data('url');
      navigator.clipboard.writeText(url).then(() => {
        const $b = $(e.currentTarget);
        const orig = $b.text();
        $b.text('Copiado!');
        setTimeout(() => $b.text(orig), 1500);
      });
    });

    // Change password
    $('#btn-change-pw').on('click', () => {
      $('#pw-current, #pw-new, #pw-confirm').val('');
      $('#pw-error, #pw-success').hide();
      $('#btn-save-pw').prop('disabled', false).text('Guardar');
      $('#password-modal').show();
      setTimeout(() => $('#pw-current').focus(), 50);
    });

    $('#password-form').on('submit', async e => {
      e.preventDefault();
      const current = $('#pw-current').val();
      const newPw = $('#pw-new').val();
      const confirm = $('#pw-confirm').val();
      $('#pw-error, #pw-success').hide();

      if (!newPw) {
        $('#pw-error').text('La nueva contraseña no puede estar vacia').show();
        return;
      }
      if (newPw !== confirm) {
        $('#pw-error').text('Las contraseñas nuevas no coinciden').show();
        return;
      }

      const $btn = $('#btn-save-pw').prop('disabled', true).text('Guardando...');
      try {
        const user = Auth.currentUser();
        await Auth.changePassword(user.id, current, newPw);
        $('#pw-success').text('Contraseña actualizada correctamente').show();
        setTimeout(() => $('#password-modal').hide(), 1500);
      } catch (err) {
        const msg = err.message === 'invalid current password'
          ? 'La contraseña actual es incorrecta'
          : 'Error: ' + err.message;
        $('#pw-error').text(msg).show();
      } finally {
        $btn.prop('disabled', false).text('Guardar');
      }
    });

    $('#btn-cancel-pw, #password-backdrop').on('click', () => $('#password-modal').hide());

    // QR detail copy
    $('#btn-copy-detail').on('click', function () {
      const url = $('#detail-redirect').text();
      navigator.clipboard.writeText(url).then(() => {
        const $b = $(this);
        $b.text('Copiado!');
        setTimeout(() => $b.text('Copiar enlace'), 1500);
      });
    });

    $(document).on('click', '.btn-theme-toggle', () => {
      this.toggleTheme();
      if (this.currentView === 'analytics') Analytics.reRender();
    });

    // Tabs
    $('#dashboard-tabs').on('click', '.tab-btn', e => {
      const tab = $(e.currentTarget).data('tab');
      this.switchTab(tab);
    });

    // Analytics range selector
    $('#view-analytics').on('click', '.btn-range', async e => {
      const days = $(e.currentTarget).data('days');
      this.analyticsDays = days;
      this._updateRangeButtons();
      await this.loadAnalytics(days);
    });

    // Analytics per-QR button
    $('#qr-list').on('click', '.btn-analytics', async e => {
      const id = $(e.currentTarget).data('id');
      this.switchTab('analytics');
      await this.loadAnalytics(this.analyticsDays, id);
    });

    $('#btn-download-svg').on('click', e => {
      const $btn = $(e.currentTarget);
      const qrUrl = $btn.data('qrUrl');
      if (!qrUrl) return;

      const originalText = $btn.text();
      $btn.prop('disabled', true).text('Generando...');

      try {
        const svg = QR_CRUD.generateSVG(qrUrl);
        const filename = this._svgFilename($btn.data('qrName'), $btn.data('qrCode'));
        this._downloadFile(filename, new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
        $btn.text('Descargado');
        setTimeout(() => $btn.prop('disabled', false).text(originalText), 1500);
      } catch (err) {
        $btn.prop('disabled', false).text(originalText);
        alert('Error exportando SVG: ' + err.message);
      }
    });

  },

  showLogin() {
    $('#loading').hide();
    $('#view-login').show();
    $('#view-dashboard').hide();
    $('#login-user').val('').focus();
    $('#login-pass').val('');
    $('#login-error').hide();
  },

  async showDashboard() {
    const user = Auth.currentUser();
    $('#loading').hide();
    $('#view-login').hide();
    $('#view-dashboard').show();
    $('#user-name').text(user.username);
    this.switchTab('qr-list');
    await this.renderFolders();
    await this.renderList();
  },

  switchTab(tab) {
    this.currentView = tab;
    this._updateTabs();
    if (tab === 'qr-list') {
      $('main').show();
      $('#view-analytics').hide();
    } else {
      $('main').hide();
      $('#view-analytics').show();
      this._updateRangeButtons();
      this.showAnalytics();
    }
  },

  _updateTabs() {
    $('.tab-btn').each((_, el) => {
      const $btn = $(el);
      const isActive = $btn.data('tab') === this.currentView;
      $btn.toggleClass('border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300', isActive);
      $btn.toggleClass('border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200', !isActive);
    });
  },

  _updateRangeButtons() {
    $('.btn-range').each((_, el) => {
      const $btn = $(el);
      const isActive = Number($btn.data('days')) === this.analyticsDays;
      $btn.toggleClass('bg-indigo-600 text-white dark:bg-indigo-500', isActive);
      $btn.toggleClass('bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700', !isActive);
    });
  },

  async showAnalytics() {
    await this.loadAnalytics(this.analyticsDays);
  },

  async loadAnalytics(days, qrId) {
    const user = Auth.currentUser();
    $('#analytics-loading').show();
    $('#analytics-kpis, #chart-line, #chart-pie, #chart-bar, #chart-top, #geo-countries, #geo-cities').empty();
    $('#analytics-top-section').toggle(!qrId);
    try {
      await Analytics.renderAll(user.id, qrId || null, days);
    } catch (err) {
      console.error('Analytics error:', err);
      $('#chart-line').html('<p class="text-sm text-red-500 text-center py-4">Error cargando analiticas</p>');
    } finally {
      $('#analytics-loading').hide();
    }
  },

  async renderFolders() {
    const user = Auth.currentUser();
    const $list = $('#folder-list').empty();
    const $select = $('#qr-folder').empty().append('<option value="">Sin carpeta</option>');
    
    try {
      this.folders = await DB.listFolders(user.id);
      
      // All folders item
      $list.append(this._folderHtml(null, 'Todos los códigos', !this.currentFolderId));
      
      this.folders.forEach(f => {
        $list.append(this._folderHtml(f.id, f.name, String(this.currentFolderId) === String(f.id)));
        $select.append(`<option value="${f.id}">${this.esc(f.name)}</option>`);
      });

      const activeFolder = this.folders.find(f => String(f.id) === String(this.currentFolderId));
      $('#current-folder-title').text(activeFolder ? activeFolder.name : 'Todos los códigos');
      
    } catch (err) {
      console.error('Error rendering folders:', err);
    }
  },

  _folderHtml(id, name, active) {
    const activeClass = active
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200'
      : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800';
    let actions = '';
    if (id) {
      actions = `
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button class="btn-edit-folder p-1 hover:text-indigo-600 dark:hover:text-indigo-300" data-id="${id}">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button class="btn-delete-folder p-1 hover:text-red-600 dark:hover:text-red-300" data-id="${id}">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16"/></svg>
          </button>
        </div>
      `;
    }

    return `
      <div class="folder-item group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${activeClass}" data-id="${id || ''}">
        <span class="truncate">${this.esc(name)}</span>
        ${actions}
      </div>
    `;
  },

  async renderList() {
    const user = Auth.currentUser();
    const $list = $('#qr-list').html(
      '<div class="text-center py-8 text-gray-400 text-sm dark:text-slate-500">Cargando...</div>'
    );
    try {
      let items = await QR_CRUD.list(user.id);
      
      // Filter by folder if selected
      if (this.currentFolderId) {
        items = items.filter(item => String(item.folder_id) === String(this.currentFolderId));
      }

      $list.empty();

      if (!items.length) {
        $list.html(
          '<div class="text-center py-12 text-gray-400 dark:text-slate-500">' +
          '<svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>' +
          '</svg>' +
          '<p class="text-lg font-medium text-gray-500 dark:text-slate-300">No hay codigos QR</p>' +
          '<p class="text-sm mt-1">Crea tu primer codigo QR con el boton de arriba</p>' +
          '</div>'
        );
        return;
      }

      items.forEach(item => {
        const rUrl = QR_CRUD.redirectUrl(item.short_code);
        const isExpired = item.expires_at && new Date(item.expires_at).getTime() < new Date().setHours(0,0,0,0);
        const expLabel = item.expires_at
          ? `<p class="text-xs ${isExpired ? 'text-red-500 font-bold dark:text-red-300' : 'text-gray-400 dark:text-slate-500'} mt-1">Expiracion: ${item.expires_at.split('T')[0]}</p>`
          : '';

        const maxScans = Number(item.max_scans || 0);
        const currentScans = Number(item.scan_count || 0);
        const limitReached = maxScans > 0 && currentScans >= maxScans;

        let scanLabel = `<p class="text-xs text-gray-400 mt-1 dark:text-slate-500">Escaneos: <span class="font-medium ${limitReached ? 'text-red-500 dark:text-red-300' : 'text-indigo-600 dark:text-indigo-300'}">${currentScans}</span>`;
        if (maxScans > 0) scanLabel += ` / ${maxScans}`;
        scanLabel += '</p>';

        const lockIcon = item.password_hash
          ? ' <svg class="w-4 h-4 inline-block align-text-bottom text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>'
          : '';

        $list.append(
          '<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">' +
            '<div class="flex-1 min-w-0">' +
              '<h3 class="font-semibold text-gray-900 truncate dark:text-slate-100">' + this.esc(item.name) + lockIcon + '</h3>' +
              '<p class="text-sm text-gray-500 truncate mt-0.5 dark:text-slate-400">' + this.esc(item.target_url) + '</p>' +
              '<p class="text-xs text-gray-400 mt-1 dark:text-slate-500">Codigo: <span class="font-mono">' + item.short_code + '</span></p>' +
              scanLabel +
              expLabel +
            '</div>' +
            '<div class="flex flex-wrap gap-2 flex-shrink-0">' +
              '<button class="btn-view px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20" data-id="' + item.id + '">Ver QR</button>' +
              '<button class="btn-analytics px-3 py-1.5 text-xs font-medium bg-violet-50 text-violet-700 rounded-md hover:bg-violet-100 transition dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20" data-id="' + item.id + '">Analiticas</button>' +
              '<button class="btn-copy px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20" data-url="' + this.esc(rUrl) + '">Copiar URL</button>' +
              '<button class="btn-edit px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20" data-id="' + item.id + '">Editar</button>' +
              '<button class="btn-delete px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20" data-id="' + item.id + '">Eliminar</button>' +
            '</div>' +
          '</div>'
        );
      });
    } catch (err) {
      $list.html('<div class="text-center py-8 text-red-500 text-sm dark:text-red-300">Error cargando QRs: ' + this.esc(err.message) + '</div>');
    }
  },

  async showDetail(id) {
    const item = await QR_CRUD.get(id);
    if (!item) return;
    const rUrl = QR_CRUD.redirectUrl(item.short_code);
    $('#detail-name').text(item.name);
    $('#detail-url').text(item.target_url).attr('href', item.target_url);
    $('#detail-redirect').text(rUrl);
    $('#detail-code').text(item.short_code);
    const $qr = $('#detail-qr').empty();
    new QRCode($qr[0], { text: rUrl, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
    $('#btn-download-svg')
      .data('qrUrl', rUrl)
      .data('qrName', item.name)
      .data('qrCode', item.short_code)
      .prop('disabled', false)
      .text('Descargar SVG');
    $('#qr-detail').show();
  },

  openModal(id) {
    this.editingId = id || null;
    $('#qr-password').val('');
    $('#qr-remove-password').prop('checked', false);
    if (id) {
      QR_CRUD.get(id).then(item => {
        if (!item) return;
        $('#modal-title').text('Editar codigo QR');
        $('#qr-name').val(item.name);
        $('#qr-url').val(item.target_url);
        $('#qr-expires').val(item.expires_at ? item.expires_at.split('T')[0] : '');
        $('#qr-folder').val(item.folder_id || '');
        $('#qr-max-scans').val(item.max_scans || '');
        $('#qr-password').attr('placeholder', item.password_hash ? 'Dejar vacío para mantener la actual' : 'Dejar vacío para acceso libre');
        $('#qr-password-status').toggle(!!item.password_hash);
      });
    } else {
      $('#modal-title').text('Nuevo codigo QR');
      $('#qr-name').val('');
      $('#qr-url').val('');
      $('#qr-expires').val('');
      $('#qr-folder').val(this.currentFolderId || '');
      $('#qr-max-scans').val('');
      $('#qr-password').attr('placeholder', 'Dejar vacío para acceso libre');
      $('#qr-password-status').hide();
    }
    $('#qr-modal').show();
    setTimeout(() => $('#qr-name').focus(), 50);
  },

  closeModal() {
    $('#qr-modal').hide();
    this.editingId = null;
  },

  openFolderModal(folder = null) {
    if (folder) {
      $('#folder-modal-title').text('Editar carpeta');
      $('#folder-id').val(folder.id);
      $('#folder-name').val(folder.name);
    } else {
      $('#folder-modal-title').text('Nueva carpeta');
      $('#folder-id').val('');
      $('#folder-name').val('');
    }
    $('#folder-modal').show();
    setTimeout(() => $('#folder-name').focus(), 50);
  },

  esc(str) {
    if (str === null || str === undefined) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  },

  _svgFilename(name, shortCode) {
    const base = String(name || shortCode || 'qr-code')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    return (base || 'qr-code') + '.svg';
  },

  _downloadFile(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  },

  isDarkTheme() {
    return document.documentElement.classList.contains('dark');
  },

  toggleTheme() {
    const nextTheme = this.isDarkTheme() ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    try {
      localStorage.setItem(this.themeStorageKey, nextTheme);
    } catch (_) {}
    this.updateThemeButtons();
  },

  updateThemeButtons() {
    const isDark = this.isDarkTheme();
    const icon = isDark
      ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>'
      : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646a9 9 0 1011.708 11.708z"/></svg>';
    const label = isDark ? 'Modo claro' : 'Modo oscuro';

    $('.btn-theme-toggle').each((_, el) => {
      const $btn = $(el);
      $btn.attr('aria-pressed', String(isDark));
      $btn.find('.theme-icon').html(icon);
      $btn.find('.theme-label').text(label);
    });
  }
};

$(async () => { await App.bootstrap(); });
