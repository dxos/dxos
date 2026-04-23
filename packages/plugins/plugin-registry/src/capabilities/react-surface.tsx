//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { LOAD_PLUGIN_DIALOG, LoadPluginDialog, PluginArticle, PluginRegistry } from '#containers';
import { registryCategoryId } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'all',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('all')),
        component: () => {
          const manager = usePluginManager();
          const filtered = useMemo(
            () => manager.getPlugins().filter(({ meta }) => !manager.getCore().includes(meta.id)),
            [],
          );

          return <PluginRegistry id={registryCategoryId('all')} plugins={filtered} />;
        },
      }),
      Surface.create({
        id: 'installed',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('installed')),
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

          return <PluginRegistry id={registryCategoryId('installed')} plugins={filtered} />;
        },
      }),
      Surface.create({
        id: 'recommended',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('recommended')),
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

          return <PluginRegistry id={registryCategoryId('recommended')} plugins={filtered} />;
        },
      }),
      Surface.create({
        id: 'labs',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('labs')),
        component: () => {
          const manager = usePluginManager();
          const filtered = useMemo(() => manager.getPlugins().filter(({ meta }) => meta.tags?.includes('labs')), []);

          return <PluginRegistry id={registryCategoryId('labs')} plugins={filtered} />;
        },
      }),
      Surface.create({
        id: 'plugin-details',
        filter: AppSurface.subject(AppSurface.Article, Plugin.isPlugin),
        component: ({ data: { subject } }) => {
          return <PluginArticle subject={subject} />;
        },
      }),
      Surface.create({
        id: LOAD_PLUGIN_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, LOAD_PLUGIN_DIALOG),
        component: () => <LoadPluginDialog />,
      }),
    ]),
  ),
);
