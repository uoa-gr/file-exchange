import { ipcMain } from 'electron';
import { IpcChannel } from '@spourgiti/shared';
import { handlePing } from './handlers/ping';

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannel.Ping, (_e, req) => handlePing(req));
}
