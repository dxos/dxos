//
// Copyright 2023 DXOS.org
//
import React, { useEffect, useMemo } from 'react';

import { DensityProvider, useId, useThemeContext } from '@dxos/aurora';
import { log } from '@dxos/log';
import { useClient, useIdentity } from '@dxos/react-client';

import { Viewport } from '../../components';
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
  send,
  activeView,
  failed,
  mode,
  unredeemedCodes,
  invitationStates,
  preventExit,
  onExit,
  onDone,
  exitActionParent,
  doneActionParent,
  onHaloInvitationCancel,
  onSpaceInvitationCancel,
  onHaloInvitationAuthenticate,
  onSpaceInvitationAuthenticate,
}: JoinPanelImplProps) => {
  const titleId = useId('joinPanel__title');
  return (
    <DensityProvider density='fine'>
      <JoinHeading {...{ titleId, onExit, exitActionParent, preventExit }} />
      <Viewport.Root activeView={activeView}>
        <Viewport.Views>
          <Viewport.View id='addition method selector'>
            <AdditionMethodSelector send={send} active={activeView === 'addition method selector'} />
          </Viewport.View>
          <Viewport.View id='create identity input'>
            <IdentityInput send={send} method='create identity' active={activeView === 'create identity input'} />
          </Viewport.View>
          <Viewport.View id='recover identity input'>
            <IdentityInput send={send} method='recover identity' active={activeView === 'recover identity input'} />
          </Viewport.View>
          <Viewport.View id='halo invitation input'>
            <InvitationInput
              send={send}
              Kind='Halo'
              active={activeView === 'halo invitation input'}
              {...(unredeemedCodes?.Halo && { unredeemedCode: unredeemedCodes.Halo })}
            />
          </Viewport.View>
          <Viewport.View id='halo invitation rescuer'>
            <InvitationRescuer
              send={send}
              Kind='Halo'
              active={activeView === 'halo invitation rescuer'}
              invitationState={invitationStates?.Halo}
              onInvitationCancel={onHaloInvitationCancel}
            />
          </Viewport.View>
          <Viewport.View id='halo invitation authenticator'>
            <InvitationAuthenticator
              send={send}
              Kind='Halo'
              active={activeView === 'halo invitation authenticator'}
              onInvitationCancel={onHaloInvitationCancel}
              onInvitationAuthenticate={onHaloInvitationAuthenticate}
              {...(failed.has('Halo') && { failed: true })}
            />
          </Viewport.View>
          <Viewport.View id='halo invitation accepted'>
            <InvitationAccepted
              {...{ send, Kind: 'Halo', active: activeView === 'halo invitation accepted', doneActionParent, onDone }}
            />
          </Viewport.View>
          <Viewport.View id='identity added'>
            <IdentityAdded
              {...{ send, mode, active: activeView === 'identity added', doneActionParent, onDone }}
              send={send}
            />
          </Viewport.View>
          <Viewport.View id='space invitation input'>
            <InvitationInput
              send={send}
              Kind='Space'
              active={activeView === 'space invitation input'}
              {...(unredeemedCodes?.Space && { unredeemedCode: unredeemedCodes.Space })}
            />
          </Viewport.View>
          <Viewport.View id='space invitation rescuer'>
            <InvitationRescuer
              send={send}
              Kind='Space'
              active={activeView === 'space invitation rescuer'}
              invitationState={invitationStates?.Space}
              onInvitationCancel={onSpaceInvitationCancel}
            />
          </Viewport.View>
          <Viewport.View id='space invitation authenticator'>
            <InvitationAuthenticator
              send={send}
              Kind='Space'
              active={activeView === 'space invitation authenticator'}
              onInvitationCancel={onSpaceInvitationCancel}
              onInvitationAuthenticate={onSpaceInvitationAuthenticate}
              {...(failed.has('Space') && { failed: true })}
            />
          </Viewport.View>
          <Viewport.View id='space invitation accepted'>
            <InvitationAccepted
              {...{ send, Kind: 'Space', active: activeView === 'space invitation accepted', doneActionParent, onDone }}
            />
          </Viewport.View>
        </Viewport.Views>
      </Viewport.Root>
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
    // TODO(thure): Add `focusManaged` flag to `Viewport.View` so there’s no race condition.
    const stateStack = joinState.configuration[0].id.split('.');
    const innermostState = stateStack[stateStack.length - 1];
    const autoFocusValue = innermostState === 'finishingJoining' ? 'successSpaceInvitation' : innermostState;
    const $nextAutofocus: HTMLElement | null = document.querySelector(`[data-autofocus~="${autoFocusValue}"]`);
    if ($nextAutofocus && !(hasIosKeyboard && $nextAutofocus.hasAttribute('data-prevent-ios-autofocus'))) {
      $nextAutofocus.focus();
    }
  }, [joinState.value, hasIosKeyboard]);

  const activeView = useMemo(() => {
    switch (true) {
      case joinState.matches({ choosingIdentity: 'choosingAuthMethod' }):
        return 'addition method selector';
      case joinState.matches({ choosingIdentity: 'creatingIdentity' }):
        return 'create identity input';
      case joinState.matches({ choosingIdentity: 'recoveringIdentity' }):
        return 'recover identity input';
      case joinState.matches({
        choosingIdentity: { acceptingHaloInvitation: 'inputtingHaloInvitationCode' },
      }):
        return 'halo invitation input';
      case [
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
      ].some(joinState.matches):
        return 'halo invitation rescuer';
      case [
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
      ].some(joinState.matches):
        return 'halo invitation authenticator';
      case [
        {
          choosingIdentity: {
            acceptingHaloInvitation: { acceptingRedeemedHaloInvitation: 'successHaloInvitation' },
          },
        },
        'finishingJoiningHalo',
      ].some(joinState.matches):
        return 'halo invitation accepted';
      case joinState.matches({
        choosingIdentity: 'confirmingAddedIdentity',
      }):
        return 'identity added';
      case joinState.matches({
        acceptingSpaceInvitation: 'inputtingSpaceInvitationCode',
      }):
        return 'space invitation input';
      case [
        {
          acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'connectingSpaceInvitation' },
        },
        {
          acceptingSpaceInvitation: { acceptingRedeemedSpaceInvitation: 'failingSpaceInvitation' },
        },
      ].some(joinState.matches):
        return 'space invitation rescuer';
      case [
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
      ].some(joinState.matches):
        return 'space invitation authenticator';
      case joinState.matches('finishingJoiningSpace'):
        return 'space invitation accepted';
      default:
        return 'never';
    }
  }, [joinState]);

  const failed = useMemo(() => {
    const result: JoinPanelImplProps['failed'] = new Set();
    switch (true) {
      case joinState.matches({
        choosingIdentity: {
          acceptingHaloInvitation: {
            acceptingRedeemedHaloInvitation: 'authenticationFailingHaloVerificationCode',
          },
        },
      }):
        result.add('Halo');
        break;
      case joinState.matches({
        acceptingSpaceInvitation: {
          acceptingRedeemedSpaceInvitation: 'authenticationFailingSpaceVerificationCode',
        },
      }):
        result.add('Space');
        break;
    }
    return result;
  }, [joinState]);

  const unredeemedCodes = useMemo(
    () => ({
      Halo: joinState.context.halo.unredeemedCode,
      Space: joinState.context.space.unredeemedCode,
    }),
    [joinState],
  );

  const invitationStates = useMemo(
    () => ({
      Halo: joinState.context.halo.invitation?.state,
      Space: joinState.context.space.invitation?.state,
    }),
    [joinState],
  );

  console.log('[active view]', activeView);

  return (
    <JoinPanelImpl
      {...{
        send: joinSend,
        activeView,
        failed,
        pending: ['connecting', 'authenticating'].some((str) => joinState?.configuration[0].id.includes(str)),
        unredeemedCodes,
        invitationStates,
        identity,
        preventExit,
        onExit,
        onDone,
        exitActionParent,
        doneActionParent,
        onHaloInvitationCancel: joinState.context.halo.invitationObservable?.cancel,
        onSpaceInvitationCancel: joinState.context.space.invitationObservable?.cancel,
        onHaloInvitationAuthenticate: (authCode: string) => {
          // todo(thure): Is this necessary? Shouldn’t the observable emit this?
          joinSend({ type: 'authenticateHaloVerificationCode' });
          return joinState.context.halo.invitationObservable?.authenticate(authCode);
        },
        onSpaceInvitationAuthenticate: (authCode: string) => {
          joinSend({ type: 'authenticateSpaceVerificationCode' });
          return joinState.context.space.invitationObservable?.authenticate(authCode);
        },
      }}
    />
  );
};
