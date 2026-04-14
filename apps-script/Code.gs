// QR Manager — Google Apps Script API
// Deploy as Web App: Execute as Me, Access: Anyone
// ─────────────────────────────────────────────────

const SS = SpreadsheetApp.getActiveSpreadsheet();

// ── Helpers ──────────────────────────────────────

function sheet(name) {
  let s = SS.getSheetByName(name);
  if (!s) {
    s = SS.insertSheet(name);
    if (name === 'folders') {
      s.appendRow(['id', 'user_id', 'name', 'created_at']);
    }
    if (name === 'scan_logs') {
      s.appendRow(['id', 'qr_id', 'user_id', 'short_code', 'timestamp', 'device_type', 'browser', 'referer', 'country', 'city', 'latitude', 'longitude']);
    }
  }
  return s;
}

function sheetData(name) {
  const s = sheet(name);
  let rows = s.getDataRange().getValues();
  let headers = rows[0];

  // Ensure schema consistency
  if (name === 'qr_codes') {
    let modified = false;
    let expiresIdx = headers.indexOf('expires_at');
    if (expiresIdx === -1) {
      expiresIdx = 7; // Column H
      s.getRange(1, expiresIdx + 1).setValue('expires_at');
      modified = true;
    }
    let folderIdx = headers.indexOf('folder_id');
    if (folderIdx === -1) {
      folderIdx = 8; // Column I
      s.getRange(1, folderIdx + 1).setValue('folder_id');
      modified = true;
    }
    let maxScansIdx = headers.indexOf('max_scans');
    if (maxScansIdx === -1) {
      maxScansIdx = 9; // Column J
      s.getRange(1, maxScansIdx + 1).setValue('max_scans');
      modified = true;
    }
    let scanCountIdx = headers.indexOf('scan_count');
    if (scanCountIdx === -1) {
      scanCountIdx = 10; // Column K
      s.getRange(1, scanCountIdx + 1).setValue('scan_count');
      modified = true;
    }
    let passwordHashIdx = headers.indexOf('password_hash');
    if (passwordHashIdx === -1) {
      passwordHashIdx = 11; // Column L
      s.getRange(1, passwordHashIdx + 1).setValue('password_hash');
      modified = true;
    }
    if (modified) {
      rows = s.getDataRange().getValues();
      headers = rows[0];
    }
  }

  // Ensure scan_logs schema consistency
  if (name === 'scan_logs') {
    let modified = false;
    if (headers.indexOf('country') === -1) {
      s.getRange(1, 9).setValue('country');
      modified = true;
    }
    if (headers.indexOf('city') === -1) {
      s.getRange(1, 10).setValue('city');
      modified = true;
    }
    if (headers.indexOf('latitude') === -1) {
      s.getRange(1, 11).setValue('latitude');
      modified = true;
    }
    if (headers.indexOf('longitude') === -1) {
      s.getRange(1, 12).setValue('longitude');
      modified = true;
    }
    if (modified) {
      rows = s.getDataRange().getValues();
      headers = rows[0];
    }
  }

  if (rows.length <= 1) return [];

  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function nextId(sheetName) {
  const s = sheet(sheetName);
  const lastRow = s.getLastRow();
  if (lastRow <= 1) return 1;
  const ids = s.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(Number);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function now() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(msg) {
  return json({ success: false, error: msg });
}

// ── Scan Logging ─────────────────────────────────

function parseDeviceType(ua) {
  if (!ua) return 'Unknown';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function parseBrowser(ua) {
  if (!ua) return 'Unknown';
  if (/edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

function logScan(qrId, userId, shortCode, userAgent, referer, country, city, lat, lon) {
  const s = sheet('scan_logs');
  const id = nextId('scan_logs');
  s.appendRow([
    id, qrId, userId, shortCode, now(),
    parseDeviceType(userAgent),
    parseBrowser(userAgent),
    referer || '',
    country || 'Unknown',
    city || '',
    lat || 0,
    lon || 0
  ]);

  // FIFO cleanup: limit 5000 per user (check only when sheet is large)
  if (s.getLastRow() > 5500) {
    const allRows = s.getDataRange().getValues();
    const userRowIndices = [];
    for (let i = 1; i < allRows.length; i++) {
      if (String(allRows[i][2]) === String(userId)) {
        userRowIndices.push(i + 1);
      }
    }
    if (userRowIndices.length > 5000) {
      const toDelete = userRowIndices.slice(0, userRowIndices.length - 5000).reverse();
      toDelete.forEach(idx => s.deleteRow(idx));
    }
  }
}

// ── doGet — health check & redirect lookup ────────

function doGet(e) {
  const action = e.parameter.action;

  // Public redirect: ?action=redirect&code=XXXXXXXX
  if (action === 'redirect') {
    const code = e.parameter.code;
    if (!code) return err('missing code');
    const s = sheet('qr_codes');
    const rows = sheetData('qr_codes');
    const idx = rows.findIndex(r => r.short_code === code);
    if (idx === -1) return err('not found');
    
    const row = rows[idx];
    if (!row.target_url) return err('not found');

    // Check expiration (normalized to end of day)
    if (row.expires_at) {
      const expiresDate = new Date(row.expires_at);
      // Set to 23:59:59 of the expiration day
      expiresDate.setHours(23, 59, 59, 999);
      
      if (new Date() > expiresDate) {
        return json({ success: false, error: 'expired', message: 'Este código QR ha expirado' });
      }
    }

    // Check scan limit
    if (row.max_scans && Number(row.max_scans) > 0) {
      const currentScans = Number(row.scan_count || 0);
      if (currentScans >= Number(row.max_scans)) {
        return json({ success: false, error: 'limit_reached', message: 'Se ha alcanzado el límite de escaneos para este código' });
      }
    }

    // Password-protected: require verification via POST before revealing target
    if (row.password_hash) {
      return json({ success: true, password_protected: true });
    }

    // Increment scan count (Column K = 11)
    const rowIdx = idx + 2;
    const currentCount = Number(s.getRange(rowIdx, 11).getValue() || 0);
    s.getRange(rowIdx, 11).setValue(currentCount + 1);

    // Log scan
    const ua = e.parameter.ua ? decodeURIComponent(e.parameter.ua) : '';
    const ref = e.parameter.ref ? decodeURIComponent(e.parameter.ref) : '';
    const country = e.parameter.country ? decodeURIComponent(e.parameter.country) : 'Unknown';
    const city = e.parameter.city ? decodeURIComponent(e.parameter.city) : '';
    const lat = e.parameter.lat ? Number(e.parameter.lat) : 0;
    const lon = e.parameter.lon ? Number(e.parameter.lon) : 0;
    logScan(row.id, row.user_id, code, ua, ref, country, city, lat, lon);

    return json({ success: true, target_url: row.target_url });
  }

  // get_setting via GET
  if (action === 'get_setting') {
    const key = e.parameter.key;
    const rows = sheetData('settings');
    const row = rows.find(r => r.key === key);
    return json({ success: true, value: row ? row.value : null });
  }

  return json({ success: true, message: 'QR Manager API v1' });
}

// ── doPost — all write + read operations ──────────

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (_) {
    return err('invalid JSON');
  }

  const { action } = body;

  if (action === 'login')           return login(body);
  if (action === 'list_qr')         return listQR(body);
  if (action === 'get_qr')          return getQR(body);
  if (action === 'get_qr_by_code')  return getQRByCode(body);
  if (action === 'create_qr')       return createQR(body);
  if (action === 'update_qr')       return updateQR(body);
  if (action === 'delete_qr')       return deleteQR(body);
  if (action === 'get_setting')     return getSetting(body);
  if (action === 'set_setting')     return setSetting(body);
  if (action === 'change_password') return changePassword(body);
  if (action === 'verify_qr_password') return verifyQRPassword(body);

  // Folders
  if (action === 'list_folders')    return listFolders(body);
  if (action === 'create_folder')   return createFolder(body);
  if (action === 'update_folder')   return updateFolder(body);
  if (action === 'delete_folder')   return deleteFolder(body);

  // Analytics
  if (action === 'get_scan_stats')  return getScanStats(body);
  if (action === 'get_top_qr')      return getTopQR(body);
  if (action === 'get_scan_logs')   return getScanLogs(body);
  if (action === 'get_geo_stats')   return getGeoStats(body);

  return err('unknown action: ' + action);
}

// ── Auth ──────────────────────────────────────────

function login(body) {
  const { username, password_hash } = body;
  if (!username || !password_hash) return err('missing fields');

  const s = sheet('users');
  const rows = sheetData('users');
  const existing = rows.find(r => r.username === username);

  if (!existing) {
    // Auto-register: create user if doesn't exist
    const id = nextId('users');
    s.appendRow([id, username, password_hash, now()]);
    return json({ success: true, user: { id, username }, created: true });
  }

  // Validate password
  if (String(existing.password_hash) !== String(password_hash)) {
    return json({ success: false, error: 'invalid credentials' });
  }

  return json({ success: true, user: { id: existing.id, username: existing.username }, created: false });
}

// ── QR CRUD ───────────────────────────────────────

function listQR(body) {
  const { user_id } = body;
  if (!user_id) return err('missing user_id');

  const rows = sheetData('qr_codes');
  const items = rows
    .filter(r => String(r.user_id) === String(user_id))
    .sort((a, b) => b.created_at > a.created_at ? 1 : -1);

  return json({ success: true, items });
}

function getQR(body) {
  const { id } = body;
  if (!id) return err('missing id');

  const rows = sheetData('qr_codes');
  const item = rows.find(r => String(r.id) === String(id));
  if (!item) return json({ success: false, error: 'not found' });

  return json({ success: true, item });
}

function getQRByCode(body) {
  const { short_code } = body;
  if (!short_code) return err('missing short_code');

  const rows = sheetData('qr_codes');
  const item = rows.find(r => r.short_code === short_code);
  if (!item) return json({ success: false, error: 'not found' });

  return json({ success: true, item });
}

function createQR(body) {
  const { user_id, name, target_url, short_code, expires_at, folder_id, max_scans, password_hash } = body;
  if (!user_id || !name || !target_url || !short_code) return err('missing fields');

  const s = sheet('qr_codes');
  const id = nextId('qr_codes');
  const ts = now();
  s.appendRow([id, user_id, name, target_url, short_code, ts, ts, expires_at || '', folder_id || '', max_scans || '', 0, password_hash || '']);

  return json({ success: true, item: { id, user_id, name, target_url, short_code, created_at: ts, updated_at: ts, expires_at: expires_at || null, folder_id: folder_id || null, max_scans: max_scans || null, scan_count: 0, password_hash: password_hash || '' } });
}

function updateQR(body) {
  const { id, name, target_url, expires_at, folder_id, max_scans } = body;
  if (!id || !name || !target_url) return err('missing fields');

  const s = sheet('qr_codes');
  const rows = sheetData('qr_codes');
  const idx = rows.findIndex(r => String(r.id) === String(id));
  if (idx === -1) return err('not found');

  const rowIdx = idx + 2;
  s.getRange(rowIdx, 3).setValue(name);
  s.getRange(rowIdx, 4).setValue(target_url);
  s.getRange(rowIdx, 7).setValue(now());
  s.getRange(rowIdx, 8).setValue(expires_at || '');
  s.getRange(rowIdx, 9).setValue(folder_id || '');
  s.getRange(rowIdx, 10).setValue(max_scans || '');

  // password_hash: only update if explicitly sent in body
  // '' = remove protection, hash string = set/change, absent = keep existing
  if ('password_hash' in body) {
    s.getRange(rowIdx, 12).setValue(body.password_hash || '');
  }

  const updatedItem = sheetData('qr_codes').find(r => String(r.id) === String(id));
  return json({ success: true, item: updatedItem });
}

function deleteQR(body) {
  const { id } = body;
  if (!id) return err('missing id');

  const s = sheet('qr_codes');
  const rows = sheetData('qr_codes');
  const idx = rows.findIndex(r => String(r.id) === String(id));
  if (idx === -1) return err('not found');

  s.deleteRow(idx + 2);
  return json({ success: true });
}

// ── Folder CRUD ───────────────────────────────────

function listFolders(body) {
  const { user_id } = body;
  if (!user_id) return err('missing user_id');

  const rows = sheetData('folders');
  const items = rows.filter(r => String(r.user_id) === String(user_id));
  return json({ success: true, items });
}

function createFolder(body) {
  const { user_id, name } = body;
  if (!user_id || !name) return err('missing fields');

  const s = sheet('folders');
  const id = nextId('folders');
  const ts = now();
  s.appendRow([id, user_id, name, ts]);

  return json({ success: true, item: { id, user_id, name, created_at: ts } });
}

function updateFolder(body) {
  const { id, name } = body;
  if (!id || !name) return err('missing fields');

  const s = sheet('folders');
  const rows = sheetData('folders');
  const idx = rows.findIndex(r => String(r.id) === String(id));
  if (idx === -1) return err('folder not found');

  s.getRange(idx + 2, 3).setValue(name);
  return json({ success: true, item: { id, name } });
}

function deleteFolder(body) {
  const { id } = body;
  if (!id) return err('missing id');

  const s = sheet('folders');
  const rows = sheetData('folders');
  const idx = rows.findIndex(r => String(r.id) === String(id));
  if (idx === -1) return err('folder not found');

  s.deleteRow(idx + 2);

  // Unset folder_id for QRs in this folder
  const qrSheet = sheet('qr_codes');
  const qrRows = sheetData('qr_codes');
  qrRows.forEach((r, i) => {
    if (String(r.folder_id) === String(id)) {
      qrSheet.getRange(i + 2, 9).setValue('');
    }
  });

  return json({ success: true });
}

// ── Change Password ──────────────────────────────

function changePassword(body) {
  const { user_id, old_password_hash, new_password_hash } = body;
  if (!user_id || !old_password_hash || !new_password_hash) return err('missing fields');

  const s = sheet('users');
  const rows = sheetData('users');
  const idx = rows.findIndex(r => String(r.id) === String(user_id));
  if (idx === -1) return err('user not found');

  if (String(rows[idx].password_hash) !== String(old_password_hash)) {
    return err('invalid current password');
  }

  s.getRange(idx + 2, 3).setValue(new_password_hash);
  return json({ success: true });
}

// ── Verify QR Password (public) ──────────────────

function verifyQRPassword(body) {
  const { code, password_hash } = body;
  if (!code || !password_hash) return err('missing fields');

  const s = sheet('qr_codes');
  const rows = sheetData('qr_codes');
  const idx = rows.findIndex(r => r.short_code === code);
  if (idx === -1) return err('not found');

  const row = rows[idx];
  if (!row.target_url) return err('not found');

  // Check expiration
  if (row.expires_at) {
    const expiresDate = new Date(row.expires_at);
    expiresDate.setHours(23, 59, 59, 999);
    if (new Date() > expiresDate) {
      return json({ success: false, error: 'expired', message: 'Este código QR ha expirado' });
    }
  }

  // Check scan limit
  if (row.max_scans && Number(row.max_scans) > 0) {
    const currentScans = Number(row.scan_count || 0);
    if (currentScans >= Number(row.max_scans)) {
      return json({ success: false, error: 'limit_reached', message: 'Se ha alcanzado el límite de escaneos' });
    }
  }

  // Validate password
  if (String(row.password_hash) !== String(password_hash)) {
    return json({ success: false, error: 'wrong_password', message: 'Contraseña incorrecta' });
  }

  // Increment scan count (Column K = 11)
  const rowIdx = idx + 2;
  const currentCount = Number(s.getRange(rowIdx, 11).getValue() || 0);
  s.getRange(rowIdx, 11).setValue(currentCount + 1);

  // Log scan
  logScan(row.id, row.user_id, code, body.user_agent || '', body.referer || '', body.country || 'Unknown', body.city || '', body.latitude || 0, body.longitude || 0);

  return json({ success: true, target_url: row.target_url });
}

// ── Analytics ─────────────────────────────────────

function getScanStats(body) {
  const { user_id, qr_id, days } = body;
  if (!user_id) return err('missing user_id');

  const d = Number(days) || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - d);
  const cutoffStr = Utilities.formatDate(cutoff, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const rows = sheetData('scan_logs');
  let filtered = rows.filter(r => String(r.user_id) === String(user_id));
  if (qr_id) filtered = filtered.filter(r => String(r.qr_id) === String(qr_id));
  filtered = filtered.filter(r => String(r.timestamp).substring(0, 10) >= cutoffStr);

  // Group by day
  const dailyMap = {};
  let todayCount = 0;
  filtered.forEach(r => {
    const day = String(r.timestamp).substring(0, 10);
    dailyMap[day] = (dailyMap[day] || 0) + 1;
    if (day === todayStr) todayCount++;
  });
  const daily = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group by device
  const deviceMap = {};
  filtered.forEach(r => {
    const dt = r.device_type || 'Unknown';
    deviceMap[dt] = (deviceMap[dt] || 0) + 1;
  });
  const devices = Object.entries(deviceMap).map(([type, count]) => ({ type, count }));

  // Group by browser
  const browserMap = {};
  filtered.forEach(r => {
    const b = r.browser || 'Unknown';
    browserMap[b] = (browserMap[b] || 0) + 1;
  });
  const browsers = Object.entries(browserMap).map(([name, count]) => ({ name, count }));

  const total = filtered.length;
  const avgDaily = d > 0 ? Math.round(total / d * 10) / 10 : 0;

  return json({ success: true, daily, devices, browsers, totals: { total, today: todayCount, avg_daily: avgDaily } });
}

function getTopQR(body) {
  const { user_id, limit } = body;
  if (!user_id) return err('missing user_id');

  const lim = Number(limit) || 10;
  const logs = sheetData('scan_logs').filter(r => String(r.user_id) === String(user_id));
  const qrs = sheetData('qr_codes').filter(r => String(r.user_id) === String(user_id));

  const countMap = {};
  logs.forEach(r => {
    const qid = String(r.qr_id);
    countMap[qid] = (countMap[qid] || 0) + 1;
  });

  const items = Object.entries(countMap)
    .map(([qr_id, scan_count]) => {
      const qr = qrs.find(q => String(q.id) === qr_id);
      return { qr_id: Number(qr_id), name: qr ? qr.name : 'Eliminado', short_code: qr ? qr.short_code : '', scan_count };
    })
    .sort((a, b) => b.scan_count - a.scan_count)
    .slice(0, lim);

  return json({ success: true, items });
}

function getScanLogs(body) {
  const { user_id, qr_id, page, per_page } = body;
  if (!user_id) return err('missing user_id');

  const p = Number(page) || 1;
  const pp = Math.min(Number(per_page) || 20, 100);

  let rows = sheetData('scan_logs').filter(r => String(r.user_id) === String(user_id));
  if (qr_id) rows = rows.filter(r => String(r.qr_id) === String(qr_id));
  rows.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));

  const total = rows.length;
  const start = (p - 1) * pp;
  const items = rows.slice(start, start + pp);

  return json({ success: true, items, total, page: p, per_page: pp });
}

// ── Geo Stats ────────────────────────────────────

function getGeoStats(body) {
  const { user_id, qr_id, days } = body;
  if (!user_id) return err('missing user_id');

  const d = Number(days) || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - d);
  const cutoffStr = Utilities.formatDate(cutoff, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const rows = sheetData('scan_logs');
  let filtered = rows.filter(r => String(r.user_id) === String(user_id));
  if (qr_id) filtered = filtered.filter(r => String(r.qr_id) === String(qr_id));
  filtered = filtered.filter(r => String(r.timestamp).substring(0, 10) >= cutoffStr);

  const countryMap = {};
  filtered.forEach(r => {
    const c = r.country || 'Unknown';
    countryMap[c] = (countryMap[c] || 0) + 1;
  });
  const countries = Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  const cityMap = {};
  filtered.forEach(r => {
    const key = (r.city || 'Unknown') + '|' + (r.country || 'Unknown');
    cityMap[key] = (cityMap[key] || 0) + 1;
  });
  const cities = Object.entries(cityMap)
    .map(([key, count]) => {
      const parts = key.split('|');
      return { city: parts[0], country: parts[1], count };
    })
    .sort((a, b) => b.count - a.count);

  const locMap = {};
  filtered.forEach(r => {
    const lat = Math.round((Number(r.latitude) || 0) * 100) / 100;
    const lon = Math.round((Number(r.longitude) || 0) * 100) / 100;
    if (lat === 0 && lon === 0) return;
    const key = lat + ',' + lon;
    locMap[key] = (locMap[key] || 0) + 1;
  });
  const locations = Object.entries(locMap)
    .map(([key, count]) => {
      const p = key.split(',').map(Number);
      return { lat: p[0], lon: p[1], count };
    });

  const uniqueCountries = countries.filter(c => c.country !== 'Unknown').length;
  const uniqueCities = cities.filter(c => c.city !== 'Unknown').length;

  return json({ success: true, countries, cities, locations, totals: { unique_countries: uniqueCountries, unique_cities: uniqueCities } });
}

// ── Settings ──────────────────────────────────────

function getSetting(body) {
  const { key } = body;
  if (!key) return err('missing key');

  const rows = sheetData('settings');
  const row = rows.find(r => r.key === key);
  return json({ success: true, value: row ? row.value : null });
}

function setSetting(body) {
  const { key, value } = body;
  if (!key || value === undefined) return err('missing fields');

  const s = sheet('settings');
  const rows = sheetData('settings');
  const idx = rows.findIndex(r => r.key === key);

  if (idx === -1) {
    s.appendRow([key, value]);
  } else {
    s.getRange(idx + 2, 2).setValue(value);
  }

  return json({ success: true });
}
