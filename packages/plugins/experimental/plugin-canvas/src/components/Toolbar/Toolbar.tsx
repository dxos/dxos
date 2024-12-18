//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Icon, Toolbar as NaturalToolbar, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type ActionHandler } from '../../actions';

export type ToolbarProps = ThemedClassName<{
  onAction?: ActionHandler;
}>;

export const Toolbar = ({ classNames, onAction }: ToolbarProps) => {
  const handleAction: ActionHandler = (action) => {
    return onAction?.(action) ?? false;
  };

  return (
    <NaturalToolbar.Root classNames={mx('p-1', classNames)}>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'debug' })} title='Toggle debug.'>
        <Icon icon='ph--bug--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'grid' })} title='Toggle snap.'>
        <Icon icon='ph--dots-nine--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'snap' })} title='Toggle snap.'>
        <Icon icon='ph--arrows-in-line-horizontal--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'center' })} title='Center canvas.'>
        <Icon icon='ph--crosshair-simple--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'zoom-to-fit' })} title='Expand selected.'>
        <Icon icon='ph--arrows-out--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'zoom-in' })} title='Center canvas.'>
        <Icon icon='ph--magnifying-glass-plus--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'zoom-out' })} title='Center canvas.'>
        <Icon icon='ph--magnifying-glass-minus--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'layout' })} title='Do layout.'>
        <Icon icon='ph--align-center-horizontal--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'create' })} title='Create objects.'>
        <Icon icon='ph--plus--regular' />
      </NaturalToolbar.Button>
    </NaturalToolbar.Root>
  );
};
