//
// Copyright 2023 DXOS.org
//
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import React, { PropsWithChildren, useReducer } from 'react';

import { ThemeContext, useId } from '@dxos/react-components';

import { JoinAction, JoinPanelProps, JoinState } from './JoinPanelProps';
import { JoinSpaceHeading } from './JoinSpaceHeading';
import { AdditionMethodSelector } from './view-states/AdditionMethodSelector';
import { IdentitySelector } from './view-states/IdentitySelector';

const ViewState = ({ children }: PropsWithChildren<{}>) => {
  return (
    <div role='none' className='basis-0 grow'>
      {children}
    </div>
  );
};

export const JoinPanel = ({ space, availableIdentities }: JoinPanelProps) => {
  const titleId = useId('joinTitle');

  const spaceTitle = space.properties.get('title') ?? '';

  const reducer = (state: JoinState, action: JoinAction) => {
    switch (action.type) {
      case 'add identity':
        break;
      // todo: fill this in with the correct logic
    }
    return state;
  };

  const [_joinState, dispatch] = useReducer(reducer, {
    space,
    activeView: availableIdentities.length > 0 ? 'identity selector' : 'addition method selector',
    selectedIdentity: undefined,
    additionMethod: undefined
  });

  return (
    <AlertPrimitive.Root defaultOpen>
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        <AlertPrimitive.Overlay className='fixed inset-0 backdrop-blur z-50' />
        <AlertPrimitive.Content
          aria-labelledby={titleId}
          className='fixed inset-0 z-[51] flex flex-col items-center justify-center p-2 md:p-4 lg:p-8'
        >
          <div role='none' className='is-full max-is-[480px]'>
            <JoinSpaceHeading titleId={titleId} spaceTitle={spaceTitle} onClickExit={() => {}} />
            <div role='none' className='is-full overflow-x-auto overflow-y-hidden'>
              <div role='none' className='flex is-[200%]'>
                <ViewState>
                  <IdentitySelector {...{ dispatch, availableIdentities }} />
                </ViewState>
                <ViewState>
                  <AdditionMethodSelector {...{ dispatch, availableIdentities }} />
                </ViewState>
              </div>
            </div>
          </div>
        </AlertPrimitive.Content>
      </ThemeContext.Provider>
    </AlertPrimitive.Root>
  );
};
