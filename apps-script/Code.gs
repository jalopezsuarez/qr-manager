// QR Manager — Google Apps Script API
// Deploy as Web App: Execute as Me, Access: Anyone
// ─────────────────────────────────────────────────

const SS = SpreadsheetApp.getActiveSpreadsheet();

// ── Helpers ──────────────────────────────────────

function sheet(name) {
  return SS.getSheetByName(name);
}

function sheetData(name) {
  const s = sheet(name);
  const rows = s.getDataRange().getValues();
  const headers = rows[0];
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

// ── doGet — health check & redirect lookup ────────

function doGet(e) {
  const action = e.parameter.action;

  // Public redirect: ?action=redirect&code=XXXXXXXX
  if (action === 'redirect') {
    const code = e.parameter.code;
    if (!code) return err('missing code');
    const rows = sheetData('qr_codes');
    const row = rows.find(r => r.short_code === code);
    if (!row || !row.target_url) return err('not found');
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
  const { user_id, name, target_url, short_code } = body;
  if (!user_id || !name || !target_url || !short_code) return err('missing fields');

  const s = sheet('qr_codes');
  const id = nextId('qr_codes');
  const ts = now();
  s.appendRow([id, user_id, name, target_url, short_code, ts, ts]);

  return json({ success: true, item: { id, user_id, name, target_url, short_code, created_at: ts, updated_at: ts } });
}

function updateQR(body) {
  const { id, name, target_url } = body;
  if (!id || !name || !target_url) return err('missing fields');

  const s = sheet('qr_codes');
  const rows = sheetData('qr_codes');
  const idx = rows.findIndex(r => String(r.id) === String(id));
  if (idx === -1) return err('not found');

  const rowIdx = idx + 2;
  s.getRange(rowIdx, 3).setValue(name);
  s.getRange(rowIdx, 4).setValue(target_url);
  s.getRange(rowIdx, 7).setValue(now());

  return json({ success: true, item: getQR({ id }).item });
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
