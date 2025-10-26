//
// Copyright 2025 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { Icon, IconButton, Input, Link, ListItem, Tag, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';
import { getStyles } from '@dxos/react-ui-theme';

import { meta } from '../meta';

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
  const { t } = useTranslation(meta.id);
  const { id, name, description, tags, icon = 'ph--circle--regular', iconHue = 'neutral' } = plugin.meta;
  const isEnabled = enabled.includes(id);
  const inputId = `${id}-input`;
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const handleClick = useCallback(() => onClick?.(id), [id, onClick]);

  const handleChange = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onChange?.(id, !isEnabled);
    },
    [id, isEnabled, onChange],
  );

  const hasSettings = _hasSettings?.(id) ?? false;
  const handleSettings = useCallback(() => onSettings?.(id), [id, onSettings]);
  const styles = getStyles(iconHue);

  return (
    <ListItem.Root
      key={id}
      labelId={labelId}
      data-testid={`pluginList.${id}`}
      aria-describedby={descriptionId}
      classNames='is-full bs-full grid grid-cols-[5rem_1fr] gap-3 pie-2 border border-separator rounded-md overflow-hidden'
    >
      <div className={mx('flex justify-center rounded-l-md', styles.bg)}>
        <Icon
          classNames={mx('mbs-10 text-black cursor-pointer', styles.icon)}
          icon={icon}
          size={14}
          onClick={handleClick}
        />
      </div>

      <div className='grid grid-rows-[40px_1fr_min-content_40px] gap-2 overflow-hidden'>
        <div className='flex items-center overflow-hidden cursor-pointer' onClick={handleClick}>
          <span className='truncate'>{name ?? id}</span>
        </div>

        <div className='flex overflow-hidden'>
          {(description || tags) && (
            <div id={descriptionId} className='flex flex-col w-full justify-between gap-2 pb-2'>
              <div className='grow'>
                <p className={mx(descriptionText, 'line-clamp-3 min-is-0 pie-2')}>{description}</p>
              </div>
            </div>
          )}
        </div>

        <div className='flex overflow-x-auto'>
          {tags?.map((tag) => (
            <Tag key={tag} palette={'green'} classNames='text-xs uppercase font-thin'>
              {tag}
            </Tag>
          ))}
        </div>

        <div className='flex gap-2 items-center text-sm'>
          <IconButton
            aria-describedby={descriptionId}
            classNames='cursor-pointer'
            icon='ph--gear--regular'
            label={t('settings label')}
            iconOnly
            size={4}
            onClick={handleSettings}
            disabled={!hasSettings}
          />

          <Link aria-describedby={descriptionId} classNames='text-description cursor-pointer' onClick={handleClick}>
            {t('details label')}
          </Link>

          <div className='flex-1' />
          <div className='pie-1'>
            <Input.Root id={inputId}>
              <Input.Switch classNames='self-center' checked={isEnabled} onClick={handleChange} />
            </Input.Root>
          </div>
        </div>
      </div>
    </ListItem.Root>
  );
};
