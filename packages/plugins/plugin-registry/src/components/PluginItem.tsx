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
  hasSettings?: (id: string) => boolean;
  onSettings?: (id: string) => void;
};

export const PluginItem = ({
  plugin,
  enabled = [],
  onClick,
  onChange,
  hasSettings: _hasSettings,
  onSettings,
}: PluginItemProps) => {
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

  const hasSettings = useCallback(() => _hasSettings?.(id) ?? false, [id, _hasSettings]);
  const handleSettings = useCallback(() => onSettings?.(id), [id, onSettings]);

  return (
    <ListItem.Root
      key={id}
      labelId={labelId}
      data-testid={`pluginList.${id}`}
      aria-describedby={descriptionId}
      classNames='w-full h-full grid grid-cols-[48px_1fr_48px] grid-rows-[40px_1fr] p-1 rounded-md border border-separator'
    >
      <div className='flex grow justify-center items-center'>
        <Icon icon={icon} size={6} onClick={handleClick} classNames='text-subdued cursor-pointer' />
      </div>
      <div className='flex grow items-center truncate cursor-pointer' onClick={handleClick}>
        {name ?? id}
      </div>
      <div className='flex grow justify-center items-center'>
        <Input.Root id={inputId}>
          <Input.Switch classNames='self-center' checked={isEnabled} onClick={handleChange} />
        </Input.Root>
      </div>

      <div />
      {(description || homePage || source) && (
        <div id={descriptionId} className='col-span-2 flex flex-col w-full gap-2 pb-3'>
          <div className='grow'>
            <p className={mx(descriptionText, 'line-clamp-3 min-w-0 pie-4')}>{description}</p>
          </div>

          <div className='flex gap-2 items-center'>
            <Link
              aria-describedby={descriptionId}
              classNames='text-sm text-description cursor-pointer'
              onClick={handleClick}
            >
              {t('details label')}
            </Link>

            {homePage && (
              <Link
                href={homePage}
                target='_blank'
                rel='noreferrer'
                aria-describedby={descriptionId}
                classNames='text-sm text-description'
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
                classNames='text-sm text-description'
                onClick={(ev) => ev.stopPropagation()}
              >
                {t('source label')}
                <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mli-1' />
              </Link>
            )}

            {hasSettings?.() && (
              <Link
                aria-describedby={descriptionId}
                classNames='text-sm text-description cursor-pointer'
                onClick={handleSettings}
              >
                {t('settings label')}
              </Link>
            )}
          </div>
        </div>
      )}
    </ListItem.Root>
  );
};
