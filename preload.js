'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hydra', {
  getState: () => ipcRenderer.invoke('state:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  toggleRunning: () => ipcRenderer.invoke('running:toggle'),
  preview: () => ipcRenderer.invoke('reminder:preview'),
  logDrink: () => ipcRenderer.invoke('drink:log'),
  undoDrink: () => ipcRenderer.invoke('drink:undo'),
  respond: (action) => ipcRenderer.send('reminder:respond', action),
  done: () => ipcRenderer.send('overlay:done'),
  setIgnoreMouse: (ignore) => ipcRenderer.send('overlay:ignore', ignore),
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
  onShow: (cb) => ipcRenderer.on('reminder:show', (_e, p) => cb(p)),
  onLeave: (cb) => ipcRenderer.on('reminder:leave', (_e, p) => cb(p)),
});
