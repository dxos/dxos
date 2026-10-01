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
      <Next.Button
        onClick={() => handleAction({ type: 'debug' })}
        label='Toggle debug.'
        icon='ph--bug--regular'
        iconOnly
      />
      <Next.Button
        onClick={() => handleAction({ type: 'grid' })}
        label='Toggle snap.'
        icon='ph--dots-nine--regular'
        iconOnly
      />
      <Next.Button
        onClick={() => handleAction({ type: 'grid-snap' })}
        label='Toggle snap.'
        icon='ph--arrows-in-line-horizontal--regular'
        iconOnly
      />
      <Next.Button
        onClick={() => handleAction({ type: 'center' })}
        label='Center canvas.'
        icon='ph--crosshair-simple--regular'
        iconOnly
      />
      <Next.Button
        onClick={() => handleAction({ type: 'zoom-in' })}
        label='Center canvas.'
        icon='ph--magnifying-glass-plus--regular'
        iconOnly
      />
      <Next.Button
        onClick={() => handleAction({ type: 'zoom-out' })}
        label='Center canvas.'
        icon='ph--magnifying-glass-minus--regular'
        iconOnly
      />
      <Next.Select.Root
        value={[layout]}
        onValueChange={({ value: [value] }) => setLayout(value as LayoutKind)}
        items={LAYOUTS.map((layout) => ({ value: layout, label: layout }))}
      >
        <Next.Select.Trigger classNames='w-[100px]' />
        <Next.Select.Content>
          {LAYOUTS.map((layout) => (
            <Next.Select.Item key={layout} item={{ value: layout, label: layout }} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
      <Next.Button
        onClick={() => handleAction({ type: 'layout', layout })}
        label='Do layout.'
        icon='ph--graph--regular'
        iconOnly
      />
      <Next.Button
        onClick={() => handleAction({ type: 'zoom-to-fit' })}
        label='Expand selected.'
        icon='ph--arrows-out--regular'
        iconOnly
      />
      <Next.Button
        onClick={(ev) => handleAction({ type: 'delete', all: ev.shiftKey })}
        label='Delete objects.'
        icon='ph--trash--regular'
        iconOnly
      />
      <Next.Button
        onClick={() => handleAction({ type: 'create' })}
        label='Create objects.'
        icon='ph--plus--regular'
        iconOnly
      />
      <Next.Button
        onClick={() => handleAction({ type: 'trigger' })}
        label='Trigger event.'
        icon='ph--play--regular'
        iconOnly
      />
    </Next.Toolbar.Root>
  );
};
