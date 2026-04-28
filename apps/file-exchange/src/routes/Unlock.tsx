import { useState, type FormEvent } from 'react';
import { Page } from '../components/Page.js';
import { Field } from '../components/Field.js';
import { Button } from '../components/Button.js';
import { Chapter, Note } from '../components/Chapter.js';
import { IdbBrowserKeystore } from '@liaskos/keystore';
import { unwrapWithPassword, hexToBytes } from '../auth/crypto-binding.js';
import { getSupabaseClient } from '@liaskos/supabase-client';
import { useCryptoStore } from '../store/cryptoContext.js';
import { signOut } from '../auth/api.js';

const keystore = new IdbBrowserKeystore();

export function Unlock() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const stored = await keystore.loadEncryptedKey();
      if (!stored) {
        setError('No encryption keys on this device. Sign out and use recovery code.');
        return;
      }
      const sk = await unwrapWithPassword(password, stored);

      const sb = getSupabaseClient();
      const { data: u } = await sb.auth.getUser();
      const userId = u.user?.id;
      let pk: Uint8Array;
      if (userId) {
        const { data: row } = await sb
          .from('profiles_public')
          .select('ed25519_public_key')
          .eq('id', userId)
          .maybeSingle();
        const hex = (row?.ed25519_public_key as string | undefined)?.replace(/^\\x/, '');
        pk = hex ? hexToBytes(hex) : sk.subarray(32);
      } else {
        pk = sk.subarray(32);
      }

      useCryptoStore.getState().setUnlocked(sk, pk);
    } catch {
      setError('Password didn’t unlock the key.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Page>
      <Chapter
        roman="Interleaf"
        title="Lift the cover."
        subtitle="Your keys remain on this machine; the password unbinds them."
        marginalia={
          <Note>
            Your encrypted key never leaves this device. The password
            decrypts it locally; nothing is sent to verify it.
          </Note>
        }
      >
        <form onSubmit={onSubmit} noValidate>
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error || undefined}
            index="i."
          />
          <div className="actions">
            <Button type="submit" variant="press" disabled={pending}>
              {pending ? 'Opening…' : 'Open'}
            </Button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={async () => { await signOut(); }}
            >
              Sign out instead
            </button>
          </div>
        </form>
      </Chapter>
    </Page>
  );
}
