# KNOWLEDGE GRAPH
> Updated: 2026-04-12

## SYMBOLS
DB|obj|js/db.js|global
DB.init|fn|js/db.js|yes
DB.query|fn|js/db.js|yes
DB.run|fn|js/db.js|yes
DB.runAndSave|fn|js/db.js|yes
DB.save|fn|js/db.js|yes
DB.needsSeed|fn|js/db.js|yes
DB.getSetting|fn|js/db.js|yes
DB.setSetting|fn|js/db.js|yes
DB._createSchema|fn|js/db.js|private
DB._ensureSettingsTable|fn|js/db.js|private
DB._saveToIDB|fn|js/db.js|private
DB._loadFromIDB|fn|js/db.js|private
Auth|obj|js/auth.js|global
Auth.hashPassword|fn|js/auth.js|yes
Auth.login|fn|js/auth.js|yes
Auth.logout|fn|js/auth.js|yes
Auth.currentUser|fn|js/auth.js|yes
Auth.isLoggedIn|fn|js/auth.js|yes
QR_CRUD|obj|js/qr.js|global
QR_CRUD.create|fn|js/qr.js|yes
QR_CRUD.list|fn|js/qr.js|yes
QR_CRUD.get|fn|js/qr.js|yes
QR_CRUD.getByCode|fn|js/qr.js|yes
QR_CRUD.update|fn|js/qr.js|yes
QR_CRUD.remove|fn|js/qr.js|yes
QR_CRUD.redirectUrl|fn|js/qr.js|yes
QR_CRUD._generateCode|fn|js/qr.js|private
QR_CRUD._uniqueCode|fn|js/qr.js|private
App|obj|js/app.js|global
App.bootstrap|fn|js/app.js|yes
App.bindEvents|fn|js/app.js|yes
App.showLogin|fn|js/app.js|yes
App.showDashboard|fn|js/app.js|yes
App.renderList|fn|js/app.js|yes
App.showDetail|fn|js/app.js|yes
App.openModal|fn|js/app.js|yes
App.closeModal|fn|js/app.js|yes
App.esc|fn|js/app.js|yes

## CALL CHAINS
Entry → $(ready) → App.bootstrap → DB.init → initSqlJs → DB._loadFromIDB → DB._createSchema
App.bootstrap → DB.needsSeed → Auth.hashPassword → DB.runAndSave
App.bootstrap → DB.getSetting('base_url') → DB.setSetting (if null)
Login → Auth.login → Auth.hashPassword → DB.query(users) → sessionStorage.set
CreateQR → QR_CRUD.create → QR_CRUD._uniqueCode → DB.runAndSave → DB.save → DB._saveToIDB
ViewQR → App.showDetail → QR_CRUD.get → QR_CRUD.redirectUrl → DB.getSetting → new QRCode()
Redirect → initSqlJs → loadFromIDB → db.prepare(SELECT) → window.location.href

## CLUSTERS
persistence: DB.init, DB.save, DB._saveToIDB, DB._loadFromIDB, DB.runAndSave
  purpose: sql.js ↔ IndexedDB bidirectional persistence
auth: Auth.hashPassword, Auth.login, Auth.logout, Auth.currentUser
  purpose: user authentication + session management
qr-crud: QR_CRUD.create, QR_CRUD.list, QR_CRUD.get, QR_CRUD.update, QR_CRUD.remove
  purpose: QR code data operations
qr-display: App.renderList, App.showDetail, QR_CRUD.redirectUrl, QRCode constructor
  purpose: QR code visualization + URL generation
settings: DB.getSetting, DB.setSetting, DB._ensureSettingsTable
  purpose: key-value configuration store (base_url)
spa-routing: App.showLogin, App.showDashboard, App.openModal, App.closeModal
  purpose: jQuery show/hide view management

## CROSS-MODULE DEPS
Auth.login → DB.query|call
Auth.hashPassword → crypto.subtle|call
QR_CRUD.create → DB.runAndSave|call
QR_CRUD.redirectUrl → DB.getSetting|call
QR_CRUD._uniqueCode → DB.query|call
App.bootstrap → DB.init|call
App.bootstrap → Auth.hashPassword|call
App.bootstrap → DB.getSetting|call
App.bootstrap → DB.setSetting|call
App.renderList → QR_CRUD.list|call
App.renderList → QR_CRUD.redirectUrl|call
App.showDetail → QR_CRUD.get|call
App.showDetail → QRCode|call
App.openModal → QR_CRUD.get|call
App.bindEvents → Auth.login|call
App.bindEvents → Auth.logout|call
App.bindEvents → QR_CRUD.create|call
App.bindEvents → QR_CRUD.update|call
App.bindEvents → QR_CRUD.remove|call
App.bindEvents → DB.getSetting|call
App.bindEvents → DB.setSetting|call
