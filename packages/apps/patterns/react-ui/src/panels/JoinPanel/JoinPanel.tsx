//
// Copyright 2023 DXOS.org
//
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import React, { useReducer } from 'react';

import type { Profile } from '@dxos/client';
import { ThemeContext, useId } from '@dxos/react-components';

import { JoinSpaceHeading } from './JoinSpaceHeading';

type Space = { properties: { title: string } };

export interface JoinPanelProps {
  space: Space;
  deviceHasIdentities?: boolean;
}

interface IdentityAction {
  type: 'select identity' | 'added identity';
  identity: Profile;
}

interface EmptyJoinAction {
  type: 'deselect identity' | 'cancel addition' | 'add identity';
}

interface AdditionMethodAction {
  type: 'select addition method';
  method: 'restore identity' | 'accept device invitation' | 'create identity';
}

type JoinAction = IdentityAction | EmptyJoinAction | AdditionMethodAction;

type JoinView =
  | 'identities enum'
  | 'addition method enum'
  | 'restore identity init'
  | 'accept device invitation'
  | 'create identity init'
  | 'identity added'
  | 'accept space invitation';

interface JoinState {
  activeView: JoinView;
  space: Space;
  selectedIdentity: Profile | null;
}

export const JoinPanel = ({ space, deviceHasIdentities }: JoinPanelProps) => {
  const titleId = useId('joinTitle');

  const spaceTitle = space.properties.title;

  const reducer = (state: JoinState, action: JoinAction) => {
    switch (action.type) {
      case 'add identity':
        break;
      // todo: fill this in with the correct logic
    }
    return state;
  };

  const [_joinState, _dispatchJoinAction] = useReducer(reducer, {
    space: { properties: { title: spaceTitle } },
    activeView: deviceHasIdentities ? 'identities enum' : 'addition method enum',
    selectedIdentity: null
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
          </div>
          {/* todo: choose what to render */}
        </AlertPrimitive.Content>
      </ThemeContext.Provider>
    </AlertPrimitive.Root>
  );
};
