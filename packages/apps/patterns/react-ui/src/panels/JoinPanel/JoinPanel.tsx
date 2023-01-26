//
// Copyright 2023 DXOS.org
//
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import React, { useEffect, useReducer } from 'react';

import { useClient, useIdentity } from '@dxos/react-client';
import { ThemeContext, useId } from '@dxos/react-components';

import { JoinHeading } from './JoinHeading';
import { JoinAction, JoinPanelProps, JoinState } from './JoinPanelProps';
import {
  AdditionMethodSelector,
  IdentitySelector,
  IdentityCreator,
  IdentityAdded,
  InvitationAuthenticator,
  InvitationConnector
} from './view-states';

export const JoinPanel = ({ initialInvitation }: JoinPanelProps) => {
  const client = useClient();
  const titleId = useId('joinTitle');
  const identity = useIdentity();

  const availableIdentities = identity ? [identity] : [];

  const reducer = (state: JoinState, action: JoinAction) => {
    const nextState = { ...state };
    switch (action.type) {
      case 'added identity':
        nextState.activeView = 'identity added';
        nextState.selectedIdentity = action.identity;
        break;
      case 'add identity':
        nextState.activeView = 'addition method selector';
        break;
      case 'select addition method':
        nextState.activeView = 'identity creator';
        nextState.additionMethod = action.method;
        break;
      case 'select identity':
        nextState.selectedIdentity = action.identity;
        nextState.activeView = 'space invitation acceptor';
        state.spaceInvitation?.invitation && client.echo.acceptInvitation(state.spaceInvitation.invitation);
        break;
      case 'deselect identity':
        nextState.selectedIdentity = undefined;
        nextState.activeView = 'identity selector';
        break;
      case 'cancel invitation':
      case 'fail invitation':
      case 'timeout invitation':
      case 'connecting invitation':
        nextState[action.from === 'halo' ? 'haloViewState' : 'spaceViewState'] = 'invitation connector';
        break;
      case 'connect invitation':
      case 'authenticating invitation':
        nextState[action.from === 'halo' ? 'haloViewState' : 'spaceViewState'] = 'invitation authenticator';
        break;
      case 'accepted invitation':
        nextState[action.from === 'halo' ? 'haloViewState' : 'spaceViewState'] = 'invitation accepted';
        break;
    }
    console.log('[reducer]', action, nextState);
    return nextState;
  };

  const [joinState, dispatch] = useReducer(reducer, {
    spaceInvitation: initialInvitation,
    haloInvitation: undefined,
    activeView: availableIdentities.length > 0 ? 'identity selector' : 'addition method selector',
    selectedIdentity: undefined,
    additionMethod: undefined,
    spaceViewState: 'invitation connector',
    haloViewState: 'invitation connector'
  });

  useEffect(() => {
    // TODO (thure): Validate if this is sufficiently synchronous for iOS to move focus. It might not be!
    const attrValue =
      joinState.activeView === 'identity creator'
        ? `${joinState.activeView}; ${joinState.additionMethod}`
        : joinState.activeView === 'space invitation acceptor'
        ? `${joinState.activeView}; ${joinState.spaceViewState}`
        : joinState.activeView === 'halo invitation acceptor'
        ? `${joinState.activeView}; ${joinState.haloViewState}`
        : joinState.activeView;
    console.log('[autofocus value]', attrValue);
    const $nextAutofocus: HTMLElement | null = document.querySelector(`[data-autofocus="${attrValue}"]`);
    if ($nextAutofocus) {
      $nextAutofocus.focus();
    }
  }, [joinState.activeView, joinState.spaceViewState, joinState.haloViewState]);

  useEffect(() => {
    joinState.spaceInvitation?.subscribe({
      onAuthenticating: () => dispatch({ type: 'authenticating invitation', from: 'space' }),
      onCancelled: () => dispatch({ type: 'cancel invitation', from: 'space' }),
      onConnected: () => dispatch({ type: 'connect invitation', from: 'space' }),
      onConnecting: () => dispatch({ type: 'connecting invitation', from: 'space' }),
      onError: () => dispatch({ type: 'fail invitation', from: 'space' }),
      onSuccess: () => dispatch({ type: 'accepted invitation', from: 'space' }),
      onTimeout: () => dispatch({ type: 'timeout invitation', from: 'space' })
    });
  }, [joinState.spaceInvitation]);

  useEffect(() => {
    joinState.haloInvitation?.subscribe({
      onAuthenticating: () => dispatch({ type: 'authenticating invitation', from: 'halo' }),
      onCancelled: () => dispatch({ type: 'cancel invitation', from: 'halo' }),
      onConnected: () => dispatch({ type: 'connect invitation', from: 'halo' }),
      onConnecting: () => dispatch({ type: 'connecting invitation', from: 'halo' }),
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
          >
            <JoinHeading titleId={titleId} invitation={joinState.spaceInvitation} onClickExit={() => {}} />
            <div role='none' className='is-full overflow-hidden'>
              <div role='none' className='flex is-[600%]' aria-live='polite'>
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
                <IdentityCreator
                  {...{
                    dispatch,
                    active:
                      joinState.activeView === 'identity creator' && joinState.additionMethod === 'create identity'
                  }}
                />
                <IdentityAdded
                  {...{
                    dispatch,
                    addedIdentity: joinState.selectedIdentity,
                    active: joinState.activeView === 'identity added'
                  }}
                />
                <InvitationConnector
                  {...{
                    dispatch,
                    activeInvitation: joinState.spaceInvitation || true,
                    selectedIdentity: joinState.selectedIdentity,
                    active:
                      joinState.activeView === 'space invitation acceptor' &&
                      joinState.spaceViewState === 'invitation connector',
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
