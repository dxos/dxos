//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Icon, Toolbar as NaturalToolbar, Select, type ThemedClassName } from '@dxos/react-ui';

import { type ActionHandler } from '../../actions/index.ts';
import { type LayoutKind, LAYOUTS } from '../../layout/index.ts';

export type ToolbarProps = ThemedClassName<{
  onAction?: ActionHandler;
}>;

export const Toolbar = ({ classNames, onAction }: ToolbarProps) => {
  const [layout, setLayout] = useState<LayoutKind>(LAYOUTS[0]);
  const handleAction: ActionHandler = async (action) => {
    return onAction?.(action) ?? false;
  };

  // TODO(burdon): Translations.
  return (
    <NaturalToolbar.Root classNames={['p-1', classNames]}>
      <NaturalButton onClick={() => handleAction({ type: 'debug' })} title='Toggle debug.'>
        <Icon icon='ph--bug--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'grid' })} title='Toggle snap.'>
        <Icon icon='ph--dots-nine--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'grid-snap' })} title='Toggle snap.'>
        <Icon icon='ph--arrows-in-line-horizontal--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'center' })} title='Center canvas.'>
        <Icon icon='ph--crosshair-simple--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'zoom-in' })} title='Center canvas.'>
        <Icon icon='ph--magnifying-glass-plus--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'zoom-out' })} title='Center canvas.'>
        <Icon icon='ph--magnifying-glass-minus--regular' />
      </NaturalButton>
      <Select.Root value={layout} onValueChange={(value) => setLayout(value as LayoutKind)}>
        <NaturalButton asChild>
          <Select.Trigger variant='ghost' classNames='w-[100px]' />
        </NaturalButton>
        <Select.Content>
          {LAYOUTS.map((layout) => (
            <Select.Item key={layout} item={{ value: layout, label: layout }} />
          ))}
        </Select.Content>
      </Select.Root>
      <NaturalButton onClick={() => handleAction({ type: 'layout', layout })} title='Do layout.'>
        <Icon icon='ph--graph--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'zoom-to-fit' })} title='Expand selected.'>
        <Icon icon='ph--arrows-out--regular' />
      </NaturalButton>
      <NaturalButton onClick={(ev) => handleAction({ type: 'delete', all: ev.shiftKey })} title='Delete objects.'>
        <Icon icon='ph--trash--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'create' })} title='Create objects.'>
        <Icon icon='ph--plus--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'trigger' })} title='Trigger event.'>
        <Icon icon='ph--play--regular' />
      </NaturalButton>
    </NaturalToolbar.Root>
  );
};
