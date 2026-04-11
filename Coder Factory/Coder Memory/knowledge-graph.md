# KNOWLEDGE GRAPH
> Updated: 2026-04-12

## SYMBOLS
DB|obj|js/db.js|global
DB.init|fn|js/db.js|yes
DB.setApiUrl|fn|js/db.js|yes
DB.hasApiUrl|fn|js/db.js|yes
DB._post|fn|js/db.js|yes
DB._get|fn|js/db.js|yes
DB.seedIfNeeded|fn|js/db.js|yes
DB.needsSeed|fn|js/db.js|yes
DB.getSetting|fn|js/db.js|yes
DB.setSetting|fn|js/db.js|yes
DB.deployId|fn|js/db.js|yes
DB._cachedBaseUrl|prop|js/db.js|set by app.js
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
App._initApp|fn|js/app.js|yes
App.bindEvents|fn|js/app.js|yes
App.showLogin|fn|js/app.js|yes
App.showDashboard|fn|js/app.js|yes
App.renderList|fn|js/app.js|yes
App.showDetail|fn|js/app.js|yes
App.openModal|fn|js/app.js|yes
App.closeModal|fn|js/app.js|yes
App.openApiConfig|fn|js/app.js|yes
App.esc|fn|js/app.js|yes

## CALL CHAINS
Entry → $(ready) → App.bootstrap → DB.init → check apiUrl → openApiConfig or _initApp
App._initApp → Auth.hashPassword('admin') → DB.seedIfNeeded → set DB._cachedBaseUrl
Login → Auth.login → Auth.hashPassword(SHA-256) → DB._post({action:'login'}) → sessionStorage.set
CreateQR → QR_CRUD.create → QR_CRUD._uniqueCode → DB._post({action:'create_qr'})
ViewQR → App.showDetail → QR_CRUD.get → QR_CRUD.redirectUrl → DB.deployId() → new QRCode()
Redirect → parse ?q= token → slice(-8)=code, slice(0,-8)=deployId → reconstruct API URL → fetch GET → redirect
Config → App.openApiConfig → form submit → DB.setApiUrl → localStorage → _initApp

## CLUSTERS
persistence: DB.init, DB._post, DB._get, DB.setApiUrl, DB.deployId
  purpose: fetch() ↔ Google Apps Script REST adapter
auth: Auth.hashPassword, Auth.login, Auth.logout, Auth.currentUser
  purpose: SHA-256 auth + session management
qr-crud: QR_CRUD.create, QR_CRUD.list, QR_CRUD.get, QR_CRUD.update, QR_CRUD.remove
  purpose: QR code data operations via Apps Script
qr-display: App.renderList, App.showDetail, QR_CRUD.redirectUrl, QRCode constructor
  purpose: QR code visualization + compressed URL generation
settings: DB.getSetting, DB.setSetting
  purpose: key-value config via Apps Script (settings sheet)
spa-routing: App.showLogin, App.showDashboard, App.openModal, App.closeModal, App.openApiConfig
  purpose: jQuery show/hide view management

## CROSS-MODULE DEPS
Auth.login → DB._post|call
Auth.hashPassword → crypto.subtle|call
QR_CRUD.create → DB._post|call
QR_CRUD.redirectUrl → DB.deployId|call
QR_CRUD.redirectUrl → DB._cachedBaseUrl|read
QR_CRUD._uniqueCode → DB._post|call
App.bootstrap → DB.init|call
App._initApp → Auth.hashPassword|call
App._initApp → DB.seedIfNeeded|call
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
App.bindEvents → DB.setApiUrl|call
