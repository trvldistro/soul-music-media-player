import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SoulLogo } from '@/components/AppSidebar';
import { describeAuthError, siteRelativeTarget, withRedirect, type AuthErrorCopy } from '@/lib/authErrors';

/** Dedicated sign-up page for new visitors: name, email and password create a real
 *  account, and the visitor lands back wherever they were originally headed. */
export default function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthErrorCopy | null>(null);

  const target = siteRelativeTarget(searchParams.get('redirect'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, name);
      navigate(target, { replace: true });
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setLoading(false);
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-soft">Join the club</p>
          <h1 className="mt-2 font-display text-3xl font-black italic tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One account keeps your uploads, playlists and favorites tied to your email.
          </p>

          {error && (
            <div role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-semibold text-destructive">{error.title}</p>
              <p className="mt-0.5 text-muted-foreground">{error.description}</p>
              {error.isDuplicateEmail && (
                <Button asChild variant="link" className="mt-1 h-auto p-0 text-gold-soft">
                  <Link to={withRedirect('/signin', target)}>Go to sign in</Link>
                </Button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              disabled={loading}
            />
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
                minLength={8}
                autoComplete="new-password"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters — skip obvious ones like password123.
              </p>
            </div>
            <Button type="submit" className="w-full bg-gold font-semibold text-[#160d1c] hover:bg-gold-soft" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to={withRedirect('/signin', target)}
              className="font-medium text-gold-soft underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
