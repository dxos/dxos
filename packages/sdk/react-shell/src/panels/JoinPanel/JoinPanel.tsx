//
// Copyright 2023 DXOS.org
//
import React, { useCallback, useEffect, useMemo } from 'react';

import { DensityProvider, useId, useThemeContext } from '@dxos/aurora';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

import { Viewport } from '../../components';
import { stepStyles } from '../../styles';
import { JoinHeading } from './JoinHeading';
import { JoinPanelImplProps, JoinPanelProps } from './JoinPanelProps';
import { useJoinMachine } from './joinMachine';
import {
  AdditionMethodChooser,
  IdentityInput,
  IdentityAdded,
  InvitationAuthenticator,
  InvitationRescuer,
  InvitationInput,
  InvitationAccepted,
} from './steps';

export const JoinPanelImpl = ({
  titleId,
  send,
  activeView,
  failed,
  mode,
  unredeemedCodes,
  invitationStates,
  onExit,
  onHaloDone,
  onSpaceDone,
  exitActionParent,
  doneActionParent,
  onHaloInvitationCancel,
  onSpaceInvitationCancel,
  onHaloInvitationAuthenticate,
  onSpaceInvitationAuthenticate,
}: JoinPanelImplProps) => {
  return (
    <DensityProvider density='fine'>
      {mode !== 'halo-only' && <JoinHeading {...{ titleId, mode, onExit, exitActionParent }} />}
      <Viewport.Root focusManaged activeView={activeView}>
        <Viewport.Views>
          <Viewport.View classNames={stepStyles} id='addition method chooser'>
            <AdditionMethodChooser send={send} active={activeView === 'addition method chooser'} />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='create identity input'>
            <IdentityInput send={send} method='create identity' active={activeView === 'create identity input'} />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='recover identity input'>
            <IdentityInput send={send} method='recover identity' active={activeView === 'recover identity input'} />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='halo invitation input'>
            <InvitationInput
              send={send}
              Kind='Halo'
              active={activeView === 'halo invitation input'}
              {...(unredeemedCodes?.Halo && { unredeemedCode: unredeemedCodes.Halo })}
            />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='halo invitation rescuer'>
            <InvitationRescuer
              send={send}
              Kind='Halo'
              active={activeView === 'halo invitation rescuer'}
              invitationState={invitationStates?.Halo}
              onInvitationCancel={onHaloInvitationCancel}
            />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='halo invitation authenticator'>
            <InvitationAuthenticator
              send={send}
              Kind='Halo'
              active={activeView === 'halo invitation authenticator'}
              onInvitationCancel={onHaloInvitationCancel}
              onInvitationAuthenticate={onHaloInvitationAuthenticate}
              {...(failed.has('Halo') && { failed: true })}
            />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='halo invitation accepted'>
            <InvitationAccepted
              {...{
                send,
                Kind: 'Halo',
                active: activeView === 'halo invitation accepted',
                doneActionParent,
                onDone: onHaloDone,
              }}
            />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='identity added'>
            <IdentityAdded
              {...{ send, mode, active: activeView === 'identity added', doneActionParent, onDone: onHaloDone }}
            />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='space invitation input'>
            <InvitationInput
              send={send}
              Kind='Space'
              active={activeView === 'space invitation input'}
              {...(unredeemedCodes?.Space && { unredeemedCode: unredeemedCodes.Space })}
            />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='space invitation rescuer'>
            <InvitationRescuer
              send={send}
              Kind='Space'
              active={activeView === 'space invitation rescuer'}
              invitationState={invitationStates?.Space}
              onInvitationCancel={onSpaceInvitationCancel}
            />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='space invitation authenticator'>
            <InvitationAuthenticator
              send={send}
              Kind='Space'
              active={activeView === 'space invitation authenticator'}
              onInvitationCancel={onSpaceInvitationCancel}
              onInvitationAuthenticate={onSpaceInvitationAuthenticate}
              {...(failed.has('Space') && { failed: true })}
            />
          </Viewport.View>
          <Viewport.View classNames={stepStyles} id='space invitation accepted'>
            <InvitationAccepted
              {...{
                send,
                Kind: 'Space',
                active: activeView === 'space invitation accepted',
                doneActionParent,
                onDone: onSpaceDone,
              }}
            />
          </Viewport.View>
        </Viewport.Views>
      </Viewport.Root>
    </DensityProvider>
  );
};

export const JoinPanel = ({
  titleId: propsTitleId,
  mode = 'default',
  initialInvitationCode,
  exitActionParent,
  onExit,
  doneActionParent,
  onDone: propsOnDone,
}: JoinPanelProps) => {
  const client = useClient();
  const identity = useIdentity();
  const { hasIosKeyboard } = useThemeContext();
  const titleId = useId('joinPanel__heading', propsTitleId);

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
        return 'addition method chooser';
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

  const onHaloDone = useCallback(() => {
    propsOnDone?.({
      identityKey: joinState.context.halo.invitation?.identityKey ?? null,
      swarmKey: joinState.context.halo.invitation?.swarmKey ?? null,
      spaceKey: joinState.context.halo.invitation?.spaceKey ?? null,
    });
  }, [joinState, propsOnDone]);

  const onSpaceDone = useCallback(() => {
    propsOnDone?.({
      identityKey: joinState.context.space.invitation?.identityKey ?? null,
      swarmKey: joinState.context.space.invitation?.swarmKey ?? null,
      spaceKey: joinState.context.space.invitation?.spaceKey ?? null,
    });
  }, [joinState, propsOnDone]);

  return (
    <JoinPanelImpl
      {...{
        titleId,
        mode,
        send: joinSend,
        activeView,
        failed,
        pending: ['connecting', 'authenticating'].some((str) => joinState?.configuration[0].id.includes(str)),
        unredeemedCodes,
        invitationStates,
        identity,
        onExit,
        exitActionParent,
        doneActionParent,
        onHaloDone,
        onSpaceDone,
        onHaloInvitationCancel: () => joinState.context.halo.invitationObservable?.cancel(),
        onSpaceInvitationCancel: () => joinState.context.space.invitationObservable?.cancel(),
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
