//
// Copyright 2023 DXOS.org
//
import React, { useEffect } from 'react';

import { DensityProvider, useId, useThemeContext } from '@dxos/aurora';
import { log } from '@dxos/log';
import { useClient, useIdentity } from '@dxos/react-client';

import { JoinHeading } from './JoinHeading';
import { JoinPanelImplProps, JoinPanelProps } from './JoinPanelProps';
import { useJoinMachine } from './joinMachine';
import {
  AdditionMethodSelector,
  IdentityInput,
  IdentityAdded,
  InvitationAuthenticator,
  InvitationRescuer,
  InvitationInput,
  InvitationAccepted,
} from './view-states';

export const JoinPanelImpl = ({
  mode,
  state: joinState,
  send: joinSend,
  preventExit,
  onExit,
  onDone,
  exitActionParent,
  doneActionParent,
}: JoinPanelImplProps) => {
  const titleId = useId('joinPanel__title');
  return (
    <DensityProvider density='fine'>
      <JoinHeading {...{ mode, titleId, joinState, onExit, exitActionParent, preventExit }} />
      <div role='none' className='is-full overflow-hidden'>
        <div role='none' className='flex is-[1200%]' aria-live='polite'>
          <AdditionMethodSelector
            {...{
              joinState,
              joinSend,
              active: joinState.matches({ choosingIdentity: 'choosingAuthMethod' }),
            }}
          />
          <IdentityInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches({ choosingIdentity: 'creatingIdentity' }),
              method: 'create identity',
            }}
          />
          <IdentityInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches({ choosingIdentity: 'recoveringIdentity' }),
              method: 'recover identity',
            }}
          />
          <InvitationInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches({
                choosingIdentity: { acceptingHaloInvitation: 'inputtingHaloInvitationCode' },
              }),
              Kind: 'Halo',
            }}
          />
          <InvitationRescuer
            {...{
              joinState,
              joinSend,
              active: [
                {
                  choosingIdentity: {
                    acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'connectingHaloInvitation' },
                  },
                },
                {
                  choosingIdentity: {
                    acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'failingHaloInvitation' },
                  },
                },
              ].some(joinState.matches),
              Kind: 'Halo',
            }}
          />
          <InvitationAuthenticator
            {...{
              joinState,
              joinSend,
              active: [
                {
                  choosingIdentity: {
                    acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'inputtingHaloVerificationCode' },
                  },
                },
                {
                  choosingIdentity: {
                    acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'authenticatingHaloVerificationCode' },
                  },
                },
                {
                  choosingIdentity: {
                    acceptingHaloInvitation: {
                      acceptingRedeemedHaloInvitation: 'authenticationFailingHaloVerificationCode',
                    },
                  },
                },
              ].some(joinState.matches),
              Kind: 'Halo',
              ...(joinState.matches({
                choosingIdentity: {
                  acceptingHaloInvitation: {
                    acceptingRedeemedHaloInvitation: 'authenticationFailingHaloVerificationCode',
                  },
                },
              }) && { failed: true }),
            }}
          />
          <InvitationAccepted
            {...{
              joinState,
              joinSend,
              active: [
                {
                  choosingIdentity: {
                    acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'successHaloInvitation' },
                  },
                },
                'finishingJoiningHalo',
              ].some(joinState.matches),
              Kind: 'Halo',
              doneActionParent,
              onDone,
            }}
          />
          <IdentityAdded
            {...{
              joinState,
              joinSend,
              mode,
              active: joinState.matches({
                choosingIdentity: 'confirmingAddedIdentity',
              }),
              doneActionParent,
              onDone,
            }}
          />
          <InvitationInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches({
                acceptingSpaceInvitation: 'inputtingSpaceInvitationCode',
              }),
              Kind: 'Space',
            }}
          />
          <InvitationRescuer
            {...{
              joinState,
              joinSend,
              active: [
                {
                  acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'connectingSpaceInvitation' },
                },
                {
                  acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'failingSpaceInvitation' },
                },
              ].some(joinState.matches),
              Kind: 'Space',
            }}
          />
          <InvitationAuthenticator
            {...{
              joinState,
              joinSend,
              active: [
                {
                  acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'inputtingSpaceVerificationCode' },
                },
                {
                  acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'authenticatingSpaceVerificationCode' },
                },
                {
                  acceptingSpaceInvitation: {
                    acceptingRedeemedSpaceInvitation: 'authenticationFailingSpaceVerificationCode',
                  },
                },
              ].some(joinState.matches),
              Kind: 'Space',
              ...(joinState.matches({
                acceptingSpaceInvitation: {
                  acceptingRedeemedSpaceInvitation: 'authenticationFailingSpaceVerificationCode',
                },
              }) && { failed: true }),
            }}
          />
          <InvitationAccepted
            {...{
              joinState,
              joinSend,
              active: joinState.matches('finishingJoiningSpace'),
              Kind: 'Space',
              doneActionParent,
              onDone,
            }}
          />
        </div>
      </div>
    </DensityProvider>
  );
};

export const JoinPanel = ({
  mode = 'default',
  initialInvitationCode,
  exitActionParent,
  onExit,
  doneActionParent,
  onDone,
  preventExit,
}: JoinPanelProps) => {
  const client = useClient();
  const identity = useIdentity();
  const { hasIosKeyboard } = useThemeContext();

  const [joinState, joinSend, joinService] = useJoinMachine(client, {
    context: {
      mode,
      identity,
      ...(initialInvitationCode && {
        [mode === 'halo-only' ? 'halo' : 'space']: { unredeemedCode: initialInvitationCode },
      }),
    },
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

  return (
    <JoinPanelImpl
      {...{
        mode,
        state: joinState,
        send: joinSend,
        identity,
        hasIosKeyboard,
        initialInvitationCode,
        preventExit,
        onExit,
        onDone,
        exitActionParent,
        doneActionParent,
      }}
    />
  );
};
