//
// Copyright 2023 DXOS.org
//
import React, { useEffect } from 'react';

import { log } from '@dxos/log';
import { useClient, useIdentity } from '@dxos/react-client';
import { DensityProvider, useId } from '@dxos/react-components';

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
  mode,
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

  const [joinState, joinSend, joinService] = useJoinMachine(client, {
    context: {
      identity,
      ...(initialInvitationCode && {
        [mode === 'halo-only' ? 'halo' : 'space']: { unredeemedCode: initialInvitationCode }
      })
    }
  });

  useEffect(() => {
    const subscription = joinService.subscribe((state) => {
      log.info('[state]', state);
    });

    return subscription.unsubscribe;
  }, [joinService]);

  useEffect(() => {
    // TODO(thure): Validate if this is sufficiently synchronous for iOS to move focus. It might not be!
    const stateStack = joinState.configuration[0].id.split('.');
    const innermostState = stateStack[stateStack.length - 1];
    const autoFocusValue = innermostState === 'finishingJoining' ? 'successSpaceInvitation' : innermostState;
    const $nextAutofocus: HTMLElement | null = document.querySelector(`[data-autofocus~="${autoFocusValue}"]`);
    if ($nextAutofocus) {
      $nextAutofocus.focus();
    }
  }, [joinState.value]);

  const spaceInvitation = joinState.context.space.invitationObservable;

  return (
    <DensityProvider density='fine'>
      <JoinHeading {...{ mode, titleId, invitation: spaceInvitation, onExit, exitActionParent, preventExit }} />
      <div role='none' className='is-full overflow-hidden'>
        <div role='none' className='flex is-[1200%]' aria-live='polite'>
          <AdditionMethodSelector
            {...{
              joinState,
              joinSend,
              active: joinState.matches({ choosingIdentity: 'choosingAuthMethod' })
            }}
          />
          <IdentityInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches({ choosingIdentity: 'creatingIdentity' }),
              method: 'create identity'
            }}
          />
          <IdentityInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches({ choosingIdentity: 'recoveringIdentity' }),
              method: 'recover identity'
            }}
          />
          <InvitationInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches({
                choosingIdentity: { acceptingHaloInvitation: 'inputtingHaloInvitationCode' }
              }),
              Domain: 'Halo'
            }}
          />
          <InvitationRescuer
            {...{
              joinState,
              joinSend,
              active: [
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
              ].some(joinState.matches),
              Domain: 'Halo'
            }}
          />
          <InvitationAuthenticator
            {...{
              joinState,
              joinSend,
              active: [
                {
                  acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'inputtingHaloVerificationCode' }
                },
                {
                  acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'authenticatingHaloVerificationCode' }
                },
                {
                  acceptingHaloInvitation: {
                    acceptingRedeemedHaloInvitation: 'authenticationFailingHaloVerificationCode'
                  }
                }
              ].some(joinState.matches),
              Domain: 'Halo',
              ...(joinState.matches({
                acceptingHaloInvitation: {
                  acceptingRedeemedHaloInvitation: 'authenticationFailingHaloVerificationCode'
                }
              }) && { failed: true })
            }}
          />
          <InvitationAccepted
            {...{
              joinState,
              joinSend,
              active: joinState.matches({
                choosingIdentity: {
                  acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'successHaloInvitation' }
                }
              }),
              Domain: 'Halo',
              doneActionParent,
              onDone
            }}
          />
          <IdentityAdded
            {...{
              joinState,
              joinSend,
              mode,
              active: joinState.matches({
                choosingIdentity: 'confirmingAddedIdentity'
              }),
              doneActionParent,
              onDone
            }}
          />
          <InvitationInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches({
                acceptingSpaceInvitation: 'inputtingSpaceInvitationCode'
              }),
              Domain: 'Space'
            }}
          />
          <InvitationRescuer
            {...{
              joinState,
              joinSend,
              active: [
                {
                  acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'connectingSpaceInvitation' }
                },
                {
                  acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'failingSpaceInvitation' }
                }
              ].some(joinState.matches),
              Domain: 'Space'
            }}
          />
          <InvitationAuthenticator
            {...{
              joinState,
              joinSend,
              active: [
                {
                  acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'inputtingSpaceVerificationCode' }
                },
                {
                  acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'authenticatingSpaceVerificationCode' }
                },
                {
                  acceptingSpaceInvitation: {
                    acceptingRedeemedSpaceInvitation: 'authenticationFailingSpaceVerificationCode'
                  }
                }
              ].some(joinState.matches),
              Domain: 'Space',
              ...(joinState.matches({
                acceptingSpaceInvitation: {
                  acceptingRedeemedSpaceInvitation: 'authenticationFailingSpaceVerificationCode'
                }
              }) && { failed: true })
            }}
          />
          <InvitationAccepted
            {...{
              joinState,
              joinSend,
              active: joinState.matches('finishingJoining'),
              Domain: 'Space',
              doneActionParent,
              onDone
            }}
          />
        </div>
      </div>
    </DensityProvider>
  );
};
