//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as Account from '@dxos/app-toolkit/Account';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { createDidFromIdentityKey } from '@dxos/credentials';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientOperation } from '@dxos/plugin-client';
import * as PasskeyError from '@dxos/plugin-client/PasskeyError';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { ThemeProvider, defaultTx } from '@dxos/react-ui';
import { getHostPlatform, isTauri } from '@dxos/util';

import { joinWaitlist, login } from '../../credentials/index.ts';
import { useForceDarkTheme } from '../../hooks/index.ts';
import { OnboardingOperation } from '../../operations/index.ts';
import { translations } from '../../translations.ts';
import { Welcome, type WelcomeError, WelcomeState, passkeyError } from './Welcome/index.ts';

const hostPlatform = isTauri() ? getHostPlatform() : undefined;

/**
 * The native iOS app is scoped down to passkey login while the other flows are unsupported there: no
 * sign-up, and no login method other than a passkey. iPadOS reports itself as macOS, so a multi-touch
 * screen tells it apart from a real Mac (which reports no touch points even with a trackpad).
 */
const passkeyOnly = hostPlatform === 'ios' || (hostPlatform === 'macos' && navigator.maxTouchPoints > 1);

/**
 * Whether the native app offers email sign-in. Off because the emailed link can only return to a web
 * origin — the app's own origin is a bundled `localhost` asset server no mail client can usefully
 * open — and the web app hands a link back to the native app only when `enableNativeRedirect` is
 * set, which still defaults to false. Until then the link would strand the user in a browser tab
 * instead of the app they started from, so the option is hidden rather than offered broken. Flip
 * this to true once native redirects are the default.
 */
const NATIVE_EMAIL_LOGIN_ENABLED: boolean = false;

const emailLoginEnabled = !passkeyOnly && (!isTauri() || NATIVE_EMAIL_LOGIN_ENABLED);

export const WelcomeScreen = ({ hubUrl }: { hubUrl: string }) => {
  const client = useClient();
  const identity = useIdentity();
  const { invokePromise } = useOperationInvoker();
  const [state, setState] = useState<WelcomeState>(WelcomeState.INIT);
  const [error, setError] = useState<WelcomeError | null>(null);
  const pendingRef = useRef(false);
  const hub = useMemo(() => Account.createHubClient(hubUrl), [hubUrl]);

  // The welcome screen always renders dark, regardless of the system theme.
  useForceDarkTheme();

  const handleLogin = useCallback(
    async (email: string) => {
      if (email.length === 0 || pendingRef.current) {
        return;
      }

      if (error) {
        setError(null);
      }

      try {
        pendingRef.current = true;
        let result = await login({ hubUrl, email, redirectUrl: window.location.origin });

        // Server signaled that this email needs a local identity to bind a
        // fresh Account (test-email carve-out): create one and retry.
        if (result.needsIdentity) {
          await invokePromise(ClientOperation.CreateIdentity, {
            displayName: email.split('@')[0],
          });
          const newIdentity = client.halo.identity.get();
          invariant(newIdentity, 'identity should exist after create');
          result = await login({
            hubUrl,
            email,
            identityDid: await createDidFromIdentityKey(newIdentity.identityKey),
            identityKey: newIdentity.identityKey.toHex(),
          });
        }

        if (result.admitted) {
          // Direct admission (e.g. fresh test Account just created): nothing
          // to recover, the identity is already local. Provision the agent and
          // dismiss the dialog.
          void invokePromise(ClientOperation.CreateAgent);
          await invokePromise(LayoutOperation.UpdateDialog, { state: false });
          return;
        }

        // Either no Account for this email or the link went out by email.
        // Show the same "check your email" UI in both cases so the response
        // stays enumeration-safe. When no Account exists hub-service silently
        // submits the email to the waitlist.
        setState(WelcomeState.LOGIN_SENT);
      } catch (err) {
        log.catch(err);
        setError('email');
      } finally {
        pendingRef.current = false;
      }
    },
    [hubUrl, client, invokePromise, error],
  );

  // `invokePromise` resolves with `{ error }` rather than rejecting, so a failed redemption is
  // invisible unless the result is inspected.
  const handlePasskey = useCallback(async () => {
    setError(null);
    // On success the onboarding manager dismisses this dialog off the back of the new identity.
    const { error: redeemError } = await invokePromise(ClientOperation.RedeemPasskey);
    if (redeemError) {
      log.catch(redeemError);
      setError(passkeyError(PasskeyError.classify(redeemError)));
    }
  }, [invokePromise]);

  const handleJoinIdentity = useCallback(async () => {
    await invokePromise(ClientOperation.JoinIdentity, {});
  }, [invokePromise]);

  const handleRecoverIdentity = useCallback(async () => {
    await invokePromise(ClientOperation.RecoverIdentity);
  }, [invokePromise]);

  const handleRecoverWithOAuth = useCallback(
    async (provider: string, loginHint?: string) => {
      if (pendingRef.current) {
        return;
      }
      if (error) {
        setError(null);
      }
      pendingRef.current = true;
      try {
        // Opens the provider auth in a new tab. Because atproto nullifies window.opener, the flow
        // can't relay back via postMessage; kms-service redirects the tab to /redirect/oauth-recovery,
        // where the welcome OAuthRecoveryRedirect module redeems the recovery proof and admits this
        // device. This call returns once the tab is open — completion happens out-of-band.
        const result = await invokePromise(OnboardingOperation.RedeemOAuthRecovery, { provider, loginHint });
        if (result.error) {
          throw result.error;
        }
      } catch (err) {
        log.catch(err);
        setError('oauth');
      } finally {
        pendingRef.current = false;
      }
    },
    [invokePromise, error],
  );

  const handleValidateInvitationCode = useCallback(
    (code: string) => EffectEx.runPromise(Account.checkAccessCode({ hub, code })),
    [hub],
  );

  const handleCreateAccount = useCallback(
    async ({ code, email }: { code: string; email: string }) => {
      if (pendingRef.current) {
        return;
      }
      if (error) {
        setError(null);
      }
      pendingRef.current = true;
      try {
        const ensureIdentity = Effect.gen(function* () {
          if (identity) {
            return identity;
          }
          // `invokePromise` resolves with `{ error }` rather than rejecting, so fail explicitly —
          // otherwise a failed creation only surfaces via the invariant below, as a defect.
          const { error: createError } = yield* Effect.promise(() =>
            invokePromise(ClientOperation.CreateIdentity, { displayName: email.split('@')[0] }),
          );
          if (createError) {
            return yield* Effect.fail(createError);
          }
          const created = client.halo.identity.get();
          invariant(created, 'identity should exist after create');
          return created;
        });

        // Errors are mapped to UI states inside the Effect — `runPromise` rejects with a
        // FiberFailure, so the typed errors are not matchable from a catch block.
        const outcome = await EffectEx.runPromise(
          Account.signUpWithEmail({ hub, email, code, ensureIdentity }).pipe(
            Effect.map(() => 'ok' as const),
            Effect.catchTag('EmailProbeUnavailableError', () => Effect.succeed('email-check-unavailable' as const)),
            Effect.catchTag('EmailAlreadyRegisteredError', () => Effect.succeed('account-exists' as const)),
            Effect.catch((err) =>
              Effect.sync(() => {
                log.catch(err);
                // Another signup can register the email between the probe and redemption, so the
                // server remains the final duplicate-email check.
                return Account.accountErrorType(err) === 'email_already_registered'
                  ? ('account-exists' as const)
                  : ('email' as const);
              }),
            ),
          ),
        );
        if (outcome !== 'ok') {
          setError(outcome);
          return;
        }
        void invokePromise(ClientOperation.CreateAgent);
        await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      } catch (err) {
        log.catch(err);
        setError('email');
      } finally {
        pendingRef.current = false;
      }
    },
    [hub, identity, client, invokePromise, error],
  );

  const handleCreateAccountWithOAuth = useCallback(
    async ({ code, provider, loginHint }: { code: string; provider: string; loginHint?: string }) => {
      if (pendingRef.current) {
        return;
      }
      if (error) {
        setError(null);
      }
      pendingRef.current = true;
      try {
        // Opens the provider auth in a new tab (OAuth-first: no local identity yet). Because atproto
        // nullifies window.opener, the flow can't relay back via postMessage; the invitation code +
        // hub URL are persisted, then kms-service redirects the tab to /redirect/oauth-recovery. The
        // welcome OAuthRecoveryRedirect module then creates the identity, completes registration, and
        // redeems this invitation code with the provider-verified email. This call returns once the
        // tab is open — completion happens out-of-band.
        const result = await invokePromise(OnboardingOperation.RegisterOAuthRecovery, {
          provider,
          loginHint,
          code,
          hubUrl,
        });
        if (result.error) {
          throw result.error;
        }
      } catch (err) {
        log.catch(err);
        setError('oauth');
      } finally {
        pendingRef.current = false;
      }
    },
    [hubUrl, invokePromise, error],
  );

  const handleJoinWaitlist = useCallback(
    async (email: string) => {
      if (pendingRef.current) {
        return;
      }
      pendingRef.current = true;
      try {
        await joinWaitlist({
          hubUrl,
          email,
          identityDid: identity ? await createDidFromIdentityKey(identity.identityKey) : undefined,
        });
        setState(WelcomeState.WAITLIST_SUBMITTED);
      } catch (err) {
        // Always succeed from the user's perspective -- the server is best-effort.
        log.catch(err);
        setState(WelcomeState.WAITLIST_SUBMITTED);
      } finally {
        pendingRef.current = false;
      }
    },
    [hubUrl, identity],
  );

  return (
    <ThemeProvider tx={defaultTx} themeMode='dark' resourceExtensions={translations}>
      <Welcome
        state={state}
        error={error}
        identity={identity}
        onEmailLogin={emailLoginEnabled ? handleLogin : undefined}
        onPasskey={!identity ? handlePasskey : undefined}
        onJoinIdentity={!identity && !passkeyOnly ? handleJoinIdentity : undefined}
        onRecoverIdentity={!identity && !passkeyOnly ? handleRecoverIdentity : undefined}
        onRecoverWithOAuth={!identity && !passkeyOnly ? handleRecoverWithOAuth : undefined}
        onValidateInvitationCode={!identity && !passkeyOnly ? handleValidateInvitationCode : undefined}
        onCreateAccount={!identity && !passkeyOnly ? handleCreateAccount : undefined}
        onCreateAccountWithOAuth={!identity && !passkeyOnly ? handleCreateAccountWithOAuth : undefined}
        onJoinWaitlist={!passkeyOnly ? handleJoinWaitlist : undefined}
      />
    </ThemeProvider>
  );
};
