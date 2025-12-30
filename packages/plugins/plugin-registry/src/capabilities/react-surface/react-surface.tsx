//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo } from 'react';

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { usePluginManager } from '@dxos/app-framework/react';

import { PluginDetail, RegistryContainer } from '../../components';
import { REGISTRY_KEY, meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
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
      Common.createSurface({
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
      Common.createSurface({
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
      Common.createSurface({
        id: `${meta.id}/labs`,
        role: 'article',
        filter: (data): data is any => data.subject === `${REGISTRY_KEY}+labs`,
        component: () => {
          const manager = usePluginManager();
          const filtered = useMemo(() => manager.getPlugins().filter(({ meta }) => meta.tags?.includes('labs')), []);

          return <RegistryContainer id={`${REGISTRY_KEY}+labs`} plugins={filtered} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/plugin-details`,
        role: 'article',
        filter: (data): data is { subject: Plugin.Plugin } => Plugin.isPlugin(data.subject),
        component: ({ data: { subject } }) => {
          const manager = usePluginManager();
          const enabled = manager.getEnabled().includes(subject.meta.id);
          const handleEnable = useCallback(
            () =>
              enabled
                ? Effect.runPromise(manager.disable(subject.meta.id))
                : Effect.runPromise(manager.enable(subject.meta.id)),
            [manager, subject.meta.id, enabled],
          );

          return <PluginDetail plugin={subject} enabled={enabled} onEnable={handleEnable} />;
        },
      }),
    ]),
  ),
);
