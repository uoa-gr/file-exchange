import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../components/Page.js';
import { Field } from '../components/Field.js';
import { Button } from '../components/Button.js';
import { Chapter, Note } from '../components/Chapter.js';
import { resetWithRecoveryCode } from '../auth/api.js';
import { useCryptoStore } from '../store/cryptoContext.js';

export function Recovery() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 12) { setError('New password must be at least 12 characters.'); return; }
    setPending(true);
    const r = await resetWithRecoveryCode(code.replace(/\s+/g, ''), newPassword);
    setPending(false);

    if (!r.ok) {
      switch (r.reason) {
        case 'wrong_code': setError('That recovery code didn’t match.'); break;
        case 'no_session': setError(r.message); break;
        case 'auth_error': setError(r.message); break;
        case 'rpc_error': setError('Couldn’t reach the server. Try again.'); break;
      }
      return;
    }

    useCryptoStore.getState().setUnlocked(r.privateKey, r.publicKey);
    navigate('/inbox', { replace: true });
  }

  return (
    <Page>
      <Chapter
        roman="Restoration"
        title="Open by recovery."
        subtitle="The 24-byte code you copied at registration; spaces are forgiven."
        marginalia={
          <>
            <Note>
              The recovery code is the only key that can re-bind your
              account to a new device. It is irreplaceable.
            </Note>
            <Note>
              We cannot reset it. If lost, the messages remain encrypted
              and unreadable — by you and by us alike.
            </Note>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate>
          <Field
            label="Recovery code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            mono
            autoComplete="off"
            spellCheck={false}
            placeholder="abcd ef01 2345 ··· "
            index="i."
          />
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={error || undefined}
            placeholder="at least twelve characters"
            index="ii."
          />
          <div className="actions">
            <Button type="submit" variant="press" disabled={pending}>
              {pending ? 'Restoring…' : 'Restore'}
            </Button>
            <Link to="/login" className="btn btn--ghost">Back to sign-in</Link>
          </div>
        </form>
      </Chapter>
    </Page>
  );
}
