import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SignUpPage from './SignUpPage';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function mockSession(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    signedIn: false,
    loading: false,
    signUp: vi.fn(async () => ({})),
    signIn: vi.fn(async () => ({ status: 'authenticated' })),
    signInWithPasskey: vi.fn(),
    submitTotp: vi.fn(),
    submitRecoveryCode: vi.fn(),
    ...overrides,
  });
}

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Fan' } });
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'fan@example.com' } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'long enough pass' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
}

beforeEach(() => mockSession());

describe('SignUpPage', () => {
  it('shows a new visitor everything they need to create an account', () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    expect(screen.getByPlaceholderText('Your name')).toBeVisible();
    expect(screen.getByPlaceholderText('Email')).toBeVisible();
    expect(screen.getByPlaceholderText('Password')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin');
  });

  // @kliv-spec-derived — from user intent: trying to sign up with an email that already has an
  // account must say so and offer sign-in, not a generic failure.
  it('explains a duplicate email and links over to sign in', async () => {
    mockSession({ signUp: vi.fn(async () => { throw new Error('Email is already registered to another user'); }) });

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    );

    fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/already has an account/i);
    expect(screen.getByRole('link', { name: /go to sign in/i })).toBeVisible();
  });

  // @kliv-spec-derived — weak passwords are rejected server-side with jargon; the page must translate.
  it('explains a rejected weak password', async () => {
    mockSession({
      signUp: vi.fn(async () => {
        throw new Error('This password appears in a list of weak or compromised passwords. Please choose a stronger password.');
      }),
    });

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    );

    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/too easy to guess/i);
    // The duplicate-email shortcut must not appear for a different failure.
    expect(screen.queryByRole('link', { name: /go to sign in/i })).toBeNull();
  });
});
