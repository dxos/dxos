//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Icon, Toolbar as NaturalToolbar, Select, type ThemedClassName } from '@dxos/react-ui';

import { type ActionHandler } from '../../actions';
import { LAYOUTS, type LayoutKind } from '../../layout';

export type ToolbarProps = ThemedClassName<{
  onAction?: ActionHandler;
}>;

export const Toolbar = ({ classNames, onAction }: ToolbarProps) => {
  const [layout, setLayout] = useState<LayoutKind>(LAYOUTS[0]);
  const handleAction: ActionHandler = async (action) => onAction?.(action) ?? false;

  // TODO(burdon): Translations.
  return (
    <NaturalToolbar.Root classNames={['p-1', classNames]}>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'debug' })} title='Toggle debug.'>
        <Icon icon='ph--bug--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'grid' })} title='Toggle snap.'>
        <Icon icon='ph--dots-nine--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'grid-snap' })} title='Toggle snap.'>
        <Icon icon='ph--arrows-in-line-horizontal--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'center' })} title='Center canvas.'>
        <Icon icon='ph--crosshair-simple--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'zoom-in' })} title='Center canvas.'>
        <Icon icon='ph--magnifying-glass-plus--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'zoom-out' })} title='Center canvas.'>
        <Icon icon='ph--magnifying-glass-minus--regular' />
      </NaturalToolbar.Button>
      <Select.Root value={layout} onValueChange={(value) => setLayout(value as LayoutKind)}>
        <NaturalToolbar.Button asChild>
          <Select.TriggerButton variant='ghost' classNames='w-[100px]' />
        </NaturalToolbar.Button>
        <Select.Portal>
          <Select.Content>
            <Select.ScrollUpButton />
            <Select.Viewport>
              {LAYOUTS.map((layout) => (
                <Select.Option key={layout} value={layout}>
                  {layout}
                </Select.Option>
              ))}
            </Select.Viewport>
            <Select.ScrollDownButton />
            <Select.Arrow />
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'layout', layout })} title='Do layout.'>
        <Icon icon='ph--graph--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'zoom-to-fit' })} title='Expand selected.'>
        <Icon icon='ph--arrows-out--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button
        onClick={(ev) => handleAction({ type: 'delete', all: ev.shiftKey })}
        title='Delete objects.'
      >
        <Icon icon='ph--trash--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'create' })} title='Create objects.'>
        <Icon icon='ph--plus--regular' />
      </NaturalToolbar.Button>
      <NaturalToolbar.Button onClick={() => handleAction({ type: 'trigger' })} title='Trigger event.'>
        <Icon icon='ph--play--regular' />
      </NaturalToolbar.Button>
    </NaturalToolbar.Root>
  );
};
