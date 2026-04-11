const App = {
  editingId: null,

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
      if (Auth.isLoggedIn()) {
        this.showDashboard();
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
          this.showDashboard();
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
      if (!name || !url) return;
      const $btn = $('#btn-save-qr').prop('disabled', true).text('Guardando...');
      try {
        const user = Auth.currentUser();
        if (this.editingId) {
          await QR_CRUD.update(this.editingId, name, url);
        } else {
          await QR_CRUD.create(user.id, name, url);
        }
        this.closeModal();
        await this.renderList();
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        $btn.prop('disabled', false).text('Guardar');
      }
    });

    // Modals close
    $('#btn-cancel, #modal-backdrop').on('click', () => this.closeModal());
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
        await QR_CRUD.remove($(e.currentTarget).data('id') || $btn.data('id'));
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

    // QR detail copy
    $('#btn-copy-detail').on('click', function () {
      const url = $('#detail-redirect').text();
      navigator.clipboard.writeText(url).then(() => {
        const $b = $(this);
        $b.text('Copiado!');
        setTimeout(() => $b.text('Copiar enlace'), 1500);
      });
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

  showDashboard() {
    const user = Auth.currentUser();
    $('#loading').hide();
    $('#view-login').hide();
    $('#view-dashboard').show();
    $('#user-name').text(user.username);
    this.renderList();
  },

  async renderList() {
    const user = Auth.currentUser();
    const $list = $('#qr-list').html(
      '<div class="text-center py-8 text-gray-400 text-sm">Cargando...</div>'
    );
    try {
      const items = await QR_CRUD.list(user.id);
      $list.empty();

      if (!items.length) {
        $list.html(
          '<div class="text-center py-12 text-gray-400">' +
          '<svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>' +
          '</svg>' +
          '<p class="text-lg font-medium">No hay codigos QR</p>' +
          '<p class="text-sm mt-1">Crea tu primer codigo QR con el boton de arriba</p>' +
          '</div>'
        );
        return;
      }

      items.forEach(item => {
        const rUrl = QR_CRUD.redirectUrl(item.short_code);
        $list.append(
          '<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">' +
            '<div class="flex-1 min-w-0">' +
              '<h3 class="font-semibold text-gray-900 truncate">' + this.esc(item.name) + '</h3>' +
              '<p class="text-sm text-gray-500 truncate mt-0.5">' + this.esc(item.target_url) + '</p>' +
              '<p class="text-xs text-gray-400 mt-1">Codigo: <span class="font-mono">' + item.short_code + '</span></p>' +
            '</div>' +
            '<div class="flex flex-wrap gap-2 flex-shrink-0">' +
              '<button class="btn-view px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition" data-id="' + item.id + '">Ver QR</button>' +
              '<button class="btn-copy px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition" data-url="' + this.esc(rUrl) + '">Copiar URL</button>' +
              '<button class="btn-edit px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition" data-id="' + item.id + '">Editar</button>' +
              '<button class="btn-delete px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition" data-id="' + item.id + '">Eliminar</button>' +
            '</div>' +
          '</div>'
        );
      });
    } catch (err) {
      $list.html('<div class="text-center py-8 text-red-500 text-sm">Error cargando QRs: ' + this.esc(err.message) + '</div>');
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
    $('#qr-detail').show();
  },

  openModal(id) {
    this.editingId = id || null;
    if (id) {
      QR_CRUD.get(id).then(item => {
        if (!item) return;
        $('#modal-title').text('Editar codigo QR');
        $('#qr-name').val(item.name);
        $('#qr-url').val(item.target_url);
      });
    } else {
      $('#modal-title').text('Nuevo codigo QR');
      $('#qr-name').val('');
      $('#qr-url').val('');
    }
    $('#qr-modal').show();
    setTimeout(() => $('#qr-name').focus(), 50);
  },

  closeModal() {
    $('#qr-modal').hide();
    this.editingId = null;
  },


  esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};

$(async () => { await App.bootstrap(); });
