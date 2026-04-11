const Auth = {
  async hashPassword(plain) {
    const data = new TextEncoder().encode(plain);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  async login(username, password) {
    const hash = await this.hashPassword(password);
    const data = await DB._post({ action: 'login', username, password_hash: hash });
    if (data.success && data.user) {
      sessionStorage.setItem('currentUser', JSON.stringify(data.user));
      return data.user;
    }
    return null;
  },

  logout() {
    sessionStorage.removeItem('currentUser');
  },

  currentUser() {
    const s = sessionStorage.getItem('currentUser');
    return s ? JSON.parse(s) : null;
  },

  isLoggedIn() {
    return !!this.currentUser();
  }
};
