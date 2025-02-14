//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { createIntent, LayoutAction, type Plugin, useIntentDispatcher, usePluginManager } from '@dxos/app-framework';
import { ObservabilityAction } from '@dxos/plugin-observability/types';

import { PluginList } from './PluginList';

const sortByPluginMeta = ({ meta: { name: a = '' } }: Plugin, { meta: { name: b = '' } }: Plugin) => a.localeCompare(b);

export const RegistryContainer = ({ id, plugins: _plugins }: { id: string; plugins: Plugin[] }) => {
  const manager = usePluginManager();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const plugins = useMemo(() => _plugins.sort(sortByPluginMeta), [_plugins]);

  // TODO(wittjosiah): Factor out to an intent?
  const handleChange = async (id: string, enabled: boolean) => {
    if (enabled) {
      await manager.enable(id);
    } else {
      await manager.disable(id);
    }

    await dispatch(
      createIntent(ObservabilityAction.SendEvent, {
        name: 'plugins.toggle',
        properties: { plugin: id, enabled },
      }),
    );
  };

  const handleClick = (pluginId: string) =>
    dispatch(
      createIntent(LayoutAction.Open, {
        part: 'main',
        // TODO(wittjosiah): `/` currently is not supported in ids.
        subject: [pluginId.replaceAll('/', ':')],
        options: { pivotId: id, positioning: 'end' },
      }),
    );

  return (
    <div className='overflow-y-auto'>
      <PluginList plugins={plugins} enabled={manager.enabled} onClick={handleClick} onChange={handleChange} />
    </div>
  );
};
