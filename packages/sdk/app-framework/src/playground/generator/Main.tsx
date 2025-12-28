//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { IconButton, List, ListItem } from '@dxos/react-ui';

import { Capabilities, createSurface } from '../../common';
import { Capability } from '../../core';
import { usePluginManager } from '../../react';

const Item = ({
  id,
  disabled,
  onRemove,
}: {
  id: string;
  disabled: boolean;
  onRemove: (id: string) => Promise<void>;
}) => {
  const handleRemove = useCallback(() => onRemove(id), [onRemove]);

  return (
    <ListItem.Root key={id} id={id}>
      <ListItem.Heading classNames='grow pbs-2'>{id}</ListItem.Heading>
      <ListItem.Endcap>
        <IconButton
          iconOnly
          variant='ghost'
          icon='ph--x--regular'
          label='Remove'
          disabled={disabled}
          onClick={handleRemove}
        />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};

export const Main = () => {
  const manager = usePluginManager();

  const handleRemove = useCallback(
    async (id: string) => {
      await manager.remove(id);
    },
    [manager],
  );

  return (
    <List itemSizes='one'>
      {manager.plugins.map((plugin) => (
        <Item
          key={plugin.meta.id}
          id={plugin.meta.id}
          disabled={manager.core.includes(plugin.meta.id)}
          onRemove={handleRemove}
        />
      ))}
    </List>
  );
};

export default Capability.makeModule(() =>
  Capability.contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'dxos.org/test/generator/main',
      role: 'primary',
      component: Main,
    }),
  ),
);
