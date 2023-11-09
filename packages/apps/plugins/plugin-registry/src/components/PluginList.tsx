//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React from 'react';

import type { Plugin } from '@dxos/app-framework';
import { DensityProvider, Input, List, ListItem, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { REGISTRY_PLUGIN } from '../meta';

// TODO(burdon): Factor out.
const styles = {
  hover: 'hover:bg-neutral-75 dark:hover:bg-neutral-850',
};

export type PluginListProps = {
  plugins?: Plugin['meta'][];
  loaded?: string[];
  enabled?: string[];
  onChange?: (id: string, enabled: boolean) => void;
};

export const PluginList = ({ plugins = [], loaded = [], enabled = [], onChange }: PluginListProps) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);

  return (
    <div className={mx('flex flex-col w-full overflow-x-hidden overflow-y-auto')}>
      <DensityProvider density={'fine'}>
        <List classNames='divide-y'>
          {plugins.map(({ id, name, description, iconComponent: Icon = Circle }) => {
            const isEnabled = enabled.includes(id);
            const isLoaded = loaded.includes(id);
            const reloadRequired = isEnabled !== isLoaded;

            return (
              <ListItem.Root
                key={id}
                classNames={mx('flex is-full cursor-pointer p-1', styles.hover)}
                onClick={() => onChange?.(id, !isEnabled)}
              >
                <ListItem.Endcap classNames={'items-center mr-4'}>
                  <Icon className={getSize(6)} />
                </ListItem.Endcap>
                <div className='flex flex-col grow'>
                  <ListItem.Heading classNames='flex grow truncate items-center'>{name ?? id}</ListItem.Heading>
                  {description && <div className='text-sm pb-1 font-thin'>{description}</div>}
                  {reloadRequired && <div className='text-sm font-bold'>{t('reload required message')}</div>}
                </div>
                <ListItem.Endcap classNames='items-center'>
                  <Input.Root>
                    <Input.Checkbox checked={!!isEnabled} />
                  </Input.Root>
                </ListItem.Endcap>
              </ListItem.Root>
            );
          })}
        </List>
      </DensityProvider>
    </div>
  );
};
