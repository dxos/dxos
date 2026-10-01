//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

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
    <Next.Toolbar.Root classNames={['p-1', classNames]}>
      <NaturalButton onClick={() => handleAction({ type: 'debug' })} title='Toggle debug.'>
        <Next.Icon icon='ph--bug--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'grid' })} title='Toggle snap.'>
        <Next.Icon icon='ph--dots-nine--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'grid-snap' })} title='Toggle snap.'>
        <Next.Icon icon='ph--arrows-in-line-horizontal--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'center' })} title='Center canvas.'>
        <Next.Icon icon='ph--crosshair-simple--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'zoom-in' })} title='Center canvas.'>
        <Next.Icon icon='ph--magnifying-glass-plus--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'zoom-out' })} title='Center canvas.'>
        <Next.Icon icon='ph--magnifying-glass-minus--regular' />
      </NaturalButton>
      <Next.Select.Root value={layout} onValueChange={(value) => setLayout(value as LayoutKind)}>
        <NaturalButton asChild>
          <Next.Select.Trigger variant='ghost' classNames='w-[100px]' />
        </NaturalButton>
        <Next.Select.Content>
          {LAYOUTS.map((layout) => (
            <Next.Select.Item key={layout} item={{ value: layout, label: layout }} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
      <NaturalButton onClick={() => handleAction({ type: 'layout', layout })} title='Do layout.'>
        <Next.Icon icon='ph--graph--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'zoom-to-fit' })} title='Expand selected.'>
        <Next.Icon icon='ph--arrows-out--regular' />
      </NaturalButton>
      <NaturalButton onClick={(ev) => handleAction({ type: 'delete', all: ev.shiftKey })} title='Delete objects.'>
        <Next.Icon icon='ph--trash--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'create' })} title='Create objects.'>
        <Next.Icon icon='ph--plus--regular' />
      </NaturalButton>
      <NaturalButton onClick={() => handleAction({ type: 'trigger' })} title='Trigger event.'>
        <Next.Icon icon='ph--play--regular' />
      </NaturalButton>
    </Next.Toolbar.Root>
  );
};
