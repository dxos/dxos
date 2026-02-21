//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { runAndForwardErrors } from '@dxos/effect';

import { PluginDetail, RegistryContainer } from '../../components';
import { REGISTRY_KEY, meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/all`,
        role: 'article',
        filter: (data): data is any => data.subject === `${REGISTRY_KEY}+all`,
        component: () => {
          const manager = usePluginManager();
          const filtered = useMemo(
            () => manager.getPlugins().filter(({ meta }) => !manager.getCore().includes(meta.id)),
            [],
          );

          return <RegistryContainer id={`${REGISTRY_KEY}+all`} plugins={filtered} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/installed`,
        role: 'article',
        filter: (data): data is any => data.subject === `${REGISTRY_KEY}+installed`,
        component: () => {
          const manager = usePluginManager();
          const filtered = useMemo(
            () =>
              manager
                .getPlugins()
                .filter(({ meta }) => !manager.getCore().includes(meta.id))
                .filter(({ meta }) => manager.getEnabled().includes(meta.id)),
            [],
          );

          return <RegistryContainer id={`${REGISTRY_KEY}+installed`} plugins={filtered} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/recommended`,
        role: 'article',
        filter: (data): data is any => data.subject === `${REGISTRY_KEY}+recommended`,
        component: () => {
          const manager = usePluginManager();
          const filtered = useMemo(
            () =>
              manager
                .getPlugins()
                .filter(({ meta }) => !manager.getCore().includes(meta.id))
                .filter(({ meta }) => !meta.tags?.includes('labs')),
            [],
          );

          return <RegistryContainer id={`${REGISTRY_KEY}+recommended`} plugins={filtered} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/labs`,
        role: 'article',
        filter: (data): data is any => data.subject === `${REGISTRY_KEY}+labs`,
        component: () => {
          const manager = usePluginManager();
          const filtered = useMemo(() => manager.getPlugins().filter(({ meta }) => meta.tags?.includes('labs')), []);

          return <RegistryContainer id={`${REGISTRY_KEY}+labs`} plugins={filtered} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/plugin-details`,
        role: 'article',
        filter: (data): data is { subject: Plugin.Plugin } => Plugin.isPlugin(data.subject),
        component: ({ data: { subject } }) => {
          const manager = usePluginManager();
          const enabled = manager.getEnabled().includes(subject.meta.id);
          const handleEnableChange = useCallback(
            (enabled: boolean) =>
              enabled
                ? runAndForwardErrors(manager.enable(subject.meta.id))
                : runAndForwardErrors(manager.disable(subject.meta.id)),
            [manager, subject.meta.id],
          );

          return <PluginDetail plugin={subject} enabled={enabled} onEnabledChange={handleEnableChange} />;
        },
      }),
    ]),
  ),
);
