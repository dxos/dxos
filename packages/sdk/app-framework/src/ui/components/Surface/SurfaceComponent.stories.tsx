//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { random } from '@dxos/random';
import { Input, Panel, Toolbar } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ColorStyles, getHashStyles, mx } from '@dxos/ui-theme';

import { Capabilities } from '../../../common';
import * as Role from '../../../common/Role';
import { withPluginManager } from '../../../testing';
import { usePluginManager } from '../PluginManager';
import { SurfaceComponent, useSurfaces } from './SurfaceComponent';
import { isSurfaceDebugEnabled, setSurfaceDebug } from './SurfaceDebug';
import { create, makeFilter } from './types';

const ItemRole = Role.make<{ id: string }>('org.dxos.test.role.item');

type TestComponentProps = {
  id: string;
  styles: ColorStyles;
};

const TestComponent = ({ styles, id }: TestComponentProps) => {
  return (
    <div className={mx('flex justify-center items-center border rounded-sm', styles.bg, styles.border)}>
      <span className={mx('dx-tag font-mono text-lg', styles.fg)}>{id}</span>
    </div>
  );
};

const ErrorComponent = () => {
  const [count, setCount] = useState(3);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((count) => {
        if (count <= 1) {
          clearInterval(interval);
        }

        return count - 1;
      });
    }, 1_000);
    return () => clearInterval(interval);
  }, []);

  if (count <= 0) {
    throw new Error('BANG!');
  }

  return (
    <div className='flex justify-center items-center border border-rose-bg rounded-sm'>
      <span className='font-mono'>Ticking... {count}</span>
    </div>
  );
};

type StoryProps = {
  debug?: boolean;
};

const DefaultStory = ({ debug: debugProp }: StoryProps) => {
  const manager = usePluginManager();
  const surfaces = useSurfaces();
  const [selected, setSelected] = useState<string | undefined>();
  const [debug, setDebug] = useState(debugProp ?? isSurfaceDebugEnabled());

  // Restore the global debug flag on unmount so other stories don't inherit it.
  useEffect(() => {
    const previous = debugProp ?? isSurfaceDebugEnabled();
    return () => setSurfaceDebug(previous);
  }, []);

  const handleToggleDebug = useCallback((next: boolean) => {
    setSurfaceDebug(next);
    setDebug(next);
  }, []);

  const handleAdd = useCallback(() => {
    const id = `test${random.number.int({ min: 0, max: 1_000 })}`;
    const styles = getHashStyles(id);

    manager.capabilities.contribute({
      module: 'test',
      interface: Capabilities.ReactSurface,
      implementation: create({
        id,
        filter: makeFilter(ItemRole, (data) => data.id === id),
        component: () => <TestComponent id={id} styles={styles} />,
      }),
    });

    setSelected(id);
  }, [manager]);

  const handleSelect = useCallback(() => {
    setSelected(random.helpers.arrayElement(surfaces)?.id);
  }, [surfaces]);

  const handleError = useCallback(() => {
    manager.capabilities.contribute({
      module: 'error',
      interface: Capabilities.ReactSurface,
      implementation: create({
        id: 'error',
        filter: makeFilter(ItemRole, (data) => data.id === 'error'),
        component: ErrorComponent,
      }),
    });

    setSelected('error');
  }, [manager]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleAdd}>Add</Toolbar.Button>
          <Toolbar.Button onClick={handleSelect}>Pick</Toolbar.Button>
          <Toolbar.Button onClick={handleError}>Error</Toolbar.Button>
          <Toolbar.Separator />
          <Input.Root>
            <Input.Label classNames='pr-1'>Debug</Input.Label>
            <Input.Switch checked={debug} onCheckedChange={handleToggleDebug} />
          </Input.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='grid grid-cols-2 h-full gap-4 overflow-hidden'>
        <SurfaceComponent
          key={debug ? 'debug' : 'prod'}
          type={ItemRole}
          data={selected ? { id: selected } : undefined}
          limit={1}
        />
        <div className='overflow-y-auto h-full'>
          <Listbox.Root>
            <Listbox.Content aria-label='Surfaces'>
              {surfaces.map((surface) => (
                <Listbox.Item key={surface.id} id={surface.id}>
                  <Listbox.ItemLabel classNames='flex items-center'>{surface.id}</Listbox.ItemLabel>
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Root>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'sdk/app-framework/components/Surface',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager({ capabilities: [] })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    debug: true,
  },
};
