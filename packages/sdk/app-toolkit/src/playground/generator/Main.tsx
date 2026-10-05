//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as Surface from '@dxos/app-framework/Surface';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';

import { PlaygroundRoles } from '../roles.ts';

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
      <Listbox.ItemText>{id}</Listbox.ItemText>
      <Button.Root
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
  const manager = PluginManagerProvider.usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  const core = useAtomValue(manager.core);

  const handleRemove = useCallback(
    async (id: string) => {
      await EffectEx.runAndForwardErrors(manager.remove(id));
    },
    [manager],
  );

  return (
    <Listbox.Root items={plugins.map((plugin) => ({ value: plugin.meta.profile.key, label: plugin.meta.profile.key }))}>
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
    Capability.contribute(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'org.dxos.test.generator.main',
        filter: Surface.makeFilter(PlaygroundRoles.Primary),
        component: Main,
      }),
    ),
  ),
);
