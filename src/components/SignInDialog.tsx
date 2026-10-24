import { useState, type FormEvent } from 'react';
import { fr } from '../i18n/fr';

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  onClose: () => void;
}

const errorCode = (e: unknown) => (e as { code?: string }).code;

/** Fenêtre de connexion par email et mot de passe (compte créé dans la console Firebase). */
export function SignInDialog({ onSignIn, onResetPassword, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await onSignIn(email, password);
      onClose();
    } catch (err) {
      setMessage({ text: fr.signInError(errorCode(err)), error: true });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) return setMessage({ text: fr.resetNeedsEmail, error: true });
    try {
      await onResetPassword(email);
      setMessage({ text: fr.resetSent(email.trim()), error: false });
    } catch (err) {
      setMessage({ text: fr.signInError(errorCode(err)), error: true });
    }
  };

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" onSubmit={submit} aria-label={fr.signInTitle}>
        <h2>{fr.signInTitle}</h2>
        <label>
          {fr.email}
          <input type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {fr.password}
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {message && <p className={message.error ? 'dialog-error' : 'dialog-info'}>{message.text}</p>}
        <div className="dialog-actions">
          <button type="button" className="link" onClick={() => void reset()}>
            {fr.forgotPassword}
          </button>
          <button type="button" className="add" onClick={onClose}>
            {fr.cancel}
          </button>
          <button type="submit" className="add primary" disabled={busy}>
            {busy ? fr.signingIn : fr.signIn}
          </button>
        </div>
      </form>
    </div>
  );
}
