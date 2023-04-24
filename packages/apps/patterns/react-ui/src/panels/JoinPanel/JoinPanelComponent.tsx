//
// Copyright 2023 DXOS.org
//
import React, { useEffect } from 'react';

import { InvitationResult, Identity } from '@dxos/react-client';
import { useId, useTranslation } from '@dxos/react-components';

import { Panel, Content, Maxie, MaxieItem } from '../Panel';
import { JoinHeading } from './JoinHeading';
import { JoinState, JoinSend } from './joinMachine';
import {
  AdditionMethodSelector,
  IdentityInput,
  IdentityAdded,
  InvitationAuthenticator,
  InvitationRescuer,
  InvitationInput,
  InvitationAccepted
} from './view-states';

export type JoinPanelMode = 'default' | 'halo-only';

export type JoinPanelComponentProps = {
  mode?: JoinPanelMode;
  state: JoinState;
  send?: JoinSend;
  identity?: Identity | null;
  hasIosKeyboard?: boolean;
  initialInvitationCode?: string;
  preventExit: boolean;
  onExit?: () => any;
  onDone?: (result: InvitationResult | null) => any;
};

export const JoinPanelComponent = ({
  mode = 'default',
  state,
  send,
  hasIosKeyboard,
  preventExit,
  identity,
  onExit,
  onDone
}: JoinPanelComponentProps) => {
  const titleId = useId('joinPanel__title');
  const { t } = useTranslation('os');

  useEffect(() => {
    // TODO(thure): Validate if this is sufficiently synchronous for iOS to move focus. It might not be!
    const stateStack = state?.configuration?.[0].id.split('.');
    const innermostState = stateStack?.[stateStack.length - 1];
    const autoFocusValue = innermostState === 'finishingJoining' ? 'successSpaceInvitation' : innermostState;
    const $nextAutofocus: HTMLElement | null = document.querySelector(`[data-autofocus~="${autoFocusValue}"]`);
    if ($nextAutofocus && !(hasIosKeyboard && $nextAutofocus.hasAttribute('data-prevent-ios-autofocus'))) {
      $nextAutofocus.focus();
    }
  }, [state?.value, hasIosKeyboard]);

  const displayAvatar = [
    {
      choosingIdentity: {
        acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'successHaloInvitation' }
      }
    },
    'finishingJoiningHalo'
  ].some(state.matches);

  const isChoosingIdentityMethod = state.matches({ choosingIdentity: 'choosingAuthMethod' });

  const isCreatingIdentity = state.matches({ choosingIdentity: 'creatingIdentity' });

  const isRecoveringIdentity = state.matches({ choosingIdentity: 'recoveringIdentity' });

  const isAcceptingInvitation = state.matches({
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
  ].some(state.matches);

  const isFailingOrConnectingSpaceInvitation = [
    {
      acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'connectingSpaceInvitation' }
    },
    {
      acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'failingSpaceInvitation' }
    }
  ].some(state.matches);

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
  ].some(state.matches);

  const isHaloAuthenticationFailed = state.matches({
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
  ].some(state.matches);

  const isSpaceAuthenticationFailed = state.matches({
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
  ].some(state.matches);

  const isSpaceInvitationSuccessful = state.matches('finishingJoiningSpace');

  const isIdentityAdded = state.matches({
    choosingIdentity: 'confirmingAddedIdentity'
  });

  const isEnteringInvitationCode = state.matches({
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
          {...{ mode, titleId, joinState: state, onExit, preventExit }}
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
