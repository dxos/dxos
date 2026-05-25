//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { type Plugin, type PluginManager } from '@dxos/app-framework';
import { usePluginManager } from '@dxos/app-framework/ui';
import { composable } from '@dxos/react-ui';

import { BaseRegistryArticle } from '../BaseRegistryArticle';

const sortByPluginMeta = (a: Plugin.Plugin, b: Plugin.Plugin) =>
  (a.meta.name ?? a.meta.id).localeCompare(b.meta.name ?? b.meta.id);

export type RegistryArticleProps = {
  id: string;
  plugins: Plugin.Plugin[];
  /**
   * Map from plugin id → display-only tags (e.g. `registry`, `local`) computed by the caller.
   */
  extraTagsById?: Record<string, readonly string[]>;
};

export const RegistryArticle = composable<HTMLDivElement, RegistryArticleProps>(
  ({ id, plugins: pluginsProp, extraTagsById, ...props }, forwardedRef) => {
    const manager = usePluginManager();
    const failed = useAtomValue(manager.failed);
    const plugins = useMemo(() => [...pluginsProp].sort(sortByPluginMeta), [pluginsProp]);
    const failuresById = useMemo(
      () =>
        failed.reduce<Record<string, PluginManager.PluginFailure>>((acc, failure) => {
          acc[failure.id] = failure;
          return acc;
        }, {}),
      [failed],
    );

    return (
      <BaseRegistryArticle
        {...props}
        id={id}
        plugins={plugins}
        extraTagsById={extraTagsById}
        failuresById={failuresById}
        ref={forwardedRef}
      />
    );
  },
);

RegistryArticle.displayName = 'RegistryArticle';
