//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Plugin } from '@dxos/app-framework';
import { List } from '@dxos/react-ui';

import { PluginItem, type PluginItemProps } from './PluginItem';

export type PluginListProps = Omit<PluginItemProps, 'plugin'> & {
  plugins?: readonly Plugin[];
};

export const PluginList = ({ plugins = [], ...props }: PluginListProps) => {
  return (
    <List classNames='grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] auto-rows-[12rem] gap-4 p-4'>
      {plugins.map((plugin) => (
        <div key={plugin.meta.id} className='flex'>
          <PluginItem plugin={plugin} {...props} />
        </div>
      ))}
    </List>
  );
};
