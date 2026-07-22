//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ComponentProps, useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

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

import { type PluginPredicate, getCategoryPredicate } from '../categories';
import { useAutoTags, useRegistryPlugins, useRemotePluginIds } from '../hooks';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'bundled',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('bundled')),
        component: () => {
          const predicate = useCategoryPredicate(registryCategoryId('bundled'));
          return <FilteredRegistryArticle id={registryCategoryId('bundled')} filter={predicate} />;
        },
      }),
      Surface.create({
        id: 'installed',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('installed')),
        component: () => {
          const predicate = useCategoryPredicate(registryCategoryId('installed'));
          return <FilteredRegistryArticle id={registryCategoryId('installed')} filter={predicate} />;
        },
      }),
      Surface.create({
        id: 'recommended',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('recommended')),
        component: () => {
          const predicate = useCategoryPredicate(registryCategoryId('recommended'));
          return <FilteredRegistryArticle id={registryCategoryId('recommended')} filter={predicate} />;
        },
      }),
      Surface.create({
        id: 'labs',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('labs')),
        component: () => {
          const predicate = useCategoryPredicate(registryCategoryId('labs'));
          return <FilteredRegistryArticle id={registryCategoryId('labs')} filter={predicate} />;
        },
      }),
      Surface.create({
        id: 'registry',
        filter: AppSurface.literal(AppSurface.Article, registryCategoryId('registry')),
        component: () => <PublicRegistryArticle id={registryCategoryId('registry')} />,
      }),
      Surface.create({
        id: 'pluginDetails',
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
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ({ data: { subject } }) => <RegistrySettingsContainer subject={subject} />,
      }),
    ]),
  ),
);

/**
 * Resolves the {@link PluginPredicate} for a registry category against the live plugin list.
 * Shared with the graph builder via {@link getCategoryPredicate} so the category lists and their counts agree.
 */
const useCategoryPredicate = (category: string): PluginPredicate => {
  const manager = usePluginManager();
  const remoteIds = useRemotePluginIds();
  const core = useMemo(() => manager.getCore(), [manager]);
  const enabled = useMemo(() => manager.getEnabled(), [manager]);
  return useMemo(
    () => getCategoryPredicate(category, { core, enabled, remoteIds }),
    [category, core, enabled, remoteIds],
  );
};

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
