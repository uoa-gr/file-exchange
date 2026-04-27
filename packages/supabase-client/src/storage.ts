import type { SpourgitiClient } from './client.js';

const BUCKET = 'send-payloads';

export async function uploadCiphertext(
  client: SpourgitiClient,
  senderId: string,
  sendId: string,
  body: Uint8Array,
): Promise<{ path: string }> {
  const path = `${senderId}/${sendId}.bin`;
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, body, { upsert: false, contentType: 'application/octet-stream' });
  if (error) throw error;
  return { path };
}

export async function downloadCiphertext(
  client: SpourgitiClient,
  storageObject: string,
): Promise<Uint8Array> {
  const { data, error } = await client.storage.from(BUCKET).download(storageObject);
  if (error) throw error;
  return new Uint8Array(await data.arrayBuffer());
}
