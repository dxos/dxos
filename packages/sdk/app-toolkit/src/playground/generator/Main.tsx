//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Role } from '@dxos/app-framework';
import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { EffectEx } from '@dxos/effect';
import { IconButton } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { PlaygroundRoles } from '../roles';

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
    <Listbox.Item id={id}>
      <Listbox.ItemLabel>{id}</Listbox.ItemLabel>
      <IconButton
        iconOnly
        variant='ghost'
        icon='ph--x--regular'
        label='Remove'
        disabled={disabled}
        onClick={handleRemove}
      />
    </Listbox.Item>
  );
};

export const Main = () => {
  const manager = usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  const core = useAtomValue(manager.core);

  const handleRemove = useCallback(
    async (id: string) => {
      await EffectEx.runAndForwardErrors(manager.remove(id));
    },
    [manager],
  );

  return (
    <Listbox.Root>
      <Listbox.Content aria-label='Plugins'>
        {plugins.map((plugin) => (
          <Item
            key={plugin.meta.profile.key}
            id={plugin.meta.profile.key}
            disabled={core.includes(plugin.meta.profile.key)}
            onRemove={handleRemove}
          />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'org.dxos.test.generator.main',
        filter: Role.makeFilter(PlaygroundRoles.Primary),
        component: Main,
      }),
    ),
  ),
);
