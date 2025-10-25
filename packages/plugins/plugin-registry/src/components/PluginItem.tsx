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
      classNames='is-full bs-full grid grid-cols-[5rem_1fr_48px] grid-rows-[40px_1fr_32px] p-1 border border-separator rounded-md'
    >
      {/* Header. */}
      <div />
      <div className='flex items-center overflow-hidden cursor-pointer' onClick={handleClick}>
        <span className='truncate'>{name ?? id}</span>
      </div>
      <div className='flex justify-center items-center'>
        <Input.Root id={inputId}>
          <Input.Switch classNames='self-center' checked={isEnabled} onClick={handleChange} />
        </Input.Root>
      </div>

      {/* Body. */}
      <div className={mx('mli-2.5 flex justify-center items-center aspect-square rounded-md', styles.bg)}>
        <Icon icon={icon} size={12} onClick={handleClick} classNames={mx('text-black cursor-pointer', styles.icon)} />
      </div>
      {(description || tags) && (
        <div id={descriptionId} className='col-span-2 flex flex-col w-full justify-between gap-2 pb-2'>
          <div className='grow'>
            <p className={mx(descriptionText, 'line-clamp-3 min-w-0 pie-2')}>{description}</p>
          </div>
          {tags && tags.length > 0 && (
            <div>
              {tags.map((tag) => (
                <Tag key={tag} palette='rose' classNames='text-xs capitalize'>
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
