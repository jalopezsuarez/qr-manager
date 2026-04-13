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

    // Increment scan count (Column K = 11)
    const rowIdx = idx + 2;
    const currentCount = Number(s.getRange(rowIdx, 11).getValue() || 0);
    s.getRange(rowIdx, 11).setValue(currentCount + 1);

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

  // Folders
  if (action === 'list_folders')    return listFolders(body);
  if (action === 'create_folder')   return createFolder(body);
  if (action === 'update_folder')   return updateFolder(body);
  if (action === 'delete_folder')   return deleteFolder(body);

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
  const { user_id, name, target_url, short_code, expires_at, folder_id, max_scans } = body;
  if (!user_id || !name || !target_url || !short_code) return err('missing fields');

  const s = sheet('qr_codes');
  const id = nextId('qr_codes');
  const ts = now();
  s.appendRow([id, user_id, name, target_url, short_code, ts, ts, expires_at || '', folder_id || '', max_scans || '', 0]);

  return json({ success: true, item: { id, user_id, name, target_url, short_code, created_at: ts, updated_at: ts, expires_at: expires_at || null, folder_id: folder_id || null, max_scans: max_scans || null, scan_count: 0 } });
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
