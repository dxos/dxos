//
// Copyright 2023 DXOS.org
//

import { ArrowClockwise, Circle } from '@phosphor-icons/react';
import React from 'react';

import type { Plugin } from '@dxos/app-framework';
import {
  Button,
  // type ChromaticPalette,
  // type NeutralPalette,
  DensityProvider,
  Input,
  List,
  ListItem,
  useTranslation,
  // Link,
} from '@dxos/react-ui';
import { descriptionText, fineBlockSize, getSize, ghostHover, mx } from '@dxos/react-ui-theme';

import { REGISTRY_PLUGIN } from '../meta';

// TODO(burdon): Reconcile with theme.
// const palette: { [tag: string]: ChromaticPalette | NeutralPalette } = {
//   default: 'neutral',
//   new: 'green',
//   beta: 'cyan',
//   alpha: 'purple',
//   experimental: 'indigo',
//   新発売: 'red',
// };

export type PluginListProps = {
  plugins?: Plugin['meta'][];
  loaded?: string[];
  enabled?: string[];
  onChange?: (id: string, enabled: boolean) => void;
  onReload?: () => void;
};

export const PluginList = ({ plugins = [], loaded = [], enabled = [], onChange, onReload }: PluginListProps) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);

  return (
    <DensityProvider density='fine'>
      <List classNames='mb-4 select-none'>
        {plugins.map(({ id, name, description, homePage, iconComponent: Icon = Circle }) => {
          const isEnabled = enabled.includes(id);
          const isLoaded = loaded.includes(id);
          const reloadRequired = isEnabled !== isLoaded;
          const inputId = `${id}-input`;
          const labelId = `${id}-label`;
          const descriptionId = `${id}-description`;

          return (
            <Input.Root key={id} id={inputId}>
              <ListItem.Root
                labelId={labelId}
                data-testid={`pluginList.${id}`}
                aria-describedby={descriptionId}
                classNames={['flex gap-2 cursor-pointer plb-2 pli-2 -mli-2 rounded', ghostHover]}
              >
                <Icon weight='duotone' className={mx('shrink-0 mbs-1', getSize(6))} />
                <div role='none' className={mx(fineBlockSize, 'grow pbs-1 pl-1')}>
                  <label htmlFor={inputId} id={labelId} className='truncate'>
                    {name ?? id}
                  </label>
                  {(description || reloadRequired || homePage) && (
                    <div id={descriptionId} className='space-b-1 pbs-1 pbe-1'>
                      <p className={descriptionText}>{description}</p>
                      {/* TODO(wittjosiah): Include once plugin docs are available. */}
                      {/* {homePage && (
                        <Link
                          href={homePage}
                          target='_blank'
                          rel='noreferrer'
                          aria-describedby={descriptionId}
                          classNames='text-xs'
                        >
                          {t('home page label')}
                          <ArrowSquareOut weight='bold' className={mx(getSize(3), 'inline-block leading-none mli-1')} />
                        </Link>
                      )} */}
                      {reloadRequired && (
                        <Button variant='ghost' classNames='p-0 gap-2' onClick={onReload}>
                          <ArrowClockwise />
                          <p className='text-sm font-medium'>{t('reload required message')}</p>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className='pbs-1'>
                  <Input.Switch
                    classNames='self-center'
                    checked={!!isEnabled}
                    onClick={() => onChange?.(id, !isEnabled)}
                  />
                </div>
              </ListItem.Root>
            </Input.Root>
          );
        })}
      </List>
    </DensityProvider>
  );
};
