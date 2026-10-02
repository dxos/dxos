//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import * as Icon from '@dxos/react-ui/Icon';
import * as Select from '@dxos/react-ui/Select';
import * as ToolbarModule from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

import { type ActionHandler } from '../../actions/index.ts';
import { type LayoutKind, LAYOUTS } from '../../layout/index.ts';

export type ToolbarProps = Util.ThemedClassName<{
  onAction?: ActionHandler;
}>;

export const Toolbar = ({ classNames, onAction }: ToolbarProps) => {
  const [layout, setLayout] = useState<LayoutKind>(LAYOUTS[0]);
  const handleAction: ActionHandler = async (action) => {
    return onAction?.(action) ?? false;
  };

  // TODO(burdon): Translations.
  return (
    <ToolbarModule.Root classNames={['p-1', classNames]}>
      <ToolbarModule.Button onClick={() => handleAction({ type: 'debug' })} title='Toggle debug.'>
        <Icon.Root icon='ph--bug--regular' />
      </ToolbarModule.Button>
      <ToolbarModule.Button onClick={() => handleAction({ type: 'grid' })} title='Toggle snap.'>
        <Icon.Root icon='ph--dots-nine--regular' />
      </ToolbarModule.Button>
      <ToolbarModule.Button onClick={() => handleAction({ type: 'grid-snap' })} title='Toggle snap.'>
        <Icon.Root icon='ph--arrows-in-line-horizontal--regular' />
      </ToolbarModule.Button>
      <ToolbarModule.Button onClick={() => handleAction({ type: 'center' })} title='Center canvas.'>
        <Icon.Root icon='ph--crosshair-simple--regular' />
      </ToolbarModule.Button>
      <ToolbarModule.Button onClick={() => handleAction({ type: 'zoom-in' })} title='Center canvas.'>
        <Icon.Root icon='ph--magnifying-glass-plus--regular' />
      </ToolbarModule.Button>
      <ToolbarModule.Button onClick={() => handleAction({ type: 'zoom-out' })} title='Center canvas.'>
        <Icon.Root icon='ph--magnifying-glass-minus--regular' />
      </ToolbarModule.Button>
      <Select.Root value={layout} onValueChange={(value) => setLayout(value as LayoutKind)}>
        <ToolbarModule.Button asChild>
          <Select.TriggerButton variant='ghost' classNames='w-[100px]' />
        </ToolbarModule.Button>
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {LAYOUTS.map((layout) => (
                <Select.Option key={layout} value={layout}>
                  {layout}
                </Select.Option>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <ToolbarModule.Button onClick={() => handleAction({ type: 'layout', layout })} title='Do layout.'>
        <Icon.Root icon='ph--graph--regular' />
      </ToolbarModule.Button>
      <ToolbarModule.Button onClick={() => handleAction({ type: 'zoom-to-fit' })} title='Expand selected.'>
        <Icon.Root icon='ph--arrows-out--regular' />
      </ToolbarModule.Button>
      <ToolbarModule.Button
        onClick={(ev) => handleAction({ type: 'delete', all: ev.shiftKey })}
        title='Delete objects.'
      >
        <Icon.Root icon='ph--trash--regular' />
      </ToolbarModule.Button>
      <ToolbarModule.Button onClick={() => handleAction({ type: 'create' })} title='Create objects.'>
        <Icon.Root icon='ph--plus--regular' />
      </ToolbarModule.Button>
      <ToolbarModule.Button onClick={() => handleAction({ type: 'trigger' })} title='Trigger event.'>
        <Icon.Root icon='ph--play--regular' />
      </ToolbarModule.Button>
    </ToolbarModule.Root>
  );
};
