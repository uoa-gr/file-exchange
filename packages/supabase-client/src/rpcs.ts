import type { SpourgitiClient } from './client.js';

export interface ReserveQuotaResult { ok: boolean; free: number; token: string | null }

export async function reserveQuota(client: SpourgitiClient, sizeBytes: number): Promise<ReserveQuotaResult> {
  const { data, error } = await client.rpc('reserve_quota', { p_size: sizeBytes });
  if (error) throw error;
  const row = (data as ReserveQuotaResult[] | null)?.[0];
  if (!row) throw new Error('reserve_quota returned no rows');
  return row;
}

export interface CommitUploadParams {
  token: string;
  recipient_id: string;
  transport: 'cloud' | 'p2p';
  storage_object: string | null;
  size_bytes: number;
  encrypted_manifest: string;     // base64 or hex; supabase-js auto-encodes bytea on the wire
  manifest_sig: string;
  wrapped_key: string;
}

export async function commitUpload(client: SpourgitiClient, p: CommitUploadParams) {
  const { data, error } = await client.rpc('commit_upload', {
    p_token: p.token,
    p_recipient_id: p.recipient_id,
    p_transport: p.transport,
    p_storage_object: p.storage_object as string,
    p_size_bytes: p.size_bytes,
    p_encrypted_manifest: p.encrypted_manifest,
    p_manifest_sig: p.manifest_sig,
    p_wrapped_key: p.wrapped_key,
  });
  if (error) throw error;
  return data;
}

export async function markDelivered(client: SpourgitiClient, sendId: string): Promise<void> {
  const { error } = await client.rpc('mark_delivered', { p_send_id: sendId });
  if (error) throw error;
}

export async function revokeSend(client: SpourgitiClient, sendId: string): Promise<void> {
  const { error } = await client.rpc('revoke_send', { p_send_id: sendId });
  if (error) throw error;
}

export async function usernameAvailable(client: SpourgitiClient, username: string): Promise<boolean> {
  const { data, error } = await client.rpc('username_available', { p_username: username });
  if (error) throw error;
  return Boolean(data);
}

export interface CreateProfileParams {
  username: string;
  ed25519_public_key: string;     // base64 or hex
  recovery_blob: string;
  recovery_kdf_params: { salt: number[]; ops_limit: number; mem_limit: number };
}

export async function createProfile(client: SpourgitiClient, p: CreateProfileParams) {
  const { data, error } = await client.rpc('create_profile', {
    p_username: p.username,
    p_ed25519_public_key: p.ed25519_public_key,
    p_recovery_blob: p.recovery_blob,
    p_recovery_kdf_params: p.recovery_kdf_params as never,
  });
  if (error) throw error;
  return data;
}
