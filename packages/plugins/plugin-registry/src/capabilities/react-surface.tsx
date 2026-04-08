//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit';

import { LOAD_PLUGIN_DIALOG, LoadPluginDialog, PluginArticle, PluginRegistry } from '#containers';
import { registryCategoryId, meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.all`,
        role: 'article',
        filter: AppSurface.literal(registryCategoryId('all')),
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
        id: `${meta.id}.installed`,
        role: 'article',
        filter: AppSurface.literal(registryCategoryId('installed')),
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
        id: `${meta.id}.recommended`,
        role: 'article',
        filter: AppSurface.literal(registryCategoryId('recommended')),
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
        id: `${meta.id}.labs`,
        role: 'article',
        filter: AppSurface.literal(registryCategoryId('labs')),
        component: () => {
          const manager = usePluginManager();
          const filtered = useMemo(() => manager.getPlugins().filter(({ meta }) => meta.tags?.includes('labs')), []);

          return <PluginRegistry id={registryCategoryId('labs')} plugins={filtered} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.plugin-details`,
        role: 'article',
        filter: AppSurface.plugin(),
        component: ({ data: { subject } }) => {
          return <PluginArticle subject={subject} />;
        },
      }),
      Surface.create({
        id: LOAD_PLUGIN_DIALOG,
        role: 'dialog',
        filter: AppSurface.component(LOAD_PLUGIN_DIALOG),
        component: () => <LoadPluginDialog />,
      }),
    ]),
  ),
);
