import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SignInPage from './SignInPage';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function mockSession(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    signedIn: false,
    loading: false,
    signIn: vi.fn(async () => ({ status: 'authenticated' })),
    signInWithPasskey: vi.fn(),
    submitTotp: vi.fn(async () => ({ status: 'authenticated' })),
    submitRecoveryCode: vi.fn(async () => ({ status: 'authenticated' })),
    ...overrides,
  });
}

beforeEach(() => mockSession());

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'fan@example.com' } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'long enough pass' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
}

describe('SignInPage', () => {
  it('shows a returning user the sign-in form with a route to sign up', () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(screen.getByPlaceholderText('Email')).toBeVisible();
    expect(screen.getByPlaceholderText('Password')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/auth/reset');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  // @kliv-spec-derived — a regular who mis-types a password needs "wrong email or password", not a stack trace.
  it('explains wrong credentials in plain English', async () => {
    mockSession({ signIn: vi.fn(async () => { throw new Error('bad_credentials'); }) });

    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>,
    );

    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/wrong email or password/i);
  });

  it('asks for the two-factor code when the account has it enabled', async () => {
    mockSession({ signIn: vi.fn(async () => ({ status: 'totp_required' })) });

    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>,
    );

    fillAndSubmit();

    expect(await screen.findByPlaceholderText('Enter 6-digit code')).toBeVisible();
    expect(screen.queryByPlaceholderText('Password')).toBeNull();
  });
});
