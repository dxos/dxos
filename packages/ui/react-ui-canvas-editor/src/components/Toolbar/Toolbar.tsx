//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Button, Select, type ThemedClassName, Toolbar as UiToolbar } from '@dxos/react-ui';

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
    <UiToolbar.Root classNames={['p-1', classNames]}>
      <Button onClick={() => handleAction({ type: 'debug' })} label='Toggle debug.' icon='ph--bug--regular' iconOnly />
      <Button
        onClick={() => handleAction({ type: 'grid' })}
        label='Toggle snap.'
        icon='ph--dots-nine--regular'
        iconOnly
      />
      <Button
        onClick={() => handleAction({ type: 'grid-snap' })}
        label='Toggle snap.'
        icon='ph--arrows-in-line-horizontal--regular'
        iconOnly
      />
      <Button
        onClick={() => handleAction({ type: 'center' })}
        label='Center canvas.'
        icon='ph--crosshair-simple--regular'
        iconOnly
      />
      <Button
        onClick={() => handleAction({ type: 'zoom-in' })}
        label='Center canvas.'
        icon='ph--magnifying-glass-plus--regular'
        iconOnly
      />
      <Button
        onClick={() => handleAction({ type: 'zoom-out' })}
        label='Center canvas.'
        icon='ph--magnifying-glass-minus--regular'
        iconOnly
      />
      <Select.Root
        value={[layout]}
        onValueChange={({ value: [value] }) => setLayout(value as LayoutKind)}
        items={LAYOUTS.map((layout) => ({ value: layout, label: layout }))}
      >
        <Select.Trigger classNames='w-[100px]' />
        <Select.Content>
          {LAYOUTS.map((layout) => (
            <Select.Item key={layout} item={{ value: layout, label: layout }} />
          ))}
        </Select.Content>
      </Select.Root>
      <Button
        onClick={() => handleAction({ type: 'layout', layout })}
        label='Do layout.'
        icon='ph--graph--regular'
        iconOnly
      />
      <Button
        onClick={() => handleAction({ type: 'zoom-to-fit' })}
        label='Expand selected.'
        icon='ph--arrows-out--regular'
        iconOnly
      />
      <Button
        onClick={(ev) => handleAction({ type: 'delete', all: ev.shiftKey })}
        label='Delete objects.'
        icon='ph--trash--regular'
        iconOnly
      />
      <Button
        onClick={() => handleAction({ type: 'create' })}
        label='Create objects.'
        icon='ph--plus--regular'
        iconOnly
      />
      <Button
        onClick={() => handleAction({ type: 'trigger' })}
        label='Trigger event.'
        icon='ph--play--regular'
        iconOnly
      />
    </UiToolbar.Root>
  );
};
