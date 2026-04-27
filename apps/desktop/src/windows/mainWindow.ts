import { BrowserWindow, app } from 'electron';
import * as path from 'node:path';

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, renderer is copied to extraResources/renderer/.
    // app.getAppPath() returns the .asar root; resourcesPath is the parent that holds extraResources.
    const rendererIndex = path.join(process.resourcesPath, 'renderer', 'index.html');
    win.loadFile(rendererIndex);
  }

  win.once('ready-to-show', () => win.show());
  return win;
}
