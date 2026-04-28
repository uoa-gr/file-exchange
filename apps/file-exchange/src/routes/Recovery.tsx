import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, PageTitle, PageHelper } from '../components/Page.js';
import { Field } from '../components/Field.js';
import { Button } from '../components/Button.js';
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
      <PageTitle>Recover account</PageTitle>
      <PageHelper>Enter your recovery code and a new password. Spaces are ignored.</PageHelper>
      <form onSubmit={onSubmit} className="form" noValidate>
        <Field
          label="Recovery code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          mono
          autoComplete="off"
          spellCheck={false}
          placeholder="abcd ef01 2345…"
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={error || undefined}
          hint="At least 12 characters."
        />
        <Button type="submit" disabled={pending}>
          {pending ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
      <p className="linkrow">
        <Link to="/login">Back to sign in</Link>
      </p>
    </Page>
  );
}
