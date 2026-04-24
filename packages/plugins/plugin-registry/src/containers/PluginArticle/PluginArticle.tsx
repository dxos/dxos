//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { usePluginManager } from '@dxos/app-framework/ui';
import { runAndForwardErrors } from '@dxos/effect';

import { PluginDetail } from '#components';

import { useCommunityPlugins } from '../../hooks';

// TODO(burdon): Convert to ECHO type.
export type PluginArticleProps = { subject: Plugin.Plugin };

export const PluginArticle = ({ subject: plugin }: PluginArticleProps) => {
  const manager = usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  const { entries } = useCommunityPlugins();
  const [installing, setInstalling] = useState(false);

  const enabled = manager.getEnabled().includes(plugin.meta.id);
  const isInstalled = useMemo(
    () => plugins.some((candidate) => candidate.meta.id === plugin.meta.id),
    [plugins, plugin.meta.id],
  );
  const isCore = manager.getCore().includes(plugin.meta.id);
  const canUninstall = isInstalled && !isCore;

  const moduleUrl = useMemo(
    () => entries.find((entry) => entry.meta.id === plugin.meta.id)?.moduleUrl,
    [entries, plugin.meta.id],
  );

  const handleEnableChange = useCallback(
    (enabled: boolean) =>
      enabled
        ? runAndForwardErrors(manager.enable(plugin.meta.id))
        : runAndForwardErrors(manager.disable(plugin.meta.id)),
    [manager, plugin.meta.id],
  );

  const handleUninstall = useCallback(() => {
    manager.remove(plugin.meta.id);
  }, [manager, plugin.meta.id]);

  const handleInstall = useCallback(() => {
    if (!moduleUrl) {
      return;
    }
    setInstalling(true);
    Effect.gen(function* () {
      const added = yield* manager.add(moduleUrl);
      yield* manager.enable(added.meta.id);
    }).pipe(
      Effect.ensuring(Effect.sync(() => setInstalling(false))),
      runAndForwardErrors,
    );
  }, [manager, moduleUrl]);

  return (
    <PluginDetail
      plugin={plugin}
      enabled={enabled}
      onEnabledChange={handleEnableChange}
      onInstall={!isInstalled && moduleUrl ? handleInstall : undefined}
      installing={installing}
      onUninstall={canUninstall ? handleUninstall : undefined}
    />
  );
};
