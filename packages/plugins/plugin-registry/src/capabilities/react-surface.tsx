//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Surface, useSettingsState, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { runAndForwardErrors } from '@dxos/effect';

import { RegistrySettings } from '#components';
import {
  LOAD_PLUGIN_DIALOG,
  LoadPluginDialog,
  PluginArticle,
  PluginRegistryArticle,
  PluginsArticle,
} from '#containers';
import { meta, registryCategoryId } from '#meta';

import { useAutoTags, useRegistryPlugins, useRemotePluginIds } from '../hooks';
import { type RegistrySettings as RegistrySettingsType } from '../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'official',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('official')),
        component: () => {
          const manager = usePluginManager();
          const remoteIds = useRemotePluginIds();
          const { entries } = useRegistryPlugins();
          const extraTagsById = useAutoTags(entries);
          const filtered = useMemo(
            () =>
              manager
                .getPlugins()
                .filter(({ meta }) => !manager.getCore().includes(meta.id))
                .filter(({ meta }) => !remoteIds.has(meta.id)),
            [manager, remoteIds],
          );

          return (
            <PluginsArticle id={registryCategoryId('official')} plugins={filtered} extraTagsById={extraTagsById} />
          );
        },
      }),
      Surface.create({
        id: 'installed',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('installed')),
        component: () => {
          const manager = usePluginManager();
          const { entries } = useRegistryPlugins();
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
            <PluginsArticle id={registryCategoryId('installed')} plugins={filtered} extraTagsById={extraTagsById} />
          );
        },
      }),
      Surface.create({
        id: 'recommended',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('recommended')),
        component: () => {
          const manager = usePluginManager();
          const remoteIds = useRemotePluginIds();
          const { entries } = useRegistryPlugins();
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
            <PluginsArticle id={registryCategoryId('recommended')} plugins={filtered} extraTagsById={extraTagsById} />
          );
        },
      }),
      Surface.create({
        id: 'labs',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('labs')),
        component: () => {
          const manager = usePluginManager();
          const { entries } = useRegistryPlugins();
          const extraTagsById = useAutoTags(entries);
          const filtered = useMemo(
            () => manager.getPlugins().filter(({ meta }) => meta.tags?.includes('labs')),
            [manager],
          );

          return <PluginsArticle id={registryCategoryId('labs')} plugins={filtered} extraTagsById={extraTagsById} />;
        },
      }),
      Surface.create({
        id: 'registry',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('registry')),
        component: () => <PluginRegistryArticle id={registryCategoryId('registry')} />,
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
      Surface.create({
        id: 'plugin-settings',
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const manager = usePluginManager();
          const { settings, updateSettings } = useSettingsState<RegistrySettingsType>(subject.atom);
          const activeDevPluginIds = useAtomValue(manager.devPluginIds);

          const onEnableDev = useCallback(
            async (url: string) => {
              await runAndForwardErrors(
                Effect.gen(function* () {
                  const plugin = yield* manager.add(url);
                  yield* manager.enable(plugin.meta.id);
                }),
              );
            },
            [manager],
          );

          const onDisableDev = useCallback(
            async (id: string) => {
              await runAndForwardErrors(manager.remove(id));
            },
            [manager],
          );

          return (
            <RegistrySettings
              settings={settings}
              onSettingsChange={updateSettings}
              activeDevPluginIds={activeDevPluginIds}
              onEnableDev={onEnableDev}
              onDisableDev={onDisableDev}
            />
          );
        },
      }),
    ]),
  ),
);
