//
// Copyright 2023 DXOS.org
//
import React, { useEffect } from 'react';

import { log } from '@dxos/log';
import { useClient, useIdentity } from '@dxos/react-client';
import { useId, useThemeContext, useTranslation } from '@dxos/react-components';

import { Panel, Content, Maxie, MaxieItem, Padding } from '../Panel';
import { JoinHeading } from './JoinHeading';
import { JoinPanelProps } from './JoinPanelProps';
import { useJoinMachine } from './joinMachine';
import {
  AdditionMethodSelector,
  IdentityInput,
  IdentityAdded,
  InvitationAuthenticator,
  InvitationRescuer,
  InvitationInput,
  InvitationAccepted
} from './view-states';

export const JoinPanel = ({
  mode = 'default',
  initialInvitationCode,
  exitActionParent,
  onExit,
  doneActionParent,
  onDone,
  preventExit
}: JoinPanelProps) => {
  const client = useClient();
  const identity = useIdentity();
  const titleId = useId('joinPanel__title');
  const { hasIosKeyboard } = useThemeContext();
  const { t } = useTranslation('os');
  const [joinState, joinSend, joinService] = useJoinMachine(client, {
    context: {
      mode,
      identity,
      ...(initialInvitationCode && {
        [mode === 'halo-only' ? 'halo' : 'space']: { unredeemedCode: initialInvitationCode }
      })
    }
  });

  useEffect(() => {
    const subscription = joinService.subscribe((state) => {
      log('[state]', state);
    });

    return subscription.unsubscribe;
  }, [joinService]);

  useEffect(() => {
    // TODO(thure): Validate if this is sufficiently synchronous for iOS to move focus. It might not be!
    const stateStack = joinState.configuration[0].id.split('.');
    const innermostState = stateStack[stateStack.length - 1];
    const autoFocusValue = innermostState === 'finishingJoining' ? 'successSpaceInvitation' : innermostState;
    const $nextAutofocus: HTMLElement | null = document.querySelector(`[data-autofocus~="${autoFocusValue}"]`);
    if ($nextAutofocus && !(hasIosKeyboard && $nextAutofocus.hasAttribute('data-prevent-ios-autofocus'))) {
      $nextAutofocus.focus();
    }
  }, [joinState.value, hasIosKeyboard]);

  const displayAvatar = [
    {
      choosingIdentity: {
        acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'successHaloInvitation' }
      }
    },
    'finishingJoiningHalo'
  ].some(joinState?.matches);

  const isChoosingIdentityMethod = joinState.matches({ choosingIdentity: 'choosingAuthMethod' });

  const isCreatingIdentity = joinState.matches({ choosingIdentity: 'creatingIdentity' });

  const isRecoveringIdentity = joinState.matches({ choosingIdentity: 'recoveringIdentity' });

  const isAcceptingInvitation = joinState.matches({
    choosingIdentity: { acceptingHaloInvitation: 'inputtingHaloInvitationCode' }
  });

  const isFailingOrConnectingHaloInvitation = [
    {
      choosingIdentity: {
        acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'connectingHaloInvitation' }
      }
    },
    {
      choosingIdentity: {
        acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'failingHaloInvitation' }
      }
    }
  ].some(joinState.matches);

  const isFailingOrConnectingSpaceInvitation = [
    {
      acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'connectingSpaceInvitation' }
    },
    {
      acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'failingSpaceInvitation' }
    }
  ].some(joinState.matches);

  const isAuthenticatingHaloInvitation = [
    {
      choosingIdentity: {
        acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'inputtingHaloVerificationCode' }
      }
    },
    {
      choosingIdentity: {
        acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'authenticatingHaloVerificationCode' }
      }
    },
    {
      choosingIdentity: {
        acceptingHaloInvitation: {
          acceptingRedeemedHaloInvitation: 'authenticationFailingHaloVerificationCode'
        }
      }
    }
  ].some(joinState.matches);

  const isHaloAuthenticationFailed = joinState.matches({
    acceptingHaloInvitation: {
      acceptingRedeemedHaloInvitation: 'authenticationFailingHaloVerificationCode'
    }
  });

  const isAuthenticatingSpaceInvitation = [
    {
      acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'inputtingSpaceVerificationCode' }
    },
    {
      acceptingSpaceInvitation: {
        acceptingRedeemedSpaceInvitation: 'authenticatingSpaceVerificationCode'
      }
    },
    {
      acceptingSpaceInvitation: {
        acceptingRedeemedSpaceInvitation: 'authenticationFailingSpaceVerificationCode'
      }
    }
  ].some(joinState.matches);

  const isSpaceAuthenticationFailed = joinState.matches({
    acceptingSpaceInvitation: {
      acceptingRedeemedSpaceInvitation: 'authenticationFailingSpaceVerificationCode'
    }
  });

  const isHaloInvitationSuccessful = [
    {
      choosingIdentity: {
        acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'successHaloInvitation' }
      }
    },
    'finishingJoiningHalo'
  ].some(joinState.matches);

  const isSpaceInvitationSuccessful = joinState.matches('finishingJoiningSpace');

  const isIdentityAdded = joinState.matches({
    choosingIdentity: 'confirmingAddedIdentity'
  });

  const isEnteringInvitationCode = joinState.matches({
    acceptingSpaceInvitation: 'inputtingSpaceInvitationCode'
  });

  return (
    <Panel
      title={t(mode === 'halo-only' ? 'selecting identity heading' : 'joining space heading')}
      onClose={!preventExit && mode !== 'halo-only' ? onExit : undefined}
      slots={{
        closeButton: {
          'data-testid': 'join-exit'
        },
        content: { padded: false }
      }}
    >
      <Content>
        <JoinHeading
          {...{ mode, titleId, joinState, onExit, exitActionParent, preventExit }}
          {...(displayAvatar
            ? {
                identity
              }
            : {})}
        />
        <Maxie>
          <MaxieItem active={isChoosingIdentityMethod}>
            <AdditionMethodSelector
              {...{
                active: isChoosingIdentityMethod,
                joinState,
                joinSend
              }}
            />
          </MaxieItem>
          <MaxieItem active={isCreatingIdentity}>
            <IdentityInput
              {...{
                active: isCreatingIdentity,
                joinState,
                joinSend,
                method: 'create identity'
              }}
            />
          </MaxieItem>
          <MaxieItem active={isRecoveringIdentity}>
            <IdentityInput
              {...{
                active: isRecoveringIdentity,
                joinState,
                joinSend,
                method: 'recover identity'
              }}
            />
          </MaxieItem>
          <MaxieItem active={isAcceptingInvitation}>
            <InvitationInput
              {...{
                active: isAcceptingInvitation,
                joinState,
                joinSend,
                Kind: 'Halo'
              }}
            />
          </MaxieItem>
          <MaxieItem active={isFailingOrConnectingHaloInvitation}>
            <InvitationRescuer
              {...{
                active: isFailingOrConnectingHaloInvitation,
                joinState,
                joinSend,
                Kind: 'Halo'
              }}
            />
          </MaxieItem>
          <MaxieItem active={isAuthenticatingHaloInvitation}>
            <InvitationAuthenticator
              {...{
                active: isAuthenticatingHaloInvitation,
                joinState,
                joinSend,
                Kind: 'Halo',
                ...(isHaloAuthenticationFailed && { failed: true })
              }}
            />
          </MaxieItem>
          <MaxieItem active={isHaloInvitationSuccessful}>
            <InvitationAccepted
              {...{
                active: isHaloInvitationSuccessful,
                joinState,
                joinSend,
                Kind: 'Halo',
                doneActionParent,
                onDone
              }}
            />
          </MaxieItem>
          <MaxieItem active={isIdentityAdded}>
            <IdentityAdded
              {...{
                active: isIdentityAdded,
                joinState,
                joinSend,
                mode,
                doneActionParent,
                onDone
              }}
            />
          </MaxieItem>
          <MaxieItem active={isEnteringInvitationCode}>
            <InvitationInput
              {...{
                active: isEnteringInvitationCode,
                joinState,
                joinSend,
                Kind: 'Space'
              }}
            />
          </MaxieItem>
          <MaxieItem active={isFailingOrConnectingSpaceInvitation}>
            <InvitationRescuer
              {...{
                active: isFailingOrConnectingSpaceInvitation,
                joinState,
                joinSend,
                Kind: 'Space'
              }}
            />
          </MaxieItem>
          <MaxieItem active={isAuthenticatingSpaceInvitation}>
            <InvitationAuthenticator
              {...{
                active: isAuthenticatingSpaceInvitation,
                joinState,
                joinSend,
                Kind: 'Space',
                ...(isSpaceAuthenticationFailed && { failed: true })
              }}
            />
          </MaxieItem>
          <MaxieItem active={isSpaceInvitationSuccessful}>
            <InvitationAccepted
              {...{
                active: isSpaceInvitationSuccessful,
                joinState,
                joinSend,
                Kind: 'Space',
                doneActionParent,
                onDone
              }}
            />
          </MaxieItem>
        </Maxie>
      </Content>
    </Panel>
  );
};
