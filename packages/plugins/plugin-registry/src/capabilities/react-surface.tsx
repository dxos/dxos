//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Capabilities, Plugin, contributes, createSurface, usePluginManager } from '@dxos/app-framework';

import { PluginDetail, RegistryContainer } from '../components';
import { REGISTRY_KEY, meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/all`,
      role: 'article',
      filter: (data): data is any => data.subject === `${REGISTRY_KEY}+all`,
      component: () => {
        const manager = usePluginManager();
        const filtered = useMemo(() => manager.plugins.filter(({ meta }) => !manager.core.includes(meta.id)), []);

        return <RegistryContainer id={`${REGISTRY_KEY}+all`} plugins={filtered} />;
      },
    }),
    createSurface({
      id: `${meta.id}/installed`,
      role: 'article',
      filter: (data): data is any => data.subject === `${REGISTRY_KEY}+installed`,
      component: () => {
        const manager = usePluginManager();
        const filtered = useMemo(
          () =>
            manager.plugins
              .filter(({ meta }) => !manager.core.includes(meta.id))
              .filter(({ meta }) => manager.enabled.includes(meta.id)),
          [],
        );

        return <RegistryContainer id={`${REGISTRY_KEY}+installed`} plugins={filtered} />;
      },
    }),
    createSurface({
      id: `${meta.id}/recommended`,
      role: 'article',
      filter: (data): data is any => data.subject === `${REGISTRY_KEY}+recommended`,
      component: () => {
        const manager = usePluginManager();
        const filtered = useMemo(
          () =>
            manager.plugins
              .filter(({ meta }) => !manager.core.includes(meta.id))
              .filter(({ meta }) => !meta.tags?.includes('labs')),
          [],
        );

        return <RegistryContainer id={`${REGISTRY_KEY}+recommended`} plugins={filtered} />;
      },
    }),
    createSurface({
      id: `${meta.id}/labs`,
      role: 'article',
      filter: (data): data is any => data.subject === `${REGISTRY_KEY}+labs`,
      component: () => {
        const manager = usePluginManager();
        const filtered = useMemo(() => manager.plugins.filter(({ meta }) => meta.tags?.includes('labs')), []);

        return <RegistryContainer id={`${REGISTRY_KEY}+labs`} plugins={filtered} />;
      },
    }),
    createSurface({
      id: `${meta.id}/plugin-details`,
      role: 'article',
      filter: (data): data is { subject: Plugin } => data.subject instanceof Plugin,
      component: ({ data: { subject } }) => {
        const manager = usePluginManager();
        const enabled = manager.enabled.includes(subject.meta.id);
        const handleEnable = useCallback(
          () => (enabled ? manager.disable(subject.meta.id) : manager.enable(subject.meta.id)),
          [manager, subject.meta.id, enabled],
        );

        return <PluginDetail plugin={subject} enabled={enabled} onEnable={handleEnable} />;
      },
    }),
  ]);
