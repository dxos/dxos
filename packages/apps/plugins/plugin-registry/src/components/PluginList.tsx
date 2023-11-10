//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React from 'react';

import type { Plugin } from '@dxos/app-framework';
import { DensityProvider, Input, List, ListItem, useId, useTranslation } from '@dxos/react-ui';
import { descriptionText, fineBlockSize, getSize, ghostHover, mx } from '@dxos/react-ui-theme';

import { REGISTRY_PLUGIN } from '../meta';

export type PluginListProps = {
  plugins?: Plugin['meta'][];
  loaded?: string[];
  enabled?: string[];
  onChange?: (id: string, enabled: boolean) => void;
};

export const PluginList = ({ plugins = [], loaded = [], enabled = [], onChange }: PluginListProps) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);

  return (
    <DensityProvider density='fine'>
      <List classNames='select-none'>
        {plugins.map(({ id, name, description, iconComponent: Icon = Circle }) => {
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
                <Icon weight='duotone' className={mx(getSize(6), 'mbs-1')} />
                <div role='none' className={mx(fineBlockSize, 'grow pbs-1 pl-1')}>
                  <label htmlFor={inputId} id={labelId} className='truncate'>
                    {name ?? id}
                  </label>
                  {(description || reloadRequired) && (
                    <div id={descriptionId} className='space-b-1 pbe-1'>
                      <p className={descriptionText}>{description}</p>
                      {reloadRequired && <p className='text-sm font-system-medium'>{t('reload required message')}</p>}
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
