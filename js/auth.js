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
  },

  async changePassword(userId, oldPassword, newPassword) {
    const old_password_hash = await this.hashPassword(oldPassword);
    const new_password_hash = await this.hashPassword(newPassword);
    const data = await DB._post({
      action: 'change_password',
      user_id: userId,
      old_password_hash,
      new_password_hash
    });
    if (!data.success) throw new Error(data.error);
    return data;
  }
};
