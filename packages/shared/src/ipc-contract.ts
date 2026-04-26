/**
 * Single source of truth for every cross-process call.
 * Renderer imports the request/response types; main registers handlers
 * keyed by IpcChannel; the preload bridge maps each channel to an
 * invoke<TReq, TRes>(channel, req) call.
 */

export const IpcChannel = {
  Ping: 'ping',
  UpdaterCheck: 'updater:check',
  UpdaterDownload: 'updater:download',
  UpdaterInstall: 'updater:install',
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];

export interface PingRequest { msg: string }
export interface PingResponse { echoed: string; appVersion: string }

export interface UpdaterCheckRequest {}
export interface UpdaterCheckResponse {
  status: 'no-update' | 'available' | 'error';
  version?: string;
  releaseNotes?: string;
  error?: string;
}

export interface UpdaterDownloadRequest {}
export interface UpdaterDownloadResponse {
  status: 'downloaded' | 'in-progress' | 'error';
  error?: string;
}

export interface UpdaterInstallRequest {}
export interface UpdaterInstallResponse {
  status: 'restarting' | 'error';
  error?: string;
}

export interface IpcContract {
  [IpcChannel.Ping]: (req: PingRequest) => Promise<PingResponse>;
  [IpcChannel.UpdaterCheck]: (req: UpdaterCheckRequest) => Promise<UpdaterCheckResponse>;
  [IpcChannel.UpdaterDownload]: (req: UpdaterDownloadRequest) => Promise<UpdaterDownloadResponse>;
  [IpcChannel.UpdaterInstall]: (req: UpdaterInstallRequest) => Promise<UpdaterInstallResponse>;
}
