import type { SpourgitiClient } from './client.js';

/**
 * Subscribe to inbox row inserts for the current user. Returns an
 * unsubscribe function the caller MUST invoke on cleanup.
 */
export function subscribeToInbox(
  client: SpourgitiClient,
  userId: string,
  onInsert: (row: unknown) => void,
): () => void {
  const channel = client
    .channel(`inbox:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sends', filter: `recipient_id=eq.${userId}` },
      (payload) => onInsert(payload.new),
    )
    .subscribe();
  return () => { void client.removeChannel(channel); };
}

/**
 * Open a broadcast channel for WebRTC signaling on a specific send_id.
 * Realtime Authorization (migration 0007 — once enabled in the
 * dashboard) restricts membership to the send's sender + recipient.
 * Until then, the channel topic uses the send's UUID as a soft secret;
 * defense in depth comes from the DTLS fingerprint binding in the
 * signed manifest (spec section 4.4 step 9).
 */
export function signalingChannel(
  client: SpourgitiClient,
  sendId: string,
  onSignal: (msg: unknown) => void,
): { send: (msg: unknown) => Promise<void>; close: () => void } {
  const channel = client
    .channel(`signal:${sendId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'sdp' }, (payload) => onSignal(payload.payload))
    .subscribe();
  return {
    send: async (msg) => {
      await channel.send({ type: 'broadcast', event: 'sdp', payload: msg });
    },
    close: () => { void client.removeChannel(channel); },
  };
}
