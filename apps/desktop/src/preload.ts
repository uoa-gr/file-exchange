import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel } from '@spourgiti/shared';

const allowed = new Set(Object.values(IpcChannel));

contextBridge.exposeInMainWorld('spourgiti', {
  invoke: (channel: string, req: unknown) => {
    if (!allowed.has(channel as (typeof IpcChannel)[keyof typeof IpcChannel])) {
      return Promise.reject(new Error(`ipc channel not allowed: ${channel}`));
    }
    return ipcRenderer.invoke(channel, req);
  },
});
