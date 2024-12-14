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

// TODO(burdon): Generalize state management.
export const Toolbar = ({ classNames, onAction }: ToolbarProps) => {
  return (
    <NaturalToolbar.Root classNames={mx('p-1', classNames)}>
      <NaturalToolbar.Button onClick={() => onAction?.({ type: 'debug' })} title='Toggle debug.'>
        <Icon icon='ph--bug--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => onAction?.({ type: 'grid' })} title='Toggle snap.'>
        <Icon icon='ph--dots-nine--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => onAction?.({ type: 'snap' })} title='Toggle snap.'>
        <Icon icon='ph--arrows-in-line-horizontal--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => onAction?.({ type: 'center' })} title='Center canvas.'>
        <Icon icon='ph--target--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => onAction?.({ type: 'zoom-in' })} title='Center canvas.'>
        <Icon icon='ph--magnifying-glass-plus--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => onAction?.({ type: 'zoom-out' })} title='Center canvas.'>
        <Icon icon='ph--magnifying-glass-minus--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => onAction?.({ type: 'create' })} title='Create objects.'>
        <Icon icon='ph--plus--regular' />
      </NaturalToolbar.Button>
    </NaturalToolbar.Root>
  );
};
