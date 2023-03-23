//
// Copyright 2023 DXOS.org
//
import React, { useEffect } from 'react';

import { useClient, useIdentity } from '@dxos/react-client';
import { DensityProvider } from '@dxos/react-components';

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
      // simple state logging
      console.log('[state]', state);
    });

    return subscription.unsubscribe;
  }, [joinService]);

  useEffect(() => {
    // TODO(thure): Validate if this is sufficiently synchronous for iOS to move focus. It might not be!
    const stateStack = joinState.configuration[0].id.split('.');
    const $nextAutofocus: HTMLElement | null = document.querySelector(
      `[data-autofocus="${stateStack[stateStack.length - 1]}"]`
    );
    if ($nextAutofocus) {
      $nextAutofocus.focus();
    }
  }, [joinState.value]);

  return (
    <DensityProvider density='fine'>
      {/* todo(thure): Restore this, fix types elsewhere here. */}
      {/* <JoinHeading */}
      {/*  {...{ mode, titleId, invitation: joinState.spaceInvitation, onExit, exitActionParent, preventExit }} */}
      {/* /> */}
      <div role='none' className='is-full overflow-hidden'>
        <div role='none' className='flex is-[1300%]' aria-live='polite'>
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
              active: joinState.matches({
                choosingIdentity: {
                  acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'failingHaloInvitation' }
                }
              }),
              Domain: 'Halo'
            }}
          />
          <InvitationAuthenticator
            {...{
              joinState,
              joinSend,
              active: [
                {
                  acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'connectingHaloInvitation' }
                },
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
              Domain: 'Halo'
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
              active: joinState.matches({
                acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'failingSpaceInvitation' }
              }),
              Domain: 'Space'
            }}
          />
          <InvitationAuthenticator
            {...{
              joinState,
              joinSend,
              active: [
                {
                  acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'connectingSpaceInvitation' }
                },
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
              ...(joinState.matches('authenticationFailingSpaceVerificationCode') && { failed: true })
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
