import { app } from 'electron';
import type { PingRequest, PingResponse } from '@spourgiti/shared';

export async function handlePing(req: PingRequest): Promise<PingResponse> {
  return { echoed: req.msg, appVersion: app.getVersion() };
}
