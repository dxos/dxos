//
// Copyright 2025 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { Icon, IconButton, Input, Link, ListItem, Tag, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

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
  const { id, name, description, tags, icon = 'ph--circle--regular' } = plugin.meta;
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

  return (
    <ListItem.Root
      key={id}
      labelId={labelId}
      data-testid={`pluginList.${id}`}
      aria-describedby={descriptionId}
      // TODO(burdon): Use Rail vars.
      classNames='is-full bs-full grid grid-cols-[48px_1fr_48px] grid-rows-[40px_1fr_32px] p-1 border border-separator rounded-md'
    >
      {/* Header. */}
      <div className='flex flex-col grow justify-center items-center'>
        <Icon icon={icon} size={6} onClick={handleClick} classNames='text-subdued cursor-pointer' />
      </div>
      <div className='flex items-center overflow-hidden cursor-pointer' onClick={handleClick}>
        <span className='truncate'>{name ?? id}</span>
      </div>
      <div className='flex justify-center items-center'>
        <Input.Root id={inputId}>
          <Input.Switch classNames='self-center' checked={isEnabled} onClick={handleChange} />
        </Input.Root>
      </div>

      {/* Body. */}
      <div />
      {(description || tags) && (
        <div id={descriptionId} className='col-span-2 flex flex-col w-full justify-between gap-2 pb-2'>
          <div className='grow'>
            <p className={mx(descriptionText, 'line-clamp-3 min-w-0 pie-2')}>{description}</p>
          </div>
          {tags && tags.length > 0 && (
            <div>
              {tags.map((tag) => (
                <Tag key={tag} palette={'indigo'} classNames='text-xs capitalize'>
                  {tag}
                </Tag>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer. */}
      <div />
      <div className='flex gap-2 items-center pie-1'>
        <Link
          aria-describedby={descriptionId}
          classNames='text-sm text-description cursor-pointer'
          onClick={handleClick}
        >
          {t('details label')}
        </Link>

        <div className='flex-1' />
      </div>
      <div className='flex justify-center items-center'>
        {hasSettings && (
          <IconButton
            aria-describedby={descriptionId}
            classNames='text-sm text-description cursor-pointer'
            icon='ph--gear--regular'
            label={t('settings label')}
            iconOnly
            size={4}
            onClick={handleSettings}
          />
        )}
      </div>
    </ListItem.Root>
  );
};
