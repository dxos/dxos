//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { LayoutAction, createIntent } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { log } from '@dxos/log';
import { ClientAction } from '@dxos/plugin-client/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { PublicKey, useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { type InvitationResult } from '@dxos/react-client/invitations';

import { removeQueryParamByValue } from '../../../util';
import { activateAccount, signup } from '../credentials';
import { meta } from '../meta';

import { Welcome, WelcomeState } from './Welcome';

export const WELCOME_SCREEN = `${meta.id}/component/WelcomeScreen`;
const TEST_EMAIL = 'test@dxos.org';

export const WelcomeScreen = ({ hubUrl }: { hubUrl: string }) => {
  const searchParams = new URLSearchParams(window.location.search);
  const spaceInvitationCode = searchParams.get('spaceInvitationCode') ?? undefined;

  const client = useClient();
  const identity = useIdentity();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
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

      if (email === TEST_EMAIL) {
        if (!identity) {
          await dispatch(
            createIntent(ClientAction.CreateIdentity, {
              displayName: 'Test User',
              data: { emoji: '🧪', hue: 'amber' },
            }),
          );
        }
        await dispatch(
          createIntent(LayoutAction.UpdateDialog, {
            part: 'dialog',
            options: { state: false },
          }),
        );
        return;
      }

      try {
        // Prevent multiple signups.
        pendingRef.current = true;
        const login = await signup({
          hubUrl,
          email,
          identity,
          redirectUrl: location.origin,
        });
        setState(login ? WelcomeState.LOGIN_SENT : WelcomeState.EMAIL_SENT);
      } catch (err) {
        log.catch(err);
        setError(true);
      } finally {
        pendingRef.current = false;
      }
    },
    [hubUrl, identity],
  );

  const handlePasskey = useCallback(async () => {
    await dispatch(createIntent(ClientAction.RedeemPasskey));
  }, [dispatch]);

  const handleJoinIdentity = useCallback(async () => {
    await dispatch(createIntent(ClientAction.JoinIdentity));
  }, [dispatch]);

  const handleRecoverIdentity = useCallback(async () => {
    await dispatch(createIntent(ClientAction.RecoverIdentity));
  }, [dispatch]);

  const handleSpaceInvitation = async () => {
    let identityCreated = true;
    await dispatch(createIntent(ClientAction.CreateIdentity)).catch(() => {
      // This will happen if the identity already exists.
      identityCreated = false;
    });
    const identity = client.halo.identity.get();
    if (!identity) {
      return;
    }

    const handleDone = async (result: InvitationResult | null) => {
      await dispatch(
        createIntent(LayoutAction.UpdateDialog, {
          part: 'dialog',
          options: { state: false },
        }),
      );
      await dispatch(
        createIntent(LayoutAction.SetLayoutMode, {
          part: 'mode',
          subject: result?.target ?? undefined,
          options: { mode: 'solo' },
        }),
      );

      if (identityCreated) {
        await dispatch(createIntent(ClientAction.CreateAgent));
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

    await dispatch(
      createIntent(SpaceAction.Join, {
        invitationCode: spaceInvitationCode,
        onDone: handleDone,
      }),
    );
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
