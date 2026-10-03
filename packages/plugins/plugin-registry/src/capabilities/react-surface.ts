//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ComponentProps } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { DisableDependentsAlert } from '#components';
import { LoadPluginDialog, PluginArticle, PublicRegistryArticle, RegistrySettingsContainer } from '#containers';
import { meta } from '#meta';
import { LOAD_PLUGIN_DIALOG, type RegistryPluginOptions } from '#types';

import { DISABLE_DEPENDENTS_DIALOG } from '../constants.ts';
import { RegistryCategoryArticle } from './RegistryCategoryArticle.tsx';

export default Capability.makeModule(({ externalPlugins = true }: RegistryPluginOptions = {}) => {
  const externalPluginSurfaces = externalPlugins
    ? [
        Surface.create({
          id: 'registry',
          filter: AppSurface.literal(AppSurface.Article, 'registry'),
          component: PublicRegistryArticle,
          props: () => ({ id: 'registry' }),
        }),
        Surface.create({
          id: LOAD_PLUGIN_DIALOG,
          filter: AppSurface.component(AppSurface.Dialog, LOAD_PLUGIN_DIALOG),
          component: LoadPluginDialog,
        }),
        Surface.create({
          id: 'pluginSettings',
          filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
          component: RegistrySettingsContainer,
          props: ({ data: { subject } }) => ({ subject }),
        }),
      ]
    : [];

  return Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'bundled',
        filter: AppSurface.literal(AppSurface.Article, 'bundled'),
        component: RegistryCategoryArticle,
        props: () => ({ category: 'bundled' }),
      }),
      Surface.create({
        id: 'installed',
        filter: AppSurface.literal(AppSurface.Article, 'installed'),
        component: RegistryCategoryArticle,
        props: () => ({ category: 'installed' }),
      }),
      Surface.create({
        id: 'recommended',
        filter: AppSurface.literal(AppSurface.Article, 'recommended'),
        component: RegistryCategoryArticle,
        props: () => ({ category: 'recommended' }),
      }),
      Surface.create({
        id: 'labs',
        filter: AppSurface.literal(AppSurface.Article, 'labs'),
        component: RegistryCategoryArticle,
        props: () => ({ category: 'labs' }),
      }),
      Surface.create({
        id: 'pluginDetails',
        filter: AppSurface.subject(AppSurface.Article, Plugin.isPlugin),
        component: PluginArticle,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: DISABLE_DEPENDENTS_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof DisableDependentsAlert>>(
          AppSurface.Dialog,
          DISABLE_DEPENDENTS_DIALOG,
        ),
        component: DisableDependentsAlert,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      ...externalPluginSurfaces,
    ]),
  );
});
