//
// Copyright 2025 DXOS.org
//

import React, { type MouseEvent, useCallback, useMemo } from 'react';

import { type Plugin } from '@dxos/app-framework';
import {
  Button,
  type ChromaticPalette,
  Icon,
  IconButton,
  Input,
  Link,
  ListItem,
  type NeutralPalette,
  Tag,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '#meta';
import { type RegistryTagType } from '#types';

export type PluginItemProps = {
  plugin: Plugin.Plugin;
  /** Ids of plugins currently installed (loaded into the manager). */
  installed?: readonly string[];
  /** Ids of plugins whose install is in flight. */
  installing?: readonly string[];
  enabled?: readonly string[];
  /**
   * Derived tags (e.g. `community`, `local`) to display alongside the plugin's own meta.tags.
   * Not persisted to plugin meta; computed per-render by the container.
   */
  extraTags?: readonly string[];
  onClick?: (id: string) => void;
  onChange?: (id: string, enabled: boolean) => void;
  /**
   * Install handler. When provided and the plugin is not installed, an Install button
   * is rendered in place of the enable switch.
   */
  onInstall?: (id: string) => void;
  hasSettings?: (id: string) => boolean;
  onSettings?: (id: string) => void;
};

export const PluginItem = ({
  plugin,
  installed,
  installing,
  enabled = [],
  extraTags,
  onClick,
  onChange,
  onInstall,
  hasSettings: hasSettingsProp,
  onSettings,
}: PluginItemProps) => {
  const { t } = useTranslation(meta.id);
  const { id, name, description, tags, icon = 'ph--circle--regular', iconHue = 'neutral' } = plugin.meta;
  const displayTags = useMemo(() => {
    if (!extraTags || extraTags.length === 0) {
      return tags ?? [];
    }
    const set = new Set<string>(tags ?? []);
    for (const tag of extraTags) {
      set.add(tag);
    }
    return Array.from(set);
  }, [tags, extraTags]);
  const isEnabled = enabled.includes(id);
  const isInstalled = installed ? installed.includes(id) : true;
  const isInstalling = installing?.includes(id) ?? false;
  const showInstallButton = !!onInstall && !isInstalled;
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

  const handleInstall = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onInstall?.(id);
    },
    [id, onInstall],
  );

  const hasSettings = hasSettingsProp?.(id) ?? false;
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
      classNames={mx(gridCols, 'h-[14rem] w-full gap-3 pe-2 bg-modal-surface rounded-md overflow-hidden')}
    >
      <div className={mx(gridRows, 'justify-center rounded-l-md', styles.surface)}>
        <Icon
          classNames={mx('row-start-2 cursor-pointer', styles.surfaceText)}
          icon={icon}
          size={14}
          onClick={handleClick}
        />
      </div>

      <div className={mx(gridRows)}>
        <div className='flex items-center overflow-hidden cursor-pointer' onClick={handleClick}>
          <span className='text-lg truncate'>{name ?? id}</span>
        </div>

        <div>
          <p className={mx('text-description', 'line-clamp-4 min-w-0')}>{description}</p>
        </div>

        <div className='flex -ms-0.5 overflow-x-auto scrollbar-none'>
          {displayTags.map((tag) => (
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
            label={t('plugin-settings.label')}
            iconOnly
            size={4}
            onClick={handleSettings}
            disabled={!hasSettings}
          />

          <Link aria-describedby={descriptionId} classNames='text-description cursor-pointer' onClick={handleClick}>
            {t('details.label')}
          </Link>

          <div className='grow' />
          <div className='pe-1'>
            {showInstallButton ? (
              <Button
                aria-describedby={descriptionId}
                density='fine'
                variant='primary'
                disabled={isInstalling}
                onClick={handleInstall}
              >
                {isInstalling ? t('installing.label') : t('install.label')}
              </Button>
            ) : (
              <Input.Root id={inputId}>
                <Input.Switch classNames='self-center' checked={isEnabled} onClick={handleChange} />
              </Input.Root>
            )}
          </div>
        </div>
      </div>
    </ListItem.Root>
  );
};

const tagColors: Record<RegistryTagType, ChromaticPalette | NeutralPalette> = {
  new: 'rose',
  beta: 'teal',
  labs: 'blue',
  popular: 'green',
  featured: 'pink',
  experimental: 'amber',
  community: 'indigo',
  local: 'neutral',
};
