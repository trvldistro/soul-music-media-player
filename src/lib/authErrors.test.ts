import { describe, expect, it } from 'vitest';
import { describeAuthError, siteRelativeTarget, withRedirect } from './authErrors';

// @kliv-spec-derived — from user intent: "i cannot seem to create an account" — the failures
// that stop a signup must say what happened and what to do next, never a bare "something went wrong".
describe('describeAuthError', () => {
  it('tells a repeat email that the account exists and to sign in instead', () => {
    // The exact message the live API returns for a duplicate email.
    const copy = describeAuthError(new Error('Email is already registered to another user'));
    expect(copy.title).toMatch(/already has an account/i);
    expect(copy.isDuplicateEmail).toBe(true);
  });

  it('also recognizes the platform code form', () => {
    expect(describeAuthError(new Error('email_exists')).isDuplicateEmail).toBe(true);
  });

  it('explains a rejected weak password without blaming the visitor', () => {
    // The exact message the live API returns for a compromised password.
    const copy = describeAuthError(
      new Error('This password appears in a list of weak or compromised passwords. Please choose a stronger password.'),
    );
    expect(copy.title).toMatch(/too easy to guess/i);
    expect(copy.description).toMatch(/8 characters/i);
  });

  it('calls out wrong credentials on sign-in', () => {
    expect(describeAuthError(new Error('bad_credentials')).title).toMatch(/wrong email or password/i);
  });

  it('falls back to a friendly generic message for anything unrecognized', () => {
    const copy = describeAuthError(new Error('gateway hiccup'));
    expect(copy.title).toMatch(/something went wrong/i);
    expect(copy.isDuplicateEmail).toBeFalsy();
  });

  it('handles non-Error throwables', () => {
    expect(describeAuthError(undefined).title).toMatch(/something went wrong/i);
  });
});

describe('redirect helpers', () => {
  it('keeps site-relative targets and drops off-site ones', () => {
    expect(siteRelativeTarget('/library?genre=soul')).toBe('/library?genre=soul');
    expect(siteRelativeTarget('//evil.example/steal')).toBe('/');
    expect(siteRelativeTarget('https://evil.example/steal')).toBe('/');
    expect(siteRelativeTarget(null)).toBe('/');
  });

  it('carries a post-login target onto the sibling auth page', () => {
    expect(withRedirect('/signin', '/account?x=1')).toBe('/signin?redirect=%2Faccount%3Fx%3D1');
    expect(withRedirect('/signup', '/')).toBe('/signup');
  });
});
