//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientOperation } from '@dxos/plugin-client/operations';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { type InvitationResult } from '@dxos/react-client/invitations';

import { removeQueryParamByValue } from '../../../util';
import { joinWaitlist, login, redeemAccountInvitation, validateInvitationCode } from '../credentials';
import { meta } from '../meta';
import { Welcome, WelcomeState } from './Welcome';

export const WELCOME_SCREEN = `${meta.id}.component.welcome-screen`;

export const WelcomeScreen = ({ hubUrl }: { hubUrl: string }) => {
  const searchProps = new URLSearchParams(window.location.search);
  const spaceInvitationCode = searchProps.get('spaceInvitationCode') ?? undefined;

  const client = useClient();
  const identity = useIdentity();
  const { invokePromise } = useOperationInvoker();
  const [state, setState] = useState<WelcomeState>(
    spaceInvitationCode ? WelcomeState.SPACE_INVITATION : WelcomeState.INIT,
  );
  const [error, setError] = useState(false);
  const pendingRef = useRef(false);

  const handleLogin = useCallback(
    async (email: string) => {
      if (email.length === 0 || pendingRef.current) {
        return;
      }

      if (error) {
        setError(false);
      }

      try {
        pendingRef.current = true;
        let result = await login({ hubUrl, email });

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

        if (result.token) {
          // Inline token: server matched the email and handed us a recovery
          // token. Redeem it to restore the existing identity.
          await invokePromise(ClientOperation.RedeemToken, { token: result.token });
          await invokePromise(LayoutOperation.UpdateDialog, { state: false });
          return;
        }
        // No inline token: either no Account for this email or production env
        // mailed the link out-of-band. Show the same "check your email" UI in
        // both cases so the response stays enumeration-safe.
        setState(WelcomeState.LOGIN_SENT);
      } catch (err) {
        log.catch(err);
        setError(true);
      } finally {
        pendingRef.current = false;
      }
    },
    [hubUrl, client, invokePromise, error],
  );

  const handlePasskey = useCallback(async () => {
    await invokePromise(ClientOperation.RedeemPasskey);
  }, [invokePromise]);

  const handleJoinIdentity = useCallback(async () => {
    await invokePromise(ClientOperation.JoinIdentity, {});
  }, [invokePromise]);

  const handleRecoverIdentity = useCallback(async () => {
    await invokePromise(ClientOperation.RecoverIdentity);
  }, [invokePromise]);

  const handleSpaceInvitation = async () => {
    let identityCreated = true;
    await invokePromise(ClientOperation.CreateIdentity, {}).catch(() => {
      // This will happen if the identity already exists.
      identityCreated = false;
    });
    const identity = client.halo.identity.get();
    if (!identity) {
      return;
    }

    const handleDone = async (result: InvitationResult | null) => {
      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      await invokePromise(LayoutOperation.SetLayoutMode, {
        subject: result?.target ?? undefined,
        mode: 'solo',
      });

      if (identityCreated) {
        await invokePromise(ClientOperation.CreateAgent);
      }
    };

    await invokePromise(SpaceOperation.Join, {
      invitationCode: spaceInvitationCode,
      onDone: handleDone,
    });
    spaceInvitationCode && removeQueryParamByValue(spaceInvitationCode);
  };

  const handleGoToLogin = useCallback(() => {
    setState(WelcomeState.INIT);
    // TODO(wittjosiah): Attempt to preserve the invitation code through the login flow.
    spaceInvitationCode && removeQueryParamByValue(spaceInvitationCode);
  }, []);

  const handleValidateInvitationCode = useCallback(
    async (code: string) => {
      try {
        return await validateInvitationCode({ hubUrl, code });
      } catch (err) {
        log.catch(err);
        return false;
      }
    },
    [hubUrl],
  );

  const handleCreateAccount = useCallback(
    async ({ code, email }: { code: string; email: string }) => {
      if (pendingRef.current) {
        return;
      }
      if (error) {
        setError(false);
      }
      pendingRef.current = true;
      try {
        const ensureIdentity = async () => {
          if (identity) {
            return identity;
          }
          await invokePromise(ClientOperation.CreateIdentity, {
            displayName: email.split('@')[0],
          });
          return client.halo.identity.get();
        };

        const resolvedIdentity = await ensureIdentity();
        invariant(resolvedIdentity, 'identity should exist after create');

        const result = await redeemAccountInvitation({
          hubUrl,
          email,
          identityKey: resolvedIdentity.identityKey.toHex(),
          code: code.replace(/-/g, '').toUpperCase(),
        });
        if ('loginToken' in result) {
          await invokePromise(ClientOperation.RedeemToken, { token: result.loginToken });
        } else if ('accountId' in result) {
          log.info('account created', { accountId: result.accountId });
          void invokePromise(ClientOperation.CreateAgent);
        }
        await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      } catch (err) {
        log.catch(err);
        setError(true);
      } finally {
        pendingRef.current = false;
      }
    },
    [hubUrl, identity, client, invokePromise, error],
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
          identityKey: identity?.identityKey.toHex(),
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
    <Welcome
      state={state}
      error={error}
      identity={identity}
      onEmailLogin={handleLogin}
      onPasskey={!identity ? handlePasskey : undefined}
      onJoinIdentity={!identity ? handleJoinIdentity : undefined}
      onRecoverIdentity={!identity ? handleRecoverIdentity : undefined}
      onValidateInvitationCode={!identity ? handleValidateInvitationCode : undefined}
      onCreateAccount={!identity ? handleCreateAccount : undefined}
      onJoinWaitlist={handleJoinWaitlist}
      onSpaceInvitation={spaceInvitationCode ? handleSpaceInvitation : undefined}
      onGoToLogin={handleGoToLogin}
    />
  );
};
