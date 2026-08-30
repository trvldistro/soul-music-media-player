import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SoulLogo } from '@/components/AppSidebar';
import { describeAuthError, siteRelativeTarget, withRedirect, type AuthErrorCopy } from '@/lib/authErrors';

/** Sign-in page for people who already have an account: email + password, a
 *  passkey option, the two-factor step when an account has it turned on, and a
 *  link over to /signup for newcomers. */
export default function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signInWithPasskey, submitTotp, submitRecoveryCode } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [signingInWithPasskey, setSigningInWithPasskey] = useState(false);
  const [error, setError] = useState<AuthErrorCopy | null>(null);

  const target = siteRelativeTarget(searchParams.get('redirect'));
  const authed = () => navigate(target, { replace: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (totpRequired) {
        const result = useRecoveryCode
          ? await submitRecoveryCode(email, password, totpCode)
          : await submitTotp(email, password, totpCode);

        if (result.status === 'authenticated') {
          authed();
        } else {
          setError({
            title: 'That code didn’t work',
            description: useRecoveryCode ? 'Check the recovery code and try again.' : 'Check the 6-digit code and try again.',
          });
        }
      } else {
        const result = await signIn(email, password);
        if (result.status === 'authenticated') {
          authed();
        } else if (result.status === 'totp_required') {
          setTotpRequired(true);
        } else {
          setError(describeAuthError(new Error('bad_credentials')));
        }
      }
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setSigningInWithPasskey(true);
    setError(null);
    try {
      await signInWithPasskey();
      authed();
    } catch (err: any) {
      const errMsg = err?.message || '';
      const cancelled =
        /not_validated|challenge_not_found|not allowed|timed out/i.test(errMsg) || err?.name === 'NotAllowedError';

      if (cancelled) {
        setError({
          title: 'Passkey sign-in cancelled',
          description: 'No passkey is set up for this site yet, or the prompt was dismissed. Sign in with your email below.',
        });
      } else {
        setError(describeAuthError(err));
      }
    } finally {
      setSigningInWithPasskey(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[360px] w-[360px] rounded-full bg-rose/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <SoulLogo />
        </div>

        <div className="rounded-2xl border bg-card/80 p-6 shadow-2xl backdrop-blur sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-soft">Welcome back</p>
          <h1 className="mt-2 font-display text-3xl font-black italic tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {totpRequired ? 'Enter the code from your authenticator app.' : 'Sign in with the email you signed up with.'}
          </p>

          {error && (
            <div role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-semibold text-destructive">{error.title}</p>
              <p className="mt-0.5 text-muted-foreground">{error.description}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {totpRequired ? (
              <>
                <Input
                  type="text"
                  inputMode={useRecoveryCode ? 'text' : 'numeric'}
                  placeholder={useRecoveryCode ? 'Enter a recovery code' : 'Enter 6-digit code'}
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(
                      useRecoveryCode
                        ? e.target.value.toUpperCase().slice(0, 39)
                        : e.target.value.replace(/\D/g, '').slice(0, 6),
                    )
                  }
                  maxLength={useRecoveryCode ? 39 : 6}
                  className={
                    useRecoveryCode
                      ? 'text-center font-mono text-base tracking-wider'
                      : 'text-center text-lg tracking-widest'
                  }
                  autoFocus
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-sm"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode);
                    setTotpCode('');
                  }}
                >
                  {useRecoveryCode ? 'Use authenticator app instead' : 'Use a recovery code instead'}
                </Button>
              </>
            ) : (
              <>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
                <div className="space-y-1.5">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <div className="text-right">
                    <Link
                      to="/auth/reset"
                      className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full bg-gold font-semibold text-[#160d1c] hover:bg-gold-soft" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Sign In
            </Button>

            {!totpRequired && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handlePasskeySignIn}
                disabled={signingInWithPasskey || loading}
              >
                {signingInWithPasskey ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                Use a passkey
              </Button>
            )}
          </form>

          {totpRequired ? (
            <button
              type="button"
              onClick={() => {
                setTotpRequired(false);
                setTotpCode('');
                setUseRecoveryCode(false);
                setError(null);
              }}
              className="mt-6 block w-full text-center text-sm text-gold-soft underline-offset-4 hover:underline"
            >
              Back to sign in
            </button>
          ) : (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New to SOUL MUSIC?{' '}
              <Link
                to={withRedirect('/signup', target)}
                className="font-medium text-gold-soft underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
