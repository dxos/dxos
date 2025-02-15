//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { Icon, Input, Link, ListItem, useTranslation } from '@dxos/react-ui';
import { descriptionText, fineBlockSize, mx } from '@dxos/react-ui-theme';

import { REGISTRY_PLUGIN } from '../meta';

export type PluginItemProps = {
  plugin: Plugin;
  installed?: readonly string[];
  enabled?: readonly string[];
  onClick?: (id: string) => void;
  onChange?: (id: string, enabled: boolean) => void;
};

export const PluginItem = ({ plugin, enabled = [], onClick, onChange }: PluginItemProps) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const { id, name, description, homePage, source, icon = 'ph--circle--regular' } = plugin.meta;
  const isEnabled = enabled.includes(id);
  const inputId = `${id}-input`;
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const handleClick = useCallback(() => onClick?.(id), [id, onClick]);
  const handleChange = useCallback(() => onChange?.(id, !isEnabled), [id, isEnabled, onChange]);

  return (
    <Input.Root key={id} id={inputId}>
      <ListItem.Root
        labelId={labelId}
        data-testid={`pluginList.${id}`}
        aria-describedby={descriptionId}
        classNames='flex gap-2 plb-2 pli-2 rounded border border-separator'
        onClick={handleClick}
      >
        <Icon icon={icon} size={6} classNames='shrink-0 mbs-1' />
        <div role='none' className={mx(fineBlockSize, 'grow pbs-1 pl-1')}>
          <label id={labelId} className='truncate'>
            {name ?? id}
          </label>
          {(description || homePage || source) && (
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
                    <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mli-1' />
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
                    <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mli-1' />
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
        <div className='pbs-1'>
          <Input.Switch classNames='self-center' checked={isEnabled} onClick={handleChange} />
        </div>
      </ListItem.Root>
    </Input.Root>
  );
};
