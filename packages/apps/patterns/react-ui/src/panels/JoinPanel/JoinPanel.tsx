//
// Copyright 2023 DXOS.org
//
import React from 'react';

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

  const [joinState, joinSend] = useJoinMachine(client, {
    context: {
      identity,
      ...(initialInvitationCode && {
        [mode === 'halo-only' ? 'halo' : 'space']: { unredeemedCode: initialInvitationCode }
      })
    }
  });

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
              active: joinState.matches('choosingAuthMethod')
            }}
          />
          <IdentityInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches('creatingIdentity'),
              method: 'create identity'
            }}
          />
          <IdentityInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches('recoveringIdentity'),
              method: 'recover identity'
            }}
          />
          <InvitationInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches('inputtingHaloInvitationCode'),
              invitationType: 'halo'
            }}
          />
          <InvitationRescuer
            {...{
              joinState,
              joinSend,
              active: joinState.matches('failingHaloInvitation'),
              invitationType: 'halo'
            }}
          />
          <InvitationAuthenticator
            {...{
              joinState,
              joinSend,
              active: joinState.matches('inputtingHaloVerificationCode'),
              invitationType: 'halo'
            }}
          />
          <InvitationAccepted
            {...{
              joinState,
              joinSend,
              active: joinState.matches('successHaloInvitation'),
              invitationType: 'halo',
              doneActionParent,
              onDone
            }}
          />
          <IdentityAdded
            {...{
              joinState,
              joinSend,
              mode,
              active: joinState.matches('confirmingAddedIdentity'),
              doneActionParent,
              onDone
            }}
          />
          <InvitationInput
            {...{
              joinState,
              joinSend,
              active: joinState.matches('inputtingSpaceInvitationCode'),
              invitationType: 'space'
            }}
          />
          <InvitationRescuer
            {...{
              joinState,
              joinSend,
              active: joinState.matches('failingSpaceInvitation'),
              invitationType: 'space'
            }}
          />
          <InvitationAuthenticator
            {...{
              joinState,
              joinSend,
              active:
                joinState.matches('inputtingSpaceVerificationCode') ||
                joinState.matches('authenticationFailingSpaceVerificationCode'),
              invitationType: 'space',
              ...(joinState.matches('authenticationFailingSpaceVerificationCode') && { failed: true })
            }}
          />
          <InvitationAccepted
            {...{
              joinState,
              joinSend,
              active: joinState.matches('successSpaceInvitation'),
              invitationType: 'space',
              doneActionParent,
              onDone
            }}
          />
        </div>
      </div>
    </DensityProvider>
  );
};
