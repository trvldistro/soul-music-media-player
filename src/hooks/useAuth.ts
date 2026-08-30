import { useCallback, useEffect, useState } from 'react';
import auth from '@/lib/shared/kliv-auth.js';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await auth.getUser(true);
      setUser(fetched);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    auth.getUser().then((u: any) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await auth.signIn(email, password);
    if (result.status === 'authenticated') {
      setUser(result.user);
    }
    return result;
  };

  const signInWithPasskey = async () => {
    const u = await auth.signInWithPasskey();
    setUser(u);
    return u;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const u = await auth.signUp(email, password, name);
    setUser(u);
    return u;
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
  };

  // The five fields PUT /api/v2/auth/user accepts. It takes user metadata as `metadata` but
  // returns it as `userMetadata`, and the write replaces the whole map — read the current map
  // and merge onto it (see @/lib/authAccount) or the keys you omit are deleted.
  const updateUser = async (updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    metadata?: Record<string, string>;
  }) => {
    return await auth.updateUser(updates);
  };

  const submitTotp = async (email: string, password: string, code: string) => {
    const result = await auth.submitTotp(email, password, code);
    if (result.status === 'authenticated') {
      setUser(result.user);
    }
    return result;
  };

  const submitRecoveryCode = async (email: string, password: string, code: string) => {
    const result = await auth.submitRecoveryCode(email, password, code);
    if (result.status === 'authenticated') {
      setUser(result.user);
    }
    return result;
  };

  const getOAuthProviders = async () => {
    return await auth.getOAuthProviders();
  };

  const signInWithOAuth = async (provider: string) => {
    return await auth.signInWithOAuth(provider as any);
  };

  const listIdentities = async () => {
    return await auth.listIdentities();
  };

  const removeIdentity = async (identityUuid: string) => {
    return await auth.removeIdentity(identityUuid);
  };

  const renameIdentity = async (identityUuid: string, label: string) => {
    return await auth.renameIdentity(identityUuid, label);
  };

  const addPasskey = async (name?: string) => {
    return await auth.addPasskey(name);
  };

  const enrollTotp = async () => {
    return await auth.enrollTotp();
  };

  const confirmTotp = async (code: string) => {
    return await auth.confirmTotp(code);
  };

  const disableTotp = async () => {
    return await auth.disableTotp();
  };

  const regenerateRecoveryCodes = async () => {
    return await auth.regenerateRecoveryCodes();
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    return await auth.changePassword(currentPassword, newPassword);
  };

  const logoutAllDevices = async () => {
    return await auth.logoutAllDevices();
  };

  const reauthenticate = async (password: string) => {
    return await auth.reauthenticate(password);
  };

  return {
    user,
    loading,
    signedIn: user !== null,
    refresh,
    signIn,
    signInWithPasskey,
    signUp,
    signOut,
    updateUser,
    submitTotp,
    submitRecoveryCode,
    getOAuthProviders,
    signInWithOAuth,
    listIdentities,
    removeIdentity,
    renameIdentity,
    addPasskey,
    enrollTotp,
    confirmTotp,
    disableTotp,
    regenerateRecoveryCodes,
    changePassword,
    logoutAllDevices,
    reauthenticate,
  };
}
