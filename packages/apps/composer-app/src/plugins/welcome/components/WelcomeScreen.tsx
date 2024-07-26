//
// Copyright 2024 DXOS.org
//

import React, { useRef, useState } from 'react';

import { ClientAction } from '@braneframe/plugin-client/meta';
import { SpaceAction } from '@braneframe/plugin-space/meta';
import { NavigationAction, useIntentDispatcher } from '@dxos/app-framework';
import { type Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { PublicKey, useClient } from '@dxos/react-client';
import { isSpace } from '@dxos/react-client/echo';
import { type Identity, useIdentity } from '@dxos/react-client/halo';

import { Welcome, WelcomeState } from './Welcome';
import { removeQueryParamByValue } from '../../../util';
import { activateAccount } from '../credentials';

export const WelcomeScreen = ({ hubUrl, firstRun }: { hubUrl: string; firstRun?: Trigger }) => {
  const client = useClient();
  const identity = useIdentity();
  const dispatch = useIntentDispatcher();
  const [state, setState] = useState<WelcomeState>(WelcomeState.INIT);
  const [error, setError] = useState(false);
  const pendingRef = useRef(false);

  const searchParams = new URLSearchParams(window.location.search);
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');

  const handleSignup = async (email: string) => {
    if (email.length === 0 || pendingRef.current) {
      return;
    }

    if (error) {
      setError(false);
    }

    try {
      // Prevent multiple signups.
      pendingRef.current = true;
      // Post signup.
      const url = new URL('/account/signup', hubUrl);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const { token } = await response.json();
      if (token) {
        // Debugging link.
        const activationLink = new URL('/', window.location.href);
        activationLink.searchParams.set('token', token);
        // eslint-disable-next-line
        console.log(activationLink.href);
      }

      setState(WelcomeState.EMAIL_SENT);
    } catch (err) {
      log.catch(err);
      setError(true);
    } finally {
      pendingRef.current = false;
    }
  };

  const handleJoinIdentity = async () => {
    await dispatch({ action: ClientAction.JOIN_IDENTITY });
  };

  const handleSpaceInvitation = async () => {
    const identityResult = await dispatch({ action: ClientAction.CREATE_IDENTITY });
    const identity = identityResult?.data as Identity | undefined;
    if (!identity) {
      return;
    }

    firstRun?.wake();
    const result = await dispatch({ action: SpaceAction.JOIN, data: { invitationCode: spaceInvitationCode } });
    spaceInvitationCode && removeQueryParamByValue(spaceInvitationCode);

    if (isSpace(result?.data.space)) {
      const space = result?.data.space;
      const credentials = await client.halo.queryCredentials();
      const spaceCredential = credentials.find((credential) => {
        if (credential.subject.assertion['@type'] !== 'dxos.halo.credentials.SpaceMember') {
          return false;
        }
        const spaceKey = credential.subject.assertion.spaceKey;
        return spaceKey instanceof PublicKey && spaceKey.equals(space.key);
      });

      if (spaceCredential) {
        await activateAccount({ hubUrl, identity, referrer: spaceCredential.issuer });
      } else {
        // Log but continue so as not to block access to composer due to unexpected error.
        log.error('space credential not found', { spaceId: space.id });
      }

      await dispatch([
        {
          action: NavigationAction.CLOSE,
          data: { activeParts: { fullScreen: 'surface:WelcomeScreen', main: client.spaces.default.id } },
        },
        { action: NavigationAction.OPEN, data: { activeParts: { main: space.id } } },
      ]);
    }
  };

  return (
    <Welcome
      state={state}
      identity={identity}
      error={error}
      onSignup={handleSignup}
      onJoinIdentity={!identity && !spaceInvitationCode ? handleJoinIdentity : undefined}
      onSpaceInvitation={spaceInvitationCode ? handleSpaceInvitation : undefined}
    />
  );
};
