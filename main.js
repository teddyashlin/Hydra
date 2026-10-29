'use strict';
const {
  app, BrowserWindow, Tray, Menu, ipcMain, screen, powerMonitor, nativeImage, Notification,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { dropPng } = require('./src/drop-icon');

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const OVERLAY_HEIGHT = 560;
const IGNORE_TIMEOUT_MS = 90 * 1000; // walk away and auto-snooze if the reminder is ignored
const AWAY_IDLE_SECONDS = 5 * 60;
const MAX_TICK_MS = 30 * 1000; // re-check often enough to survive clock changes and sleep
const PRELOAD = path.join(__dirname, 'preload.js');

const MESSAGES = [
  'Time to drink some water! 💧',
  'Water break! Grab a few sips 💧',
  'Your body called — it wants water 💧',
  "Sip o'clock! Take a quick drink 💧",
  'Stay fresh — time for some water 💧',
];

const DEFAULTS = {
  settings: {
    name: '',
    mode: 'interval',
    intervalMin: 60,
    times: ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'],
    start: '09:00',
    end: '21:00',
    snoozeMin: 5,
    goal: 8,
    running: true,
    sound: true,
    nativeNotify: false,
    pauseWhenAway: true,
    launchAtLogin: false,
  },
  state: { anchor: null, snoozeUntil: null, lastFired: null },
  logs: [],
};

let store;
let storePath;
let saveTimer = null;
let tray = null;
let overlayWin = null;
let overlayReady = null;
let settingsWin = null;
let tickTimer = null;
let lastDue;
let active = null; // the reminder currently on screen
let ignoreTimer = null;
let finishFallback = null;
let appIcon;

// ---------- persistence ----------
function loadStore() {
  storePath = path.join(app.getPath('userData'), 'hydra-store.json');
  let text = null;
  try {
    text = fs.readFileSync(storePath, 'utf8').replace(/^\uFEFF/, '');
    const raw = JSON.parse(text);
    store = {
      settings: { ...DEFAULTS.settings, ...raw.settings },
      state: { ...DEFAULTS.state, ...raw.state },
      logs: Array.isArray(raw.logs) ? raw.logs.filter(Number.isFinite) : [],
      firstRun: false,
    };
  } catch (err) {
    if (text !== null) {
      console.error('Hydra data was unreadable; keeping a backup and starting fresh:', err);
      try { fs.renameSync(storePath, `${storePath}.corrupt-${Date.now()}`); } catch { /* ignore */ }
    }
    store = { ...structuredClone(DEFAULTS), firstRun: true };
  }
  const cutoff = Date.now() - 60 * DAY;
  store.logs = store.logs.filter((t) => t > cutoff);
}

function writeStoreNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const { settings, state, logs } = store;
  const tmp = `${storePath}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify({ settings, state, logs }));
    fs.renameSync(tmp, storePath);
  } catch (err) {
    console.error('Could not save Hydra data:', err);
  }
}

function saveStore() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeStoreNow, 300);
}

// ---------- time helpers ----------
function toMinutes(value) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function atMinute(base, minutes, dayOffset = 0) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setMinutes(minutes);
  return d.getTime();
}

function minuteOfDay(ts) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

function inWindow(ts) {
  const s = toMinutes(store.settings.start);
  const e = toMinutes(store.settings.end);
  if (s === null || e === null || s === e) return true;
  const m = minuteOfDay(ts);
  return s < e ? m >= s && m < e : m >= s || m < e;
}

function nextWindowStart(ts) {
  const s = toMinutes(store.settings.start);
  for (let off = 0; off <= 2; off++) {
    const c = atMinute(ts, s, off);
    if (c > ts) return c;
  }
  return ts;
}

function validTimes(list) {
  return [...new Set(list.map(toMinutes).filter((m) => m !== null))].sort((a, b) => a - b);
}

function isToday(ts) {
  return new Date(ts).toDateString() === new Date().toDateString();
}

function todayLogs() {
  return store.logs.filter(isToday);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ---------- scheduling ----------
function computeNextDue(now) {
  const { settings: s, state: st } = store;
  if (!s.running) return null;
  if (st.snoozeUntil) return st.snoozeUntil;

  if (s.mode === 'times') {
    const list = validTimes(s.times);
    if (!list.length) return null;
    if (!st.lastFired) st.lastFired = now;
    const after = st.lastFired;
    const base = Math.max(after, now - DAY);
    for (let off = 0; off <= 2; off++) {
      for (const m of list) {
        const t = atMinute(base, m, off);
        if (t > after) return t;
      }
    }
    return null;
  }

  if (!st.anchor) {
    st.anchor = now;
    saveStore();
  }
  const due = st.anchor + Math.max(1, s.intervalMin) * MIN;
  if (due > now) return inWindow(due) ? due : nextWindowStart(due);
  return inWindow(now) ? due : nextWindowStart(now);
}

function isUserAway() {
  if (!store.settings.pauseWhenAway) return false;
  try {
    const state = powerMonitor.getSystemIdleState(AWAY_IDLE_SECONDS);
    return state === 'idle' || state === 'locked';
  } catch {
    return false;
  }
}

function scheduleTick(ms) {
  clearTimeout(tickTimer);
  tickTimer = setTimeout(tick, Math.max(250, ms));
}

function tick() {
  clearTimeout(tickTimer);
  const now = Date.now();
  const due = computeNextDue(now);
  if (due !== lastDue) {
    lastDue = due;
    refreshTray();
    broadcastState();
  }
  if (due === null) return;
  if (due > now) return scheduleTick(Math.min(due - now, MAX_TICK_MS));
  if (active) return scheduleTick(5000);
  if (isUserAway()) return scheduleTick(15000);
  fireReminder(false);
}

function pickMessage() {
  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  const name = store.settings.name.trim();
  return name ? `Hey ${name}! ${msg}` : msg;
}

function fireReminder(preview) {
  if (active) return;
  const now = Date.now();
  const s = store.settings;
  active = { preview, resolved: false };

  if (!preview) {
    store.state.snoozeUntil = null;
    if (s.mode === 'times') store.state.lastFired = now;
    else store.state.anchor = now;
    saveStore();
  }

  const message = pickMessage();
  showOverlay({
    message,
    count: todayLogs().length,
    goal: s.goal,
    snoozeMin: s.snoozeMin,
    sound: s.sound,
  });

  if (s.nativeNotify && Notification.isSupported()) {
    new Notification({ title: 'Water break 💧', body: message, icon: appIcon, silent: true }).show();
  }

  clearTimeout(ignoreTimer);
  ignoreTimer = setTimeout(() => {
    resolveReminder('timeout');
    sendToOverlay('reminder:leave', { message: "I'll check back in a bit 👋" });
  }, IGNORE_TIMEOUT_MS);

  refreshTray();
  broadcastState();
}

function resolveReminder(action) {
  if (!active || active.resolved) return;
  active.resolved = true;
  clearTimeout(ignoreTimer);
  const now = Date.now();
  const st = store.state;

  if (action === 'yes') store.logs.push(now);
  if (!active.preview) {
    if (action === 'later' || action === 'timeout') {
      st.snoozeUntil = now + store.settings.snoozeMin * MIN;
    } else if (store.settings.mode === 'interval') {
      st.anchor = now;
    }
  }
  saveStore();
  refreshTray();
  broadcastState();
  clearTimeout(finishFallback);
  finishFallback = setTimeout(finishReminder, 10000); // in case the overlay never reports back
}

function finishReminder() {
  clearTimeout(finishFallback);
  if (overlayWin && !overlayWin.isDestroyed()) overlayWin.hide();
  active = null;
  tick();
}

function logDrinkNow() {
  const now = Date.now();
  store.logs.push(now);
  if (store.settings.mode === 'interval' && !active) {
    store.state.anchor = now;
    store.state.snoozeUntil = null;
  }
  saveStore();
  tick();
  refreshTray();
  broadcastState();
}

function undoDrink() {
  const last = store.logs[store.logs.length - 1];
  if (last && isToday(last)) {
    store.logs.pop();
    saveStore();
    refreshTray();
    broadcastState();
  }
}

// ---------- settings ----------
function clampNumber(v, min, max, fallback) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function sanitize(patch, current) {
  const next = { ...current };
  if ('name' in patch) next.name = String(patch.name || '').trim().slice(0, 30);
  if (patch.mode === 'interval' || patch.mode === 'times') next.mode = patch.mode;
  if ('intervalMin' in patch) next.intervalMin = clampNumber(patch.intervalMin, 1, 480, current.intervalMin);
  if ('times' in patch) {
    const list = Array.isArray(patch.times) ? patch.times : String(patch.times).split(',');
    next.times = validTimes(list).map((m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  if ('start' in patch && toMinutes(patch.start) !== null) next.start = patch.start;
  if ('end' in patch && toMinutes(patch.end) !== null) next.end = patch.end;
  if ('snoozeMin' in patch) next.snoozeMin = clampNumber(patch.snoozeMin, 1, 120, current.snoozeMin);
  if ('goal' in patch) next.goal = clampNumber(patch.goal, 1, 30, current.goal);
  for (const key of ['running', 'sound', 'nativeNotify', 'pauseWhenAway', 'launchAtLogin']) {
    if (key in patch) next[key] = Boolean(patch[key]);
  }
  return next;
}

function saveSettings(patch) {
  const prev = store.settings;
  const next = sanitize(patch || {}, prev);
  store.settings = next;

  const scheduleChanged = ['mode', 'intervalMin', 'start', 'end', 'running'].some((k) => prev[k] !== next[k])
    || prev.times.join() !== next.times.join();
  if (scheduleChanged) {
    const now = Date.now();
    store.state = { anchor: now, snoozeUntil: null, lastFired: now };
  }
  if (prev.launchAtLogin !== next.launchAtLogin) applyLoginItem(next.launchAtLogin);

  store.firstRun = false;
  saveStore();
  tick();
  refreshTray();
  broadcastState();
  return publicState();
}

function applyLoginItem(openAtLogin) {
  try {
    const opts = { openAtLogin, args: ['--hidden'] };
    if (!app.isPackaged) {
      opts.path = process.execPath;
      opts.args = [path.resolve(app.getAppPath()), '--hidden'];
    }
    app.setLoginItemSettings(opts);
  } catch (err) {
    console.error('Could not update login item:', err);
  }
}

function publicState() {
  return {
    settings: store.settings,
    nextDue: computeNextDue(Date.now()),
    today: todayLogs(),
    active: Boolean(active),
    firstRun: store.firstRun,
  };
}

function broadcastState() {
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('state', publicState());
}

// ---------- windows ----------
function createOverlay() {
  overlayWin = new BrowserWindow({
    width: 800,
    height: OVERLAY_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false, // never steals focus from what you are typing
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: PRELOAD,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.setIgnoreMouseEvents(true, { forward: true });
  overlayReady = new Promise((resolve) => overlayWin.webContents.once('did-finish-load', resolve));
  overlayWin.loadFile(path.join(__dirname, 'src', 'overlay.html'));
  overlayWin.on('closed', () => {
    overlayWin = null;
    if (active) finishReminder();
  });
}

async function showOverlay(payload) {
  if (!overlayWin || overlayWin.isDestroyed()) createOverlay();
  await overlayReady;
  const { workArea: wa } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const height = Math.min(OVERLAY_HEIGHT, wa.height);
  overlayWin.setBounds({ x: wa.x, y: wa.y + wa.height - height, width: wa.width, height });
  overlayWin.setIgnoreMouseEvents(true, { forward: true });
  overlayWin.showInactive();
  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.webContents.send('reminder:show', payload);
}

function sendToOverlay(channel, payload) {
  if (overlayWin && !overlayWin.isDestroyed()) overlayWin.webContents.send(channel, payload);
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    if (settingsWin.isMinimized()) settingsWin.restore();
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 760,
    minHeight: 600,
    title: 'Hydra — water reminder',
    icon: appIcon,
    backgroundColor: '#f5f2e9',
    show: false,
    autoHideMenuBar: true,
    webPreferences: { preload: PRELOAD, sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  settingsWin.removeMenu();
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => { settingsWin = null; });
  settingsWin.loadFile(path.join(__dirname, 'src', 'settings.html'));
}

// ---------- tray ----------
function buildIcon() {
  const img = nativeImage.createEmpty();
  img.addRepresentation({ scaleFactor: 1, buffer: dropPng(16) });
  img.addRepresentation({ scaleFactor: 2, buffer: dropPng(32) });
  appIcon = nativeImage.createFromBuffer(dropPng(256));
  return img;
}

function refreshTray() {
  if (!tray) return;
  const s = store.settings;
  const due = lastDue;
  let status = 'Reminders paused';
  if (active) status = 'Reminder on screen';
  else if (s.running && due) status = `Next nudge: ${due <= Date.now() ? 'now' : formatTime(due)}`;
  else if (s.running) status = 'No reminder times set';
  const count = todayLogs().length;

  tray.setToolTip(`Hydra — ${status} · ${count}/${s.goal} glasses today`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: status, enabled: false },
    { label: `Glasses today: ${count} / ${s.goal}`, enabled: false },
    { type: 'separator' },
    { label: 'Show reminder now', click: () => fireReminder(true) },
    { label: 'I just drank water', click: logDrinkNow },
    { label: s.running ? 'Pause reminders' : 'Resume reminders', click: () => saveSettings({ running: !s.running }) },
    { type: 'separator' },
    { label: 'Open Hydra', click: openSettings },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: s.launchAtLogin,
      click: (item) => saveSettings({ launchAtLogin: item.checked }),
    },
    { type: 'separator' },
    { label: 'Quit Hydra', click: () => app.quit() },
  ]));
}

// ---------- IPC ----------
ipcMain.handle('state:get', () => publicState());
ipcMain.handle('settings:save', (_e, patch) => saveSettings(patch));
ipcMain.handle('running:toggle', () => saveSettings({ running: !store.settings.running }));
ipcMain.handle('reminder:preview', () => { fireReminder(true); return publicState(); });
ipcMain.handle('drink:log', () => { logDrinkNow(); return publicState(); });
ipcMain.handle('drink:undo', () => { undoDrink(); return publicState(); });
ipcMain.on('reminder:respond', (_e, action) => {
  if (['yes', 'later', 'dismiss'].includes(action)) resolveReminder(action);
});
ipcMain.on('overlay:done', () => finishReminder());
ipcMain.on('overlay:ignore', (_e, ignore) => {
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
  }
});

// ---------- lifecycle ----------
app.setAppUserModelId('com.hydra.waterreminder');

app.on('second-instance', (_e, argv) => {
  if (argv.includes('--preview')) fireReminder(true);
  else openSettings();
});

app.on('window-all-closed', () => {
  // Stay alive in the tray.
});

app.on('before-quit', () => {
  if (saveTimer) writeStoreNow();
});

app.whenReady().then(() => {
  loadStore();
  tray = new Tray(buildIcon());
  tray.on('click', openSettings);
  createOverlay();

  for (const evt of ['resume', 'unlock-screen', 'user-did-become-active']) powerMonitor.on(evt, tick);

  tick();
  refreshTray();
  if (!process.argv.includes('--hidden')) openSettings();
  if (process.argv.includes('--preview')) overlayReady.then(() => setTimeout(() => fireReminder(true), 600));
});
