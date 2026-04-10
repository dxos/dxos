//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { ClientOperation } from '@dxos/plugin-client/operations';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { PublicKey, useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { type InvitationResult } from '@dxos/react-client/invitations';

import { removeQueryParamByValue } from '../../../util';
import { activateAccount, signup } from '../credentials';
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

  const handleSignup = useCallback(
    async (email: string) => {
      if (email.length === 0 || pendingRef.current) {
        return;
      }

      if (error) {
        setError(false);
      }

      try {
        // Prevent multiple signups.
        pendingRef.current = true;
        const result = await signup({
          hubUrl,
          email,
          identity,
          redirectUrl: location.origin,
        });

        // Test path: Hub returned a token immediately.
        if (result.token && result.type === 'verify') {
          const ensureIdentity = async () => {
            if (identity) {
              return identity;
            }
            await invokePromise(ClientOperation.CreateIdentity, {
              displayName: email.split('@')[0],
              data: { emoji: '🧪', hue: 'amber' },
            });
            return client.halo.identity.get();
          };

          const resolvedIdentity = await ensureIdentity();
          if (resolvedIdentity) {
            const credential = await activateAccount({
              hubUrl,
              identity: resolvedIdentity,
              token: result.token,
            });
            if (credential) {
              await client.halo.writeCredentials([credential]);
            }
            void invokePromise(ClientOperation.CreateAgent);
          }

          await invokePromise(LayoutOperation.UpdateDialog, { state: false });
          return;
        }

        // Normal path: wait for email verification.
        setState(result.login ? WelcomeState.LOGIN_SENT : WelcomeState.EMAIL_SENT);
      } catch (err) {
        log.catch(err);
        setError(true);
      } finally {
        pendingRef.current = false;
      }
    },
    [hubUrl, identity, client, invokePromise],
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

      const space = result?.spaceKey && client.spaces.get(result?.spaceKey);
      if (space) {
        const credentials = client.halo.queryCredentials();
        const spaceCredential = credentials.find((credential) => {
          if (credential.subject.assertion['@type'] !== 'dxos.halo.credentials.SpaceMember') {
            return false;
          }
          const spaceKey = credential.subject.assertion.spaceKey;
          return spaceKey instanceof PublicKey && spaceKey.equals(space.key);
        });

        if (spaceCredential) {
          log.info('activate', {
            hubUrl,
            identity,
            referrer: spaceCredential.issuer,
          });
          try {
            await activateAccount({
              hubUrl,
              identity,
              referrer: spaceCredential.issuer,
            });
          } catch (err) {
            log.catch(err);
          }
        } else {
          // Log but continue so as not to block access to composer due to unexpected error.
          log.error('space credential not found', { spaceId: space.id });
        }
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

  return (
    <Welcome
      state={state}
      error={error}
      identity={identity}
      onSignup={handleSignup}
      onPasskey={!identity ? handlePasskey : undefined}
      onJoinIdentity={!identity ? handleJoinIdentity : undefined}
      onRecoverIdentity={!identity ? handleRecoverIdentity : undefined}
      onSpaceInvitation={spaceInvitationCode ? handleSpaceInvitation : undefined}
      onGoToLogin={handleGoToLogin}
    />
  );
};
