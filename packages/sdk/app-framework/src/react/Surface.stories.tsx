//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { useCallback, useState } from 'react';

import { faker } from '@dxos/random';
import { Button, List, ListItem } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

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

const Story = () => {
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

export default {
  title: 'sdk/app-framework/Surface',
  render: ({ manager }: { manager: PluginManager }) => {
    return (
      <PluginManagerProvider value={manager}>
        <Story />
      </PluginManagerProvider>
    );
  },
  // NOTE: Intentionally not using withPluginManager to try to reduce surface area of the story.
  decorators: [withTheme, withLayout()],
  args: {
    manager: setupPluginManager(),
  },
};

export const Default = {};
