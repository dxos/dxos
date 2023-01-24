//
// Copyright 2023 DXOS.org
//
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import React, { useEffect, useReducer } from 'react';

import { mx, ThemeContext, useId } from '@dxos/react-components';

import { defaultSurface } from '../../styles';
import { JoinAction, JoinPanelProps, JoinState } from './JoinPanelProps';
import { JoinSpaceHeading } from './JoinSpaceHeading';
import { AdditionMethodSelector, IdentitySelector } from './view-states';

export const JoinPanel = ({ space, availableIdentities }: JoinPanelProps) => {
  const titleId = useId('joinTitle');

  const spaceTitle = space.properties.get('title') ?? '';

  const reducer = (state: JoinState, action: JoinAction) => {
    const nextState = { ...state };
    switch (action.type) {
      case 'add identity':
        nextState.activeView = 'addition method selector';
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
    space,
    activeView: availableIdentities.length > 0 ? 'identity selector' : 'addition method selector',
    selectedIdentity: undefined,
    additionMethod: undefined
  });

  useEffect(() => {
    console.log('[active view]', joinState.activeView);
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
            <JoinSpaceHeading titleId={titleId} spaceTitle={spaceTitle} onClickExit={() => {}} />
            <div role='none' className={mx(defaultSurface, 'is-full overflow-hidden rounded-be-md p-0')}>
              <div role='none' className='flex is-[200%]' aria-live='polite'>
                <IdentitySelector
                  {...{ dispatch, availableIdentities, active: joinState.activeView === 'identity selector' }}
                />
                <AdditionMethodSelector
                  {...{ dispatch, availableIdentities, active: joinState.activeView === 'addition method selector' }}
                />
              </div>
            </div>
          </div>
        </AlertPrimitive.Content>
      </ThemeContext.Provider>
    </AlertPrimitive.Root>
  );
};
