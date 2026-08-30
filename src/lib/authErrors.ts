// The auth SDK surfaces only the server's message text (for example
// "Email is already registered to another user"), so both platform codes and
// phrasings are matched here. Every sign-up/sign-in failure the UI can hit is
// turned into copy safe to show a fan, with an action to take next.

export interface AuthErrorCopy {
  title: string;
  description: string;
  /** Duplicate email on sign-up: the page offers a jump over to sign-in. */
  isDuplicateEmail?: boolean;
}

/** Only site-relative paths are honored as post-login targets; everything else goes home. */
export const siteRelativeTarget = (target: string | null | undefined): string =>
  target && target.startsWith('/') && !target.startsWith('//') ? target : '/';

/** Carry a post-login target onto a sibling auth page (/signin <-> /signup). */
export function withRedirect(path: string, target: string): string {
  return target && target !== '/' ? `${path}?redirect=${encodeURIComponent(target)}` : path;
}

const messageOf = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '';
};

export function describeAuthError(err: unknown): AuthErrorCopy {
  const msg = messageOf(err);

  if (/email_exists/i.test(msg) || /already registered|already exists|already has an account/i.test(msg)) {
    return {
      title: 'That email already has an account',
      description: 'It was registered before — sign in with that email instead of creating a new one.',
      isDuplicateEmail: true,
    };
  }

  if (
    /insufficient_password_complexity/i.test(msg) ||
    /weak or compromised|password (is )?too (common|weak|simple|easy)/i.test(msg)
  ) {
    return {
      title: 'That password is too easy to guess',
      description: 'Use at least 8 characters and skip common words like “password123”.',
    };
  }

  if (
    /bad_credentials/i.test(msg) ||
    /invalid (email or password|credentials)|wrong (email or password|password or email)/i.test(msg)
  ) {
    return {
      title: 'Wrong email or password',
      description: 'Double-check both — or use “Forgot password?” below to reset it.',
    };
  }

  if (/invalid_code|invalid_recovery_code/i.test(msg)) {
    return {
      title: 'That code didn’t work',
      description: 'Check the code and try again.',
    };
  }

  return {
    title: 'Something went wrong',
    description: 'Give it another moment and try again.',
  };
}
