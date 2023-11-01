//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React from 'react';

import { DensityProvider, Input, List, ListItem } from '@dxos/react-ui';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

import { type PluginDef } from './types';

// TODO(burdon): Factor out.
const styles = {
  hover: 'hover:bg-neutral-75 dark:hover:bg-neutral-850',
};

export type PluginListProps = {
  plugins?: PluginDef[];
  onChange?: (id: string, enabled: boolean) => void;
};

export const PluginList = ({ plugins = [], onChange }: PluginListProps) => {
  return (
    <div className={mx('flex flex-col w-full overflow-x-hidden overflow-y-scroll', inputSurface)}>
      <DensityProvider density={'fine'}>
        <List classNames='divide-y'>
          {plugins.map(({ id, name, description, enabled, Icon = Circle }) => (
            <ListItem.Root
              key={id}
              classNames={mx('flex is-full cursor-pointer p-1', styles.hover)}
              onClick={() => onChange?.(id, !enabled)}
            >
              <ListItem.Endcap classNames={'items-center mr-4'}>
                <Icon className={getSize(6)} />
              </ListItem.Endcap>
              <div className='flex flex-col grow'>
                <ListItem.Heading classNames='flex grow truncate items-center'>{name ?? id}</ListItem.Heading>
                {description && <div className='text-sm pb-1 font-thin'>{description}</div>}
              </div>
              <ListItem.Endcap classNames='items-center'>
                <Input.Root>
                  <Input.Checkbox checked={!!enabled} onCheckedChange={() => onChange?.(id, !enabled)} />
                </Input.Root>
              </ListItem.Endcap>
            </ListItem.Root>
          ))}
        </List>
      </DensityProvider>
    </div>
  );
};
