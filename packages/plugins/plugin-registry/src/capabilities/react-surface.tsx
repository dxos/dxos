//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Capabilities, contributes, createSurface, Plugin, usePluginManager } from '@dxos/app-framework';
import { useTranslation } from '@dxos/react-ui';

import { PluginDetails, RegistryContainer } from '../components';
import { REGISTRY_KEY, REGISTRY_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${REGISTRY_PLUGIN}/installed`,
      role: 'article',
      filter: (data): data is any => data.subject === `${REGISTRY_KEY}:installed`,
      component: () => {
        const manager = usePluginManager();
        const installed = useMemo(
          () =>
            manager.plugins
              .filter(({ meta }) => !manager.core.includes(meta.id))
              .filter(({ meta }) => manager.enabled.includes(meta.id)),
          [],
        );

        return <RegistryContainer id={`${REGISTRY_KEY}:installed`} plugins={installed} />;
      },
    }),
    createSurface({
      id: `${REGISTRY_PLUGIN}/recommended`,
      role: 'article',
      filter: (data): data is any => data.subject === `${REGISTRY_KEY}:recommended`,
      component: () => {
        const manager = usePluginManager();
        const recommended = useMemo(
          () =>
            manager.plugins
              .filter(({ meta }) => !manager.core.includes(meta.id))
              .filter(({ meta }) => !meta.tags?.includes('experimental')),
          [],
        );

        return <RegistryContainer id={`${REGISTRY_KEY}:recommended`} plugins={recommended} />;
      },
    }),
    createSurface({
      id: `${REGISTRY_PLUGIN}/experimental`,
      role: 'article',
      filter: (data): data is any => data.subject === `${REGISTRY_KEY}:experimental`,
      component: () => {
        const manager = usePluginManager();
        const experimental = useMemo(
          () => manager.plugins.filter(({ meta }) => meta.tags?.includes('experimental')),
          [],
        );

        return <RegistryContainer id={`${REGISTRY_KEY}:experimental`} plugins={experimental} />;
      },
    }),
    createSurface({
      id: `${REGISTRY_PLUGIN}/community`,
      role: 'article',
      filter: (data): data is any => data.subject === `${REGISTRY_KEY}:community`,
      component: () => {
        const { t } = useTranslation(REGISTRY_PLUGIN);
        return (
          <div className='h-full w-full flex items-center justify-center'>
            {t('coming soon label', { ns: REGISTRY_PLUGIN })}
          </div>
        );
      },
    }),
    createSurface({
      id: `${REGISTRY_PLUGIN}/plugin-details`,
      role: 'article',
      filter: (data): data is { subject: Plugin } => data.subject instanceof Plugin,
      component: ({ data: { subject } }) => {
        const manager = usePluginManager();
        const enabled = manager.enabled.includes(subject.meta.id);
        const handleEnable = useCallback(
          () => (enabled ? manager.disable(subject.meta.id) : manager.enable(subject.meta.id)),
          [manager, subject.meta.id, enabled],
        );
        return <PluginDetails plugin={subject} enabled={enabled} onEnable={handleEnable} />;
      },
    }),
  ]);
