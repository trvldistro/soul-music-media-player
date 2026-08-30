import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Key, Smartphone, Lock, LogOut, AlertCircle, CheckCircle2, Copy, Download, Plus, Trash2, Edit2, ArrowLeft, Loader2 } from 'lucide-react';

const SecurityPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, listIdentities, removeIdentity, renameIdentity, addPasskey, enrollTotp, confirmTotp, disableTotp, regenerateRecoveryCodes, changePassword, logoutAllDevices, reauthenticate } = useAuth();

  const [identities, setIdentities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reauthPassword, setReauthPassword] = useState('');
  const [showReauth, setShowReauth] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // TOTP enrollment
  const [showTotpEnroll, setShowTotpEnroll] = useState(false);
  const [totpEnrollment, setTotpEnrollment] = useState<any>(null);
  const [totpCode, setTotpCode] = useState('');
  const [enrollingTotp, setEnrollingTotp] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  // Add passkey
  const [showAddPasskey, setShowAddPasskey] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [addingPasskey, setAddingPasskey] = useState(false);

  // Rename identity
  const [renamingIdentity, setRenamingIdentity] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { state: { from: '/account/security' } });
      return;
    }
    loadIdentities();
  }, [authLoading, user]);

  const loadIdentities = async () => {
    try {
      const data = await listIdentities();
      setIdentities(data);
    } catch {
      toast.error('Error', { description: 'Could not load security settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReauthRequired = (action: () => Promise<void>) => {
    setPendingAction(() => action);
    setShowReauth(true);
  };

  const handleReauthSubmit = async () => {
    if (!pendingAction) return;
    try {
      await reauthenticate(reauthPassword);
      setShowReauth(false);
      setReauthPassword('');
      await pendingAction();
      setPendingAction(null);
    } catch (err: any) {
      if (err.message?.includes('bad_credentials')) {
        toast.error('Error', { description: 'Incorrect password' });
      } else {
        toast.error('Error', { description: 'Reauthentication failed' });
      }
    }
  };

  const handleRemoveIdentity = async (identity: any) => {
    if (!confirm(`Remove ${identity.label || identity.type}?`)) return;

    try {
      await removeIdentity(identity.uuid);
      toast.success('Success', { description: 'Login method removed successfully.' });
      loadIdentities();
    } catch (err: any) {
      if (err.message?.includes('cannot_remove_last_login_method')) {
        toast.error('Cannot remove', { description: 'You must have at least one login method.' });
      } else if (err.message?.includes('reauth_required')) {
        handleReauthRequired(() => handleRemoveIdentity(identity));
      } else {
        toast.error('Error', { description: 'Could not remove login method.' });
      }
    }
  };

  const handleRenameIdentity = async () => {
    if (!renamingIdentity || !newLabel.trim()) return;
    setSavingRename(true);
    try {
      await renameIdentity(renamingIdentity, newLabel);
      toast.success('Success', { description: 'Passkey renamed successfully.' });
      setRenamingIdentity(null);
      setNewLabel('');
      loadIdentities();
    } catch (err) {
      toast.error('Error', { description: 'Could not rename passkey.' });
    } finally {
      setSavingRename(false);
    }
  };

  const handleAddPasskey = async () => {
    setAddingPasskey(true);
    try {
      const action = async () => {
        await addPasskey(passkeyName || undefined);
        toast.success('Success', { description: 'Passkey added successfully.' });
        setShowAddPasskey(false);
        setPasskeyName('');
        loadIdentities();
      };
      await action();
    } catch (err: any) {
      if (err.message?.includes('reauth_required')) {
        handleReauthRequired(async () => {
          await addPasskey(passkeyName || undefined);
          toast.success('Success', { description: 'Passkey added successfully.' });
          setShowAddPasskey(false);
          setPasskeyName('');
          loadIdentities();
        });
      } else if (err.message?.includes('not_validated') || err.message?.includes('challenge_not_found')) {
        toast.error('Cancelled', { description: 'Passkey creation was cancelled.' });
      } else {
        toast.error('Error', {
          description: `Could not add passkey: ${(err && (err.name || err.message)) || 'unknown error'}`,
        });
      }
    } finally {
      setAddingPasskey(false);
    }
  };

  const handleEnrollTotp = async () => {
    setEnrollingTotp(true);
    try {
      const action = async () => {
        const enrollment = await enrollTotp();
        setTotpEnrollment(enrollment);
        setShowTotpEnroll(true);
      };
      await action();
    } catch (err: any) {
      if (err.message?.includes('reauth_required')) {
        handleReauthRequired(async () => {
          const enrollment = await enrollTotp();
          setTotpEnrollment(enrollment);
          setShowTotpEnroll(true);
        });
      } else if (err.message?.includes('totp_already_enabled')) {
        toast.error('Already enabled', {
          description: 'Two-factor authentication is already enabled.',
        });
      } else {
        toast.error('Error', { description: 'Could not start enrollment.' });
      }
    } finally {
      setEnrollingTotp(false);
    }
  };

  const handleConfirmTotp = async () => {
    if (!totpCode || totpCode.length !== 6) {
      toast.error('Invalid code', {
        description: 'Enter the 6-digit code from your authenticator app.',
      });
      return;
    }
    setEnrollingTotp(true);
    try {
      const result = await confirmTotp(totpCode);
      setRecoveryCodes(result.recoveryCodes);
      setShowRecoveryCodes(true);
      setShowTotpEnroll(false);
      setTotpEnrollment(null);
      setTotpCode('');
      loadIdentities();
    } catch (err: any) {
      if (err.message?.includes('invalid_code')) {
        toast.error('Invalid code', { description: 'The code you entered is incorrect.' });
      } else if (err.message?.includes('reauth_required')) {
        handleReauthRequired(async () => {
          const result = await confirmTotp(totpCode);
          setRecoveryCodes(result.recoveryCodes);
          setShowRecoveryCodes(true);
          setShowTotpEnroll(false);
          setTotpEnrollment(null);
          setTotpCode('');
          loadIdentities();
        });
      } else {
        toast.error('Error', { description: 'Could not enable two-factor authentication.' });
      }
    } finally {
      setEnrollingTotp(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!confirm('Disable two-factor authentication? Your account will be less secure.')) return;
    try {
      const action = async () => {
        await disableTotp();
        toast.success('Success', { description: 'Two-factor authentication disabled.' });
        loadIdentities();
      };
      await action();
    } catch (err: any) {
      if (err.message?.includes('reauth_required')) {
        handleReauthRequired(async () => {
          await disableTotp();
          toast.success('Success', { description: 'Two-factor authentication disabled.' });
          loadIdentities();
        });
      } else {
        toast.error('Error', { description: 'Could not disable two-factor authentication.' });
      }
    }
  };

  const handleRegenerateCodes = async () => {
    if (!confirm('Regenerate recovery codes? Your old codes will stop working immediately.')) return;
    try {
      const action = async () => {
        const result = await regenerateRecoveryCodes();
        setRecoveryCodes(result.recoveryCodes);
        setShowRecoveryCodes(true);
      };
      await action();
    } catch (err: any) {
      if (err.message?.includes('reauth_required')) {
        handleReauthRequired(async () => {
          const result = await regenerateRecoveryCodes();
          setRecoveryCodes(result.recoveryCodes);
          setShowRecoveryCodes(true);
        });
      } else {
        toast.error('Error', { description: 'Could not regenerate recovery codes.' });
      }
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Mismatch', { description: 'New passwords do not match.' });
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Success', { description: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err.message?.includes('bad_credentials')) {
        toast.error('Incorrect password', { description: 'Your current password is incorrect.' });
      } else if (err.message?.includes('insufficient_password_complexity')) {
        toast.error('Weak password', {
          description: 'Choose a stronger password with at least 8 characters.',
        });
      } else {
        toast.error('Error', { description: 'Could not change password.' });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Sign out of all other devices? You will stay signed in on this device.')) return;
    try {
      const action = async () => {
        await logoutAllDevices();
        toast.success('Success', { description: 'Signed out of all other devices.' });
      };
      await action();
    } catch (err: any) {
      if (err.message?.includes('reauth_required')) {
        handleReauthRequired(async () => {
          await logoutAllDevices();
          toast.success('Success', { description: 'Signed out of all other devices.' });
        });
      } else {
        toast.error('Error', { description: 'Could not sign out other devices.' });
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Copied', { description: 'Copied to clipboard.' });
  };

  const downloadRecoveryCodes = () => {
    const text = recoveryCodes.join('\n');
    const blob = new Blob([`Your recovery codes:\n\n${text}\n\nKeep these safe! Each code can only be used once.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getIdentityIcon = (type: string) => {
    switch (type) {
      case 'password': return <Key size={16} />;
      case 'google': return <span className="text-base">G</span>;
      case 'facebook': return <span className="text-base">f</span>;
      case 'apple': return <span className="text-base"></span>;
      case 'webauthn': return <Smartphone size={16} />;
      case 'totp': return <Lock size={16} />;
      default: return <Shield size={16} />;
    }
  };

  const getIdentityLabel = (identity: any) => {
    if (identity.label) return identity.label;
    switch (identity.type) {
      case 'password': return 'Password';
      case 'google': return 'Google';
      case 'facebook': return 'Facebook';
      case 'apple': return 'Apple';
      case 'webauthn': return 'Passkey';
      case 'totp': return 'Authenticator App';
      default: return identity.type;
    }
  };

  const totpEnabled = identities.some(i => i.type === 'totp');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
            </Button>
            <Shield className="text-blue-600" size={20} />
            <span className="font-semibold">Security</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {user?.firstName || user?.email}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Login Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Login Methods</CardTitle>
            <CardDescription>Manage how you sign in to your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {identities.map((identity) => (
              <div key={identity.uuid} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    {getIdentityIcon(identity.type)}
                  </div>
                  <div>
                    <div className="font-medium">{getIdentityLabel(identity)}</div>
                    {identity.type === 'webauthn' && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground"
                        onClick={() => { setRenamingIdentity(identity.uuid); setNewLabel(identity.label || 'Passkey'); }}
                      >
                        <Edit2 size={12} className="mr-1" /> Rename
                      </Button>
                    )}
                    {identity.status === 'pending' && (
                      <Badge variant="outline" className="ml-2">Pending</Badge>
                    )}
                  </div>
                </div>
                {identity.canDelete && identity.type !== 'totp' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveIdentity(identity)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddPasskey(true)} className="gap-2">
                <Plus size={16} /> Add Passkey
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>Add an extra layer of security to your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {totpEnabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 size={18} />
                  <span className="font-medium">Two-factor authentication is enabled</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleRegenerateCodes} className="gap-2">
                    <Copy size={16} /> Regenerate Recovery Codes
                  </Button>
                  <Button variant="destructive" onClick={handleDisableTotp}>
                    Disable 2FA
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={handleEnrollTotp} disabled={enrollingTotp} className="gap-2">
                {enrollingTotp ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Enable Two-Factor Authentication
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}>
              {changingPassword ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out Everywhere */}
        <Card>
          <CardHeader>
            <CardTitle>Sign Out Everywhere</CardTitle>
            <CardDescription>Sign out of all other devices except this one</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleLogoutAll} className="gap-2">
              <LogOut size={16} /> Sign Out All Other Devices
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Reauth Dialog */}
      <Dialog open={showReauth} onOpenChange={setShowReauth}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your identity</DialogTitle>
            <DialogDescription>
              For your security, please enter your password to continue.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Your password"
            value={reauthPassword}
            onChange={(e) => setReauthPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleReauthSubmit()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReauth(false); setReauthPassword(''); setPendingAction(null); }}>
              Cancel
            </Button>
            <Button onClick={handleReauthSubmit}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Passkey Dialog */}
      <Dialog open={showAddPasskey} onOpenChange={setShowAddPasskey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Passkey</DialogTitle>
            <DialogDescription>
              Passkeys let you sign in without a password using your device's biometrics or PIN.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Passkey name (optional)"
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddPasskey(false); setPasskeyName(''); }}>
              Cancel
            </Button>
            <Button onClick={handleAddPasskey} disabled={addingPasskey}>
              {addingPasskey ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Add Passkey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOTP Enrollment Dialog */}
      <Dialog open={showTotpEnroll} onOpenChange={setShowTotpEnroll}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Authenticator App</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          {totpEnrollment && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpEnrollment.otpauthUri)}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Or enter this code manually:</p>
                <code className="bg-muted px-3 py-2 rounded text-sm select-all">{totpEnrollment.secret}</code>
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2"
                  onClick={() => copyToClipboard(totpEnrollment.secret)}
                >
                  <Copy size={12} className="mr-1" /> Copy
                </Button>
              </div>
              <Input
                placeholder="Enter 6-digit code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTotpEnroll(false); setTotpEnrollment(null); setTotpCode(''); }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmTotp} disabled={enrollingTotp || !totpCode || totpCode.length !== 6}>
              {enrollingTotp ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recovery Codes Dialog */}
      <Dialog open={showRecoveryCodes} onOpenChange={setShowRecoveryCodes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recovery Codes</DialogTitle>
            <DialogDescription>
              Save these codes in a safe place. You can use them to sign in if you lose access to your authenticator app.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-yellow-600 shrink-0" size={20} />
            <div className="text-sm text-yellow-800">
              <strong>Important:</strong> Each code can only be used once. Store them securely.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((code, i) => (
              <div key={i} className="bg-muted p-2 rounded select-all">{code}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => copyToClipboard(recoveryCodes.join('\n'))} className="flex-1 gap-2">
              <Copy size={16} /> Copy All
            </Button>
            <Button variant="outline" onClick={downloadRecoveryCodes} className="flex-1 gap-2">
              <Download size={16} /> Download
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowRecoveryCodes(false); setRecoveryCodes([]); }}>
              I've Saved Them
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Identity Dialog */}
      <Dialog open={!!renamingIdentity} onOpenChange={() => { setRenamingIdentity(null); setNewLabel(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Passkey</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Passkey name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameIdentity()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenamingIdentity(null); setNewLabel(''); }}>
              Cancel
            </Button>
            <Button onClick={handleRenameIdentity} disabled={savingRename || !newLabel.trim()}>
              {savingRename ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecurityPage;
