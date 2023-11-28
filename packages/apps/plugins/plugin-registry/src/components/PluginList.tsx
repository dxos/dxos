//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React from 'react';

import type { Plugin } from '@dxos/app-framework';
import { DensityProvider, Input, List, ListItem, useId, useTranslation } from '@dxos/react-ui';
import { descriptionText, fineBlockSize, getSize, ghostHover, mx } from '@dxos/react-ui-theme';

import { REGISTRY_PLUGIN } from '../meta';

const colors: { [tag: string]: string } = {
  alpha: 'bg-purple-600 dark:bg-purple-400 text-white dark:text-black',
  beta: 'bg-blue-600 dark:bg-blue-400 text-white dark:text-black',
  experimental: 'bg-red-600 dark:bg-red-400 text-white dark:text-black',
  new: 'bg-red-600 dark:bg-red-400 text-white dark:text-black',
  stable: 'bg-green-600 dark:bg-green-400 text-white dark:text-black',
};

export type PluginListProps = {
  plugins?: Plugin['meta'][];
  loaded?: string[];
  enabled?: string[];
  className?: string;
  onChange?: (id: string, enabled: boolean) => void;
};

export const PluginList = ({ plugins = [], loaded = [], enabled = [], className, onChange }: PluginListProps) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);

  return (
    <DensityProvider density='fine'>
      <List classNames='select-none'>
        {plugins.map(({ id, name, description, tags, iconComponent: Icon = Circle }) => {
          const isEnabled = enabled.includes(id);
          const isLoaded = loaded.includes(id);
          const reloadRequired = isEnabled !== isLoaded;
          const inputId = useId('plugin');
          const labelId = useId('pluginName');
          const descriptionId = useId('pluginDescription');

          return (
            <Input.Root key={id} id={inputId}>
              <ListItem.Root
                labelId={labelId}
                classNames={['flex gap-2 cursor-pointer plb-1 pli-2 -mli-2 rounded', ghostHover]}
                onClick={() => onChange?.(id, !isEnabled)}
                aria-describedby={descriptionId}
              >
                <Icon weight='duotone' className={mx('shrink-0 mbs-1', getSize(6))} />
                <div role='none' className={mx(fineBlockSize, 'grow pbs-1 pl-1')}>
                  <label htmlFor={inputId} id={labelId} className='truncate'>
                    {name ?? id}
                  </label>
                  {(description || reloadRequired) && (
                    <div id={descriptionId} className='space-b-1 pbs-1 pbe-1'>
                      <p className={descriptionText}>{description}</p>
                      {reloadRequired && <p className='text-sm font-system-medium'>{t('reload required message')}</p>}
                    </div>
                  )}
                  {tags?.length && (
                    <div className='flex my-1'>
                      {tags.map((tag) => (
                        <div key={tag} className={mx('text-xs px-1 py-[1px] bg-gray-200 rounded-md mr-1', colors[tag])}>
                          {tag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className='pbs-1'>
                  <Input.Switch classNames='self-center' checked={!!isEnabled} />
                </div>
              </ListItem.Root>
            </Input.Root>
          );
        })}
      </List>
    </DensityProvider>
  );
};
