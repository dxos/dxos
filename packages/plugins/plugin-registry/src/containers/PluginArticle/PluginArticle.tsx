//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { usePluginManager } from '@dxos/app-framework/ui';
import { runAndForwardErrors } from '@dxos/effect';

import { PluginDetail } from '../../components';

// TODO(burdon): Convert to ECHO type.
export type PluginArticleProps = { subject: Plugin.Plugin };

export const PluginArticle = ({ subject: plugin }: PluginArticleProps) => {
  const manager = usePluginManager();
  const enabled = manager.getEnabled().includes(plugin.meta.id);
  const handleEnableChange = useCallback(
    (enabled: boolean) =>
      enabled
        ? runAndForwardErrors(manager.enable(plugin.meta.id))
        : runAndForwardErrors(manager.disable(plugin.meta.id)),
    [manager, plugin.meta.id],
  );

  return <PluginDetail plugin={plugin} enabled={enabled} onEnabledChange={handleEnableChange} />;
};
