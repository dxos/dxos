//
// Copyright 2025 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { type ChromaticPalette, Icon, IconButton, Input, Link, ListItem, Tag, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/ui-theme';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '../meta';
import { type RegistryTagType } from '../types';

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
  hasSettings: hasSettingsParam,
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

  const hasSettings = hasSettingsParam?.(id) ?? false;
  const handleSettings = useCallback(() => onSettings?.(id), [id, onSettings]);
  const styles = getStyles(iconHue);
  const gridCols = 'grid grid-cols-[5rem_1fr]';
  const gridRows = 'grid grid-rows-[40px_1fr_min-content_40px]';

  return (
    <ListItem.Root
      key={id}
      labelId={labelId}
      data-testid={`pluginList.${id}`}
      aria-describedby={descriptionId}
      classNames={mx(gridCols, 'bs-[12rem] is-full gap-3 pie-2 border border-separator rounded-md overflow-hidden')}
    >
      <div className={mx(gridRows, 'justify-center rounded-l-md', styles.bg)}>
        <div />
        <Icon classNames={mx('cursor-pointer', styles.icon)} icon={icon} size={14} onClick={handleClick} />
      </div>

      <div className={mx(gridRows)}>
        <div className='flex items-center overflow-hidden cursor-pointer' onClick={handleClick}>
          <span className='text-lg truncate'>{name ?? id}</span>
        </div>

        <div>
          <p className={mx(descriptionText, 'line-clamp-4 min-is-0')}>{description}</p>
        </div>

        <div className='flex -mis-0.5 overflow-x-auto scrollbar-none'>
          {tags?.map((tag) => (
            <Tag key={tag} palette={tagColors[tag as RegistryTagType]} classNames='text-xs uppercase font-thin'>
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

          <div className='grow' />
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

const tagColors: Record<RegistryTagType, ChromaticPalette> = {
  new: 'rose',
  beta: 'teal',
  labs: 'blue',
  popular: 'green',
  featured: 'pink',
  experimental: 'amber',
};
