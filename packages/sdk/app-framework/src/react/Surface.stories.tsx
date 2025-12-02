//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { faker } from '@dxos/random';
import { List, ListItem, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { type ColorStyles, getHashStyles, mx } from '@dxos/react-ui-theme';

import { Capabilities, createSurface } from '../common';
import { withPluginManager } from '../testing';

import { usePluginManager } from './PluginManagerProvider';
import { Surface, useSurfaces } from './Surface';

type TestComponentProps = {
  id: string;
  styles: ColorStyles;
};

const TestComponent = forwardRef<HTMLDivElement, TestComponentProps>(({ styles, id }, forwardedRef) => {
  return (
    <div
      className={mx('flex justify-center items-center border rounded', styles.surface, styles.border)}
      ref={forwardedRef}
    >
      <span className={mx('dx-tag font-mono text-lg', styles.text)}>{id}</span>
    </div>
  );
});

const DefaultStory = () => {
  const [selected, setSelected] = useState<string | undefined>();
  const manager = usePluginManager();
  const surfaces = useSurfaces();

  const handleAdd = useCallback(() => {
    const id = `test-${faker.number.int({ min: 0, max: 1_000 })}`;
    const styles = getHashStyles(id);

    manager.context.contributeCapability({
      module: 'test',
      interface: Capabilities.ReactSurface,
      implementation: createSurface({
        id,
        role: 'item',
        filter: (data): data is any => (data as any)?.id === id,
        component: ({ ref }) => <TestComponent id={id} styles={styles} ref={ref} />,
      }),
    });

    setSelected(id);
  }, [manager]);

  const handleSelect = useCallback(() => {
    setSelected(faker.helpers.arrayElement(surfaces)?.id);
  }, [surfaces]);

  const handleError = useCallback(() => {
    manager.context.contributeCapability({
      module: 'error',
      interface: Capabilities.ReactSurface,
      implementation: createSurface({
        id: 'error',
        role: 'item',
        filter: (data): data is any => (data as any)?.id === 'error',
        component: () => {
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
            <div className='flex justify-center items-center border border-roseFill rounded'>
              <span className='font-mono'>Ticking... {count}</span>
            </div>
          );
        },
      }),
    });

    setSelected('error');
  }, [manager]);

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    console.log(ref.current);
  }, [ref]);

  return (
    <div className='flex flex-col bs-full overflow-hidden'>
      <Toolbar.Root>
        <Toolbar.Button onClick={handleAdd}>Add</Toolbar.Button>
        <Toolbar.Button onClick={handleSelect}>Pick</Toolbar.Button>
        <Toolbar.Button onClick={handleError}>Error</Toolbar.Button>
      </Toolbar.Root>
      <div className='grid grid-cols-2 bs-full gap-4 overflow-hidden'>
        <Surface role='item' data={selected ? { id: selected } : undefined} limit={1} ref={ref} />
        <div className='overflow-y-auto bs-full'>
          <List>
            {surfaces.map((surface) => (
              <ListItem.Root key={surface.id} id={surface.id}>
                <ListItem.Heading classNames='flex items-center'>{surface.id}</ListItem.Heading>
              </ListItem.Root>
            ))}
          </List>
        </div>
      </div>
    </div>
  );
};

const meta = {
  title: 'sdk/app-framework/Surface',
  render: DefaultStory,
  decorators: [withTheme, withPluginManager({ capabilities: [] })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
