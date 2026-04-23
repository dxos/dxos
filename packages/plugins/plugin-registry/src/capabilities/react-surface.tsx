//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CommunityRegistry, LOAD_PLUGIN_DIALOG, LoadPluginDialog, PluginArticle, PluginRegistry } from '#containers';
import { registryCategoryId } from '#meta';

import { useAutoTags, useCommunityPlugins, useRemotePluginIds } from '../hooks';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'official',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('official')),
        component: () => {
          const manager = usePluginManager();
          const remoteIds = useRemotePluginIds();
          const { entries } = useCommunityPlugins();
          const extraTagsById = useAutoTags(entries);
          const filtered = useMemo(
            () =>
              manager
                .getPlugins()
                .filter(({ meta }) => !manager.getCore().includes(meta.id))
                .filter(({ meta }) => !remoteIds.has(meta.id)),
            [manager, remoteIds],
          );

          return <PluginRegistry id={registryCategoryId('official')} plugins={filtered} extraTagsById={extraTagsById} />;
        },
      }),
      Surface.create({
        id: 'installed',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('installed')),
        component: () => {
          const manager = usePluginManager();
          const { entries } = useCommunityPlugins();
          const extraTagsById = useAutoTags(entries);
          const filtered = useMemo(
            () =>
              manager
                .getPlugins()
                .filter(({ meta }) => !manager.getCore().includes(meta.id))
                .filter(({ meta }) => manager.getEnabled().includes(meta.id)),
            [manager],
          );

          return (
            <PluginRegistry id={registryCategoryId('installed')} plugins={filtered} extraTagsById={extraTagsById} />
          );
        },
      }),
      Surface.create({
        id: 'recommended',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('recommended')),
        component: () => {
          const manager = usePluginManager();
          const remoteIds = useRemotePluginIds();
          const { entries } = useCommunityPlugins();
          const extraTagsById = useAutoTags(entries);
          const filtered = useMemo(
            () =>
              manager
                .getPlugins()
                .filter(({ meta }) => !manager.getCore().includes(meta.id))
                .filter(({ meta }) => !remoteIds.has(meta.id))
                .filter(({ meta }) => !meta.tags?.includes('labs')),
            [manager, remoteIds],
          );

          return (
            <PluginRegistry id={registryCategoryId('recommended')} plugins={filtered} extraTagsById={extraTagsById} />
          );
        },
      }),
      Surface.create({
        id: 'labs',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('labs')),
        component: () => {
          const manager = usePluginManager();
          const { entries } = useCommunityPlugins();
          const extraTagsById = useAutoTags(entries);
          const filtered = useMemo(
            () => manager.getPlugins().filter(({ meta }) => meta.tags?.includes('labs')),
            [manager],
          );

          return <PluginRegistry id={registryCategoryId('labs')} plugins={filtered} extraTagsById={extraTagsById} />;
        },
      }),
      Surface.create({
        id: 'community',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('community')),
        component: () => <CommunityRegistry id={registryCategoryId('community')} />,
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
