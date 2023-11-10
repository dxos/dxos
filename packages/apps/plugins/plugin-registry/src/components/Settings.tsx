//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { usePlugins } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { PluginList } from './PluginList';
import { REGISTRY_PLUGIN } from '../meta';

export const Settings = () => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const { available, plugins, enabled, enablePlugin, disablePlugin } = usePlugins();

  return (
    <Input.Root>
      <Input.Label>{t('plugin registry label')}</Input.Label>
      <PluginList
        plugins={available}
        loaded={plugins.map(({ meta }) => meta.id)}
        enabled={enabled}
        className={'max-w-[300px] h-[300px] overflow-y-auto'}
        onChange={(id, enabled) => (enabled ? enablePlugin(id) : disablePlugin(id))}
      />
      {/* TODO(burdon): ScrollArea clashes with Tabster and disables checkboxes. */}
      {/* <ScrollArea.Root classNames={'max-h-[300px], h-[300px]'}> */}
      {/*  <ScrollArea.Viewport> */}
      {/*    <PluginList */}
      {/*      plugins={available} */}
      {/*      loaded={plugins.map(({ meta }) => meta.id)} */}
      {/*      enabled={enabled} */}
      {/*      onChange={(id, enabled) => (enabled ? enablePlugin(id) : disablePlugin(id))} */}
      {/*    /> */}
      {/*  </ScrollArea.Viewport> */}
      {/*  <ScrollArea.Scrollbar orientation='vertical'> */}
      {/*    <ScrollArea.Thumb /> */}
      {/*  </ScrollArea.Scrollbar> */}
      {/* </ScrollArea.Root> */}
    </Input.Root>
  );
};
