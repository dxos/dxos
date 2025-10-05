//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { useCallback, useState } from 'react';

import { faker } from '@dxos/random';
import { Button, List, ListItem } from '@dxos/react-ui';

import { Capabilities, createSurface } from '../common';
import { type PluginManager } from '../core';
import { setupPluginManager } from '../testing';

import { PluginManagerProvider, usePluginManager } from './PluginManagerProvider';
import { Surface, useSurfaces } from './Surface';

const randomColor = (): string => {
  const hue = faker.number.int({ min: 0, max: 360 });
  const saturation = faker.number.int({ min: 50, max: 90 });
  const lightness = faker.number.int({ min: 40, max: 70 });
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const Component = () => {
  const manager = usePluginManager();
  const surfaces = useSurfaces();
  const [picked, setPicked] = useState('test');

  const handleAdd = useCallback(() => {
    const id = `test-${faker.number.int({ min: 0, max: 1_000_000 })}`;
    const backgroundColor = randomColor();

    manager.context.contributeCapability({
      module: 'test',
      interface: Capabilities.ReactSurface,
      implementation: createSurface({
        id,
        role: id,
        component: () => (
          <div className='flex-1' style={{ backgroundColor }}>
            {id}
          </div>
        ),
      }),
    });

    setPicked(id);
  }, [manager]);

  const handlePick = useCallback(() => {
    setPicked(faker.helpers.arrayElement(surfaces).id);
  }, [surfaces]);

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex gap-2'>
        <Button onClick={handleAdd}>Add</Button>
        <Button onClick={handlePick}>Pick</Button>
      </div>
      <div className='flex gap-2'>
        <div className='flex-1'>
          <List itemSizes='one'>
            {surfaces.map((surface) => (
              <ListItem.Root key={surface.id} id={surface.id}>
                <ListItem.Heading classNames='grow pbs-2'>{surface.id}</ListItem.Heading>
              </ListItem.Root>
            ))}
          </List>
        </div>
        <div className='flex-1'>
          <Surface role={picked} limit={1} />
        </div>
      </div>
    </div>
  );
};

const DefaultStory = (props: { manager: PluginManager }) => {
  return (
    <PluginManagerProvider value={props.manager}>
      <Component />
    </PluginManagerProvider>
  );
};

const meta = {
  title: 'sdk/app-framework/Surface',

  decorators: [withTheme],
  render: DefaultStory,
  args: {
    manager: setupPluginManager(),
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
