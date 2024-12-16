//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { LayoutAction, NavigationAction, useIntentDispatcher } from '@dxos/app-framework';
import { type Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { ClientAction } from '@dxos/plugin-client/meta';
import { SpaceAction } from '@dxos/plugin-space/meta';
import { PublicKey, useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { type InvitationResult } from '@dxos/react-client/invitations';

import { Welcome, WelcomeState } from './Welcome';
import { removeQueryParamByValue } from '../../../util';
import { activateAccount, signup } from '../credentials';

export const WelcomeScreen = ({ hubUrl, firstRun }: { hubUrl: string; firstRun?: Trigger }) => {
  const client = useClient();
  const identity = useIdentity();
  const dispatch = useIntentDispatcher();
  const [state, setState] = useState<WelcomeState>(WelcomeState.INIT);
  const [error, setError] = useState(false);
  const pendingRef = useRef(false);

  const searchParams = new URLSearchParams(window.location.search);
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');

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
        await signup({ hubUrl, email, identity, redirectUrl: location.origin });
        setState(WelcomeState.EMAIL_SENT);
      } catch (err) {
        log.catch(err);
        setError(true);
      } finally {
        pendingRef.current = false;
      }
    },
    [hubUrl, identity],
  );

  const handleJoinIdentity = useCallback(async () => {
    await dispatch({ action: ClientAction.JOIN_IDENTITY });
  }, [dispatch]);

  const handleRecoverIdentity = useCallback(async () => {
    await dispatch({ action: ClientAction.RECOVER_IDENTITY });
  }, [dispatch]);

  const handleSpaceInvitation = async () => {
    let identityCreated = true;
    await dispatch({ action: ClientAction.CREATE_IDENTITY }).catch(() => {
      identityCreated = false;
    });
    const identity = client.halo.identity.get();
    if (!identity) {
      return;
    }

    const handleDone = async (result: InvitationResult | null) => {
      await dispatch([
        {
          action: NavigationAction.CLOSE,
          data: { activeParts: { fullScreen: 'surface:WelcomeScreen', main: client.spaces.default.id } },
        },
        {
          action: LayoutAction.SET_LAYOUT_MODE,
          data: { layoutMode: 'solo' },
        },
      ]);

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
          log.info('activate', { hubUrl, identity, referrer: spaceCredential.issuer });
          try {
            await activateAccount({ hubUrl, identity, referrer: spaceCredential.issuer });
          } catch (err) {
            log.catch(err);
          }
        } else {
          // Log but continue so as not to block access to composer due to unexpected error.
          log.error('space credential not found', { spaceId: space.id });
        }
      }

      if (identityCreated) {
        await dispatch({ action: ClientAction.CREATE_RECOVERY_CODE });
        await dispatch({ action: ClientAction.CREATE_AGENT });
      }
    };

    firstRun?.wake();
    await dispatch({ action: SpaceAction.JOIN, data: { invitationCode: spaceInvitationCode, onDone: handleDone } });
    spaceInvitationCode && removeQueryParamByValue(spaceInvitationCode);
  };

  return (
    <Welcome
      state={state}
      identity={identity}
      error={error}
      onSignup={handleSignup}
      onJoinIdentity={!identity && !spaceInvitationCode ? handleJoinIdentity : undefined}
      onRecoverIdentity={!identity && !spaceInvitationCode ? handleRecoverIdentity : undefined}
      onSpaceInvitation={spaceInvitationCode ? handleSpaceInvitation : undefined}
    />
  );
};
