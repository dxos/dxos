//
// Copyright 2023 DXOS.org
//
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import React, { useEffect, useReducer } from 'react';

import { useIdentity } from '@dxos/react-client';
import { mx, ThemeContext, useId } from '@dxos/react-components';

import { defaultSurface } from '../../styles';
import { JoinHeading } from './JoinHeading';
import { JoinAction, JoinPanelProps, JoinState } from './JoinPanelProps';
import { AdditionMethodSelector, IdentitySelector, IdentityCreator, IdentityAdded } from './view-states';

export const JoinPanel = ({ initialInvitation }: JoinPanelProps) => {
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
        nextState.activeView = 'create identity init';
        nextState.additionMethod = action.method;
        break;
      case 'select identity':
        nextState.selectedIdentity = action.identity;
        nextState.activeView = 'accept space invitation';
        break;
      case 'deselect identity':
        nextState.selectedIdentity = undefined;
        nextState.activeView = 'identity selector';
        break;
      // todo: fill this in with the correct logic
    }
    console.log('[reducer]', action, nextState);
    return nextState;
  };

  const [joinState, dispatch] = useReducer(reducer, {
    spaceInvitation: initialInvitation,
    haloInvitation: undefined,
    activeView: availableIdentities.length > 0 ? 'identity selector' : 'addition method selector',
    selectedIdentity: undefined,
    additionMethod: undefined
  });

  useEffect(() => {
    // TODO (thure): Validate if this is sufficiently synchronous for iOS to move focus. It might not be!
    const attrValue =
      joinState.activeView === 'create identity init'
        ? `${joinState.activeView}; ${joinState.additionMethod}`
        : joinState.activeView;
    const $nextAutofocus: HTMLElement | null = document.querySelector(`[data-autofocus="${attrValue}"]`);
    if ($nextAutofocus) {
      $nextAutofocus.focus();
    }
  }, [joinState.activeView]);

  return (
    <AlertPrimitive.Root defaultOpen>
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        <AlertPrimitive.Overlay className='fixed inset-0 backdrop-blur z-50' />
        <AlertPrimitive.Content
          aria-labelledby={titleId}
          className='fixed inset-0 z-[51] flex flex-col items-center justify-center p-2 md:p-4 lg:p-8'
        >
          <div role='none' className='is-full max-is-[320px]'>
            <JoinHeading titleId={titleId} invitation={joinState.spaceInvitation} onClickExit={() => {}} />
            <div role='none' className={mx(defaultSurface, 'is-full overflow-hidden rounded-be-md p-0')}>
              <div role='none' className='flex is-[400%]' aria-live='polite'>
                <IdentitySelector
                  {...{ dispatch, availableIdentities, active: joinState.activeView === 'identity selector' }}
                />
                <AdditionMethodSelector
                  {...{ dispatch, availableIdentities, active: joinState.activeView === 'addition method selector' }}
                />
                <IdentityCreator
                  {...{
                    dispatch,
                    active:
                      joinState.activeView === 'create identity init' && joinState.additionMethod === 'create identity'
                  }}
                />
                <IdentityAdded
                  {...{
                    dispatch,
                    identity: joinState.selectedIdentity,
                    active: joinState.activeView === 'identity added'
                  }}
                />
              </div>
            </div>
          </div>
        </AlertPrimitive.Content>
      </ThemeContext.Provider>
    </AlertPrimitive.Root>
  );
};
