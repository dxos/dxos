//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { type PluginMeta } from '@dxos/app-framework';
import { Button, Icon, Input, Link, List, ListItem, useTranslation } from '@dxos/react-ui';
import {
  descriptionText,
  fineBlockSize,
  getSize,
  hoverableControlItem,
  hoverableControls,
  mx,
} from '@dxos/react-ui-theme';

import { REGISTRY_PLUGIN } from '../meta';
import { ArrowSquareOut } from '@phosphor-icons/react';

export type PluginListProps = {
  plugins?: PluginMeta[];
  loaded?: string[];
  enabled?: string[];
  onChange?: (id: string, enabled: boolean) => void;
  onReload?: () => void;
};

export const PluginList = ({ plugins = [], loaded = [], enabled = [], onChange, onReload }: PluginListProps) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);

  return (
    <List classNames='mb-4 select-none'>
      {plugins.map(({ id, name, description, homePage, source, icon = 'ph--circle--regular' }) => {
        const isEnabled = enabled.includes(id);
        const isLoaded = loaded.includes(id);
        const reloadRequired = isEnabled !== isLoaded;
        const inputId = `${id}-input`;
        const labelId = `${id}-label`;
        const descriptionId = `${id}-description`;
        const handleChange = useCallback(() => onChange?.(id, !isEnabled), [id, isEnabled, onChange]);

        return (
          <Input.Root key={id} id={inputId}>
            <ListItem.Root
              labelId={labelId}
              data-testid={`pluginList.${id}`}
              aria-describedby={descriptionId}
              classNames='flex gap-2 plb-2 pli-2 -mli-2 rounded'
            >
              <Icon icon={icon} size={6} classNames='shrink-0 mbs-1' />
              <div role='none' className={mx(fineBlockSize, 'grow pbs-1 pl-1')}>
                <label htmlFor={inputId} id={labelId} className='truncate'>
                  {name ?? id}
                </label>
                {(description || reloadRequired || homePage || source) && (
                  <>
                    <div id={descriptionId} className='space-b-1 pbs-1 pbe-1'>
                      <p className={descriptionText}>{description}</p>
                      {homePage && (
                        <Link
                          href={homePage}
                          target='_blank'
                          rel='noreferrer'
                          aria-describedby={descriptionId}
                          classNames='text-xs text-description'
                        >
                          {t('home page label')}
                          <Icon
                            icon='ph--arrow-square-out--bold'
                            size={3}
                            classNames='inline-block leading-none mli-1'
                          />
                        </Link>
                      )}
                      {source && (
                        <Link
                          href={source}
                          target='_blank'
                          rel='noreferrer'
                          aria-describedby={descriptionId}
                          classNames='text-xs text-description'
                        >
                          {t('source label')}
                          <Icon
                            icon='ph--arrow-square-out--bold'
                            size={3}
                            classNames='inline-block leading-none mli-1'
                          />
                        </Link>
                      )}
                    </div>
                    {reloadRequired && (
                      <Button variant='ghost' classNames='p-0 gap-2' onClick={onReload}>
                        <Icon size={4} icon='ph--arrow-clockwise--regular' />
                        <p className='text-sm font-medium'>{t('reload required message')}</p>
                      </Button>
                    )}
                  </>
                )}
              </div>
              <div className='pbs-1'>
                <Input.Switch classNames='self-center' checked={isEnabled} onClick={handleChange} />
              </div>
            </ListItem.Root>
          </Input.Root>
        );
      })}
    </List>
  );
};
