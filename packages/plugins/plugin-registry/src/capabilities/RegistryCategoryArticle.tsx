//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import * as Hooks from '@dxos/app-toolkit/Hooks';

import { RegistryArticle } from '#containers';

import { type PluginPredicate, getCategoryPredicate } from '../categories.ts';
import { useAutoTags, useRegistryPlugins, useRemotePluginIds } from '../hooks/index.ts';

/**
 * Resolves the {@link PluginPredicate} for a registry category against the live plugin list.
 * Shared with the graph builder via {@link getCategoryPredicate} so the category lists and their counts agree.
 */
const useCategoryPredicate = (category: string): PluginPredicate => {
  const manager = PluginManagerProvider.usePluginManager();
  const remoteIds = useRemotePluginIds();
  const core = useMemo(() => manager.getCore(), [manager]);
  const enabled = useMemo(() => manager.getEnabled(), [manager]);
  return useMemo(
    () => getCategoryPredicate(category, { core, enabled, remoteIds }),
    [category, core, enabled, remoteIds],
  );
};

export type RegistryCategoryArticleProps = {
  category: string;
};

/**
 * Renders the {@link RegistryArticle} surface for one registry category. Centralises the
 * `usePluginManager` + `useRegistryPlugins` + `useAutoTags` wiring shared by every category surface,
 * none of which can live in a surface's `props` mapper.
 */
export const RegistryCategoryArticle = ({ category }: RegistryCategoryArticleProps) => {
  const manager = PluginManagerProvider.usePluginManager();
  const filter = useCategoryPredicate(category);
  const { entries } = useRegistryPlugins();
  const extraTagsById = useAutoTags(entries);
  const deviceOnlyIds = Hooks.useSettingsDivergedKeys(AppSettings.PLUGINS_NAMESPACE);
  const filtered = useMemo(() => manager.getPlugins().filter(filter), [manager, filter]);

  return (
    <RegistryArticle id={category} plugins={filtered} extraTagsById={extraTagsById} deviceOnlyIds={deviceOnlyIds} />
  );
};
