//
// Copyright 2023 DXOS.org
//
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import React, { useEffect, useReducer } from 'react';

import { InvitationEncoder } from '@dxos/client';
import { log } from '@dxos/log';
import { useClient, useIdentity } from '@dxos/react-client';
import { ThemeContext, useId } from '@dxos/react-components';

import { JoinHeading } from './JoinHeading';
import { JoinAction, JoinPanelProps, JoinState } from './JoinPanelProps';
import {
  AdditionMethodSelector,
  IdentitySelector,
  IdentityInput,
  IdentityAdded,
  InvitationAuthenticator,
  InvitationRescuer,
  InvitationInput,
  InvitationAccepted
} from './view-states';

export const JoinPanel = ({ initialInvitationCode }: JoinPanelProps) => {
  const client = useClient();
  const titleId = useId('joinTitle');
  const identity = useIdentity();

  const availableIdentities = identity ? [identity] : [];

  const reducer = (state: JoinState, action: JoinAction) => {
    const nextState = { ...state };
    // TODO: Why is `onAuthenticating` called twice?
    if (action.type === 'authenticating invitation' && state.spaceViewState === 'invitation accepted') {
      console.warn('onAuthenticate called after authentication promise was resolved');
      return state;
    }
    switch (action.type) {
      case 'added identity':
        nextState.activeView = 'identity added';
        nextState.selectedIdentity = action.identity;
        break;
      case 'add identity':
        nextState.activeView = 'addition method selector';
        break;
      case 'select addition method':
        if (action.method === 'accept device invitation') {
          nextState.activeView = 'halo invitation acceptor';
          if (state.unredeemedHaloInvitationCode) {
            nextState.haloInvitation = client.echo.acceptInvitation(
              InvitationEncoder.decode(state.unredeemedHaloInvitationCode)
            );
            nextState.unredeemedHaloInvitationCode = undefined;
            nextState.haloViewState = 'invitation authenticator';
          } else {
            nextState.haloViewState = 'invitation input';
          }
        } else {
          nextState.activeView = 'identity input';
          nextState.additionMethod = action.method;
        }
        break;
      case 'select identity':
        nextState.selectedIdentity = action.identity;
        nextState.activeView = 'space invitation acceptor';
        if (state.unredeemedSpaceInvitationCode) {
          nextState.spaceInvitation = client.echo.acceptInvitation(
            InvitationEncoder.decode(state.unredeemedSpaceInvitationCode)
          );
          nextState.unredeemedSpaceInvitationCode = undefined;
          nextState.spaceViewState = 'invitation authenticator';
        } else {
          nextState.spaceViewState = 'invitation input';
        }
        break;
      case 'deselect identity':
        nextState.selectedIdentity = undefined;
        nextState.activeView = 'identity selector';
        break;
      case 'cancel invitation':
        if (action.from === 'space' && state.spaceInvitation?.invitation) {
          void state.spaceInvitation?.cancel();
        }
        if (action.from === 'halo' && state.haloInvitation?.invitation) {
          void state.haloInvitation?.cancel();
        }
        break;
      case 'authenticating invitation':
        nextState[action.from === 'halo' ? 'haloInvitationAnnotation' : 'spaceInvitationAnnotation'] = 'authenticating';
        break;
      case 'connecting invitation':
        nextState[action.from === 'halo' ? 'haloInvitation' : 'spaceInvitation'] = action.invitation;
      // eslint-disable-next-line no-fallthrough
      case 'cancelled invitation':
      case 'fail invitation':
      case 'timeout invitation':
        nextState[action.from === 'halo' ? 'haloViewState' : 'spaceViewState'] = 'invitation rescuer';
        break;
      case 'connect invitation':
      case 'authenticate invitation':
        if (action.from === 'halo' && state.haloInvitationAnnotation === 'authenticating') {
          nextState.haloInvitationAnnotation = 'authentication failed';
        }
        if (action.from === 'space' && state.spaceInvitationAnnotation === 'authenticating') {
          nextState.spaceInvitationAnnotation = 'authentication failed';
        }
        nextState[action.from === 'halo' ? 'haloViewState' : 'spaceViewState'] = 'invitation authenticator';
        break;
      case 'accepted invitation':
        nextState[action.from === 'halo' ? 'haloViewState' : 'spaceViewState'] = 'invitation accepted';
        break;
      case 'reset invitation':
        nextState[action.from === 'halo' ? 'haloInvitation' : 'spaceInvitation'] = undefined;
        nextState[action.from === 'halo' ? 'haloInvitationAnnotation' : 'spaceInvitationAnnotation'] = undefined;
        nextState[action.from === 'halo' ? 'unredeemedHaloInvitationCode' : 'unredeemedSpaceInvitationCode'] =
          undefined;
        nextState[action.from === 'halo' ? 'haloViewState' : 'spaceViewState'] = 'invitation input';
        break;
    }
    log.info('[join panel reducer]', { action, nextState });
    return nextState;
  };

  const [joinState, dispatch] = useReducer(reducer, {
    unredeemedHaloInvitationCode: undefined,
    unredeemedSpaceInvitationCode: initialInvitationCode,
    spaceInvitation: undefined,
    haloInvitation: undefined,
    activeView: availableIdentities.length > 0 ? 'identity selector' : 'addition method selector',
    selectedIdentity: undefined,
    additionMethod: undefined,
    spaceViewState: 'invitation input',
    haloViewState: 'invitation input'
  });

  useEffect(() => {
    // TODO (thure): Validate if this is sufficiently synchronous for iOS to move focus. It might not be!
    const attrValue =
      joinState.activeView === 'identity input'
        ? `${joinState.activeView}; ${joinState.additionMethod}`
        : joinState.activeView === 'space invitation acceptor'
        ? `${joinState.activeView}; ${joinState.spaceViewState}`
        : joinState.activeView === 'halo invitation acceptor'
        ? `${joinState.activeView}; ${joinState.haloViewState}`
        : joinState.activeView;
    log.info('[autofocus value]', { attrValue });
    const $nextAutofocus: HTMLElement | null = document.querySelector(`[data-autofocus="${attrValue}"]`);
    if ($nextAutofocus) {
      $nextAutofocus.focus();
    }
  }, [joinState.activeView, joinState.spaceViewState, joinState.haloViewState]);

  useEffect(() => {
    joinState.spaceInvitation?.subscribe({
      onAuthenticating: () => dispatch({ type: 'authenticate invitation', from: 'space' }),
      onCancelled: () => dispatch({ type: 'cancelled invitation', from: 'space' }),
      onConnected: () => dispatch({ type: 'connect invitation', from: 'space' }),
      onError: () => dispatch({ type: 'fail invitation', from: 'space' }),
      onSuccess: () => dispatch({ type: 'accepted invitation', from: 'space' }),
      onTimeout: () => dispatch({ type: 'timeout invitation', from: 'space' })
    });
  }, [joinState.spaceInvitation]);

  useEffect(() => {
    joinState.haloInvitation?.subscribe({
      onAuthenticating: () => dispatch({ type: 'authenticate invitation', from: 'halo' }),
      onCancelled: () => dispatch({ type: 'cancelled invitation', from: 'halo' }),
      onConnected: () => dispatch({ type: 'connect invitation', from: 'halo' }),
      onError: () => dispatch({ type: 'fail invitation', from: 'halo' }),
      onSuccess: () => dispatch({ type: 'accepted invitation', from: 'halo' }),
      onTimeout: () => dispatch({ type: 'timeout invitation', from: 'halo' })
    });
  }, [joinState.haloInvitation]);

  return (
    <AlertPrimitive.Root defaultOpen>
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        <AlertPrimitive.Overlay className='fixed inset-0 backdrop-blur z-50 overflow-auto grid place-items-center p-2 md:p-4 lg:p-8'>
          <AlertPrimitive.Content
            aria-labelledby={titleId}
            className='is-full min-is-[260px] max-is-[320px] shadow-md backdrop-blur-md'
            onEscapeKeyDown={(event) => event.preventDefault()}
          >
            <JoinHeading titleId={titleId} invitation={joinState.spaceInvitation} onClickExit={() => {}} />
            <div role='none' className='is-full overflow-hidden'>
              <div role='none' className='flex is-[1300%]' aria-live='polite'>
                <IdentitySelector
                  {...{ dispatch, availableIdentities, active: joinState.activeView === 'identity selector' }}
                />
                <AdditionMethodSelector
                  {...{
                    dispatch,
                    availableIdentities,
                    active: joinState.activeView === 'addition method selector'
                  }}
                />
                <IdentityInput
                  {...{
                    dispatch,
                    active: joinState.activeView === 'identity input' && joinState.additionMethod === 'create identity',
                    method: 'create identity'
                  }}
                />
                <IdentityInput
                  {...{
                    dispatch,
                    active:
                      joinState.activeView === 'identity input' && joinState.additionMethod === 'recover identity',
                    method: 'recover identity'
                  }}
                />
                <InvitationInput
                  {...{
                    dispatch,
                    activeInvitation: joinState.haloInvitation || true,
                    active:
                      joinState.activeView === 'halo invitation acceptor' &&
                      joinState.haloViewState === 'invitation input',
                    invitationType: 'halo'
                  }}
                />
                <InvitationRescuer
                  {...{
                    dispatch,
                    activeInvitation: joinState.haloInvitation || true,
                    active:
                      joinState.activeView === 'halo invitation acceptor' &&
                      joinState.haloViewState === 'invitation rescuer',
                    invitationType: 'halo'
                  }}
                />
                <InvitationAuthenticator
                  {...{
                    dispatch,
                    activeInvitation: joinState.haloInvitation || true,
                    active:
                      joinState.activeView === 'halo invitation acceptor' &&
                      joinState.haloViewState === 'invitation authenticator',
                    invitationType: 'halo',
                    ...(joinState.spaceInvitationAnnotation === 'authentication failed' && { failed: true })
                  }}
                />
                <InvitationAccepted
                  {...{
                    dispatch,
                    activeInvitation: joinState.haloInvitation || true,
                    active:
                      joinState.activeView === 'halo invitation acceptor' &&
                      joinState.haloViewState === 'invitation accepted',
                    invitationType: 'halo'
                  }}
                />
                <IdentityAdded
                  {...{
                    dispatch,
                    addedIdentity: joinState.selectedIdentity,
                    active: joinState.activeView === 'identity added'
                  }}
                />
                <InvitationInput
                  {...{
                    dispatch,
                    activeInvitation: joinState.spaceInvitation || true,
                    selectedIdentity: joinState.selectedIdentity,
                    active:
                      joinState.activeView === 'space invitation acceptor' &&
                      joinState.spaceViewState === 'invitation input',
                    invitationType: 'space'
                  }}
                />
                <InvitationRescuer
                  {...{
                    dispatch,
                    activeInvitation: joinState.spaceInvitation || true,
                    selectedIdentity: joinState.selectedIdentity,
                    active:
                      joinState.activeView === 'space invitation acceptor' &&
                      joinState.spaceViewState === 'invitation rescuer',
                    invitationType: 'space'
                  }}
                />
                <InvitationAuthenticator
                  {...{
                    dispatch,
                    activeInvitation: joinState.spaceInvitation || true,
                    selectedIdentity: joinState.selectedIdentity,
                    active:
                      joinState.activeView === 'space invitation acceptor' &&
                      joinState.spaceViewState === 'invitation authenticator',
                    invitationType: 'space',
                    ...(joinState.spaceInvitationAnnotation === 'authentication failed' && { failed: true })
                  }}
                />
                <InvitationAccepted
                  {...{
                    dispatch,
                    activeInvitation: joinState.spaceInvitation || true,
                    selectedIdentity: joinState.selectedIdentity,
                    active:
                      joinState.activeView === 'space invitation acceptor' &&
                      joinState.spaceViewState === 'invitation accepted',
                    invitationType: 'space'
                  }}
                />
              </div>
            </div>
          </AlertPrimitive.Content>
        </AlertPrimitive.Overlay>
      </ThemeContext.Provider>
    </AlertPrimitive.Root>
  );
};
