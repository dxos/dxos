//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Plugin } from '@dxos/app-framework';
import { List } from '@dxos/react-ui';

import { PluginItem, type PluginItemProps } from './PluginItem';

export type PluginListProps = Omit<PluginItemProps, 'plugin'> & {
  plugins?: readonly Plugin.Plugin[];
};

export const PluginList = ({ plugins = [], ...props }: PluginListProps) => {
  return (
    <List classNames='grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] auto-rows-[max-content] gap-4 p-4'>
      {plugins.map((plugin) => (
        <PluginItem key={plugin.meta.id} plugin={plugin} {...props} />
      ))}
    </List>
  );
};
