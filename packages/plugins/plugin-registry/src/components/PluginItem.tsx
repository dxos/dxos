//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { Icon, Input, Link, ListItem, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

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
  const handleChange = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onChange?.(id, !isEnabled);
    },
    [id, isEnabled, onChange],
  );

  return (
    <ListItem.Root
      key={id}
      labelId={labelId}
      data-testid={`pluginList.${id}`}
      aria-describedby={descriptionId}
      classNames='grow grid grid-cols-[48px_1fr_48px] grid-rows-[40px_1fr] p-1 rounded-md border border-separator'
      onClick={handleClick}
    >
      <Input.Root id={inputId}>
        <div className='flex grow justify-center items-center'>
          <Icon icon={icon} size={8} />
        </div>
        <div className='flex grow items-center'>
          <Input.Label id={labelId} classNames='truncate text-md'>
            {name ?? id}
          </Input.Label>
        </div>
        <div className='flex grow justify-center items-center'>
          <Input.Switch classNames='self-center' checked={isEnabled} onClick={handleChange} />
        </div>
      </Input.Root>

      <div />
      {(description || homePage || source) && (
        <div id={descriptionId} className='col-span-2 flex flex-col gap-2 pie-2 overflow-y-scroll'>
          <p className={mx(descriptionText, 'line-clamp-4')}>{description}</p>
          {homePage && (
            <Link
              href={homePage}
              target='_blank'
              rel='noreferrer'
              aria-describedby={descriptionId}
              classNames='text-sm text-description line-clamp-4'
              onClick={(ev) => ev.stopPropagation()}
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
              classNames='text-sm text-description line-clamp-4'
              onClick={(ev) => ev.stopPropagation()}
            >
              {t('source label')}
              <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mli-1' />
            </Link>
          )}
        </div>
      )}
    </ListItem.Root>
  );
};
