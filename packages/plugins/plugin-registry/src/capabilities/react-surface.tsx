//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ComponentProps, useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { DXN } from '@dxos/keys';

import { DisableDependentsAlert } from '#components';
import {
  LOAD_PLUGIN_DIALOG,
  LoadPluginDialog,
  PluginArticle,
  PublicRegistryArticle,
  RegistryArticle,
  RegistrySettingsContainer,
} from '#containers';
import { DISABLE_DEPENDENTS_DIALOG, meta, registryCategoryId } from '#meta';

import { useAutoTags, useRegistryPlugins, useRemotePluginIds } from '../hooks';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.registry.surface.bundled'),
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('bundled')),
        component: () => {
          const manager = usePluginManager();
          const remoteIds = useRemotePluginIds();
          const core = useMemo(() => manager.getCore(), [manager]);
          const predicate = useMemo<PluginPredicate>(
            () =>
              ({ meta }) =>
                !core.includes(meta.id) && !remoteIds.has(meta.id),
            [core, remoteIds],
          );

          return <FilteredRegistryArticle id={registryCategoryId('bundled')} filter={predicate} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.registry.surface.installed'),
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('installed')),
        component: () => {
          const manager = usePluginManager();
          const core = useMemo(() => manager.getCore(), [manager]);
          const enabled = useMemo(() => manager.getEnabled(), [manager]);
          const predicate = useMemo<PluginPredicate>(
            () =>
              ({ meta }) =>
                !core.includes(meta.id) && enabled.includes(meta.id),
            [core, enabled],
          );

          return <FilteredRegistryArticle id={registryCategoryId('installed')} filter={predicate} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.registry.surface.recommended'),
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('recommended')),
        component: () => {
          const manager = usePluginManager();
          const remoteIds = useRemotePluginIds();
          const core = useMemo(() => manager.getCore(), [manager]);
          const predicate = useMemo<PluginPredicate>(
            () =>
              ({ meta }) =>
                !core.includes(meta.id) && !remoteIds.has(meta.id) && !meta.tags?.includes('labs'),
            [core, remoteIds],
          );

          return <FilteredRegistryArticle id={registryCategoryId('recommended')} filter={predicate} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.registry.surface.labs'),
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('labs')),
        component: () => {
          const predicate = useMemo<PluginPredicate>(
            () =>
              ({ meta }) =>
                meta.tags?.includes('labs') ?? false,
            [],
          );

          return <FilteredRegistryArticle id={registryCategoryId('labs')} filter={predicate} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.registry.surface.registry'),
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('registry')),
        component: () => <PublicRegistryArticle id={registryCategoryId('registry')} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.registry.surface.pluginDetails'),
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
        id: DISABLE_DEPENDENTS_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof DisableDependentsAlert>>(
          AppSurface.Dialog,
          DISABLE_DEPENDENTS_DIALOG,
        ),
        component: ({ data }) => <DisableDependentsAlert {...data.props} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.registry.surface.pluginSettings'),
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => <RegistrySettingsContainer subject={subject} />,
      }),
    ]),
  ),
);

type PluginPredicate = (plugin: Plugin.Plugin) => boolean;

/**
 * Renders the {@link RegistryArticle} surface filtered by an arbitrary
 * predicate computed against the live plugin list. Centralises the
 * `usePluginManager` + `useRegistryPlugins` + `useAutoTags` wiring shared
 * by every category surface.
 */
const FilteredRegistryArticle = ({ id, filter }: { id: string; filter: PluginPredicate }) => {
  const manager = usePluginManager();
  const { entries } = useRegistryPlugins();
  const extraTagsById = useAutoTags(entries);
  const filtered = useMemo(() => manager.getPlugins().filter(filter), [manager, filter]);

  return <RegistryArticle id={id} plugins={filtered} extraTagsById={extraTagsById} />;
};
