//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { random } from '@dxos/random';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { type ColorStyles, getHashStyles, mx } from '@dxos/ui-theme';

import { Capabilities } from '../../../common/index.ts';
import * as Role from '../../../common/Role.ts';
import { withPluginManager } from '../../../testing/index.ts';
import { usePluginManager } from '../PluginManager/index.ts';
import { SurfaceComponent, useSurfaces } from './SurfaceComponent.tsx';
import { isSurfaceDebugEnabled, setSurfaceDebug } from './SurfaceDebug.tsx';
import { create, makeFilter } from './types.ts';

const ItemRole = Role.make<{ id: string }>('org.dxos.test.role.item');

type TestComponentProps = {
  id: string;
  styles: ColorStyles;
};

const TestComponent = ({ styles, id }: TestComponentProps) => {
  return (
    <div className={mx('flex justify-center items-center border rounded-sm', styles.bg, styles.border)}>
      <span className={mx('dx-tag dx-tag-inline font-mono text-lg', styles.fg)}>{id}</span>
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

type StoryArgs = {
  debug?: boolean;
};

const DefaultStory = ({ debug: debugProp }: StoryArgs) => {
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
      <Panel.Header>
        <Toolbar.Root>
          <Button.Root onClick={handleAdd}>Add</Button.Root>
          <Button.Root onClick={handleSelect}>Pick</Button.Root>
          <Button.Root onClick={handleError}>Error</Button.Root>
          <Toolbar.Separator />
          <Field.Root>
            <Field.Label classNames='pr-1'>Debug</Field.Label>
            <Input.Switch checked={debug} onCheckedChange={({ checked }) => handleToggleDebug(checked)} />
          </Field.Root>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='grid grid-cols-2 h-full gap-4 overflow-hidden'>
        <SurfaceComponent
          key={debug ? 'debug' : 'prod'}
          type={ItemRole}
          data={selected ? { id: selected } : undefined}
          limit={1}
        />
        <div className='overflow-y-auto h-full'>
          <Listbox.Root items={surfaces.map((surface) => ({ value: surface.id, label: surface.id }))}>
            <Listbox.Content aria-label='Surfaces'>
              {surfaces.map((surface) => (
                <Listbox.Item key={surface.id} id={surface.id}>
                  <Listbox.ItemText classNames='flex items-center'>{surface.id}</Listbox.ItemText>
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Root>
        </div>
      </Panel.Body>
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
