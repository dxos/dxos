//
// Copyright 2025 DXOS.org
//

import React, { type MouseEvent, useCallback, useMemo } from 'react';

import type * as Plugin from '@dxos/app-framework/Plugin';
import type * as PluginManager from '@dxos/app-framework/PluginManager';
import { useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list/next';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';
import { type RegistryTagType } from '#types';

import { PluginFailureBadge } from '../PluginFailureBadge/index.ts';

export type PluginItemProps = {
  plugin: Plugin.Plugin;
  /** Ids of plugins currently installed (loaded into the manager). */
  installed?: readonly string[];
  /** Ids of plugins whose install is in flight. */
  installing?: readonly string[];
  enabled?: readonly string[];
  /**
   * Derived tags (e.g. `registry`, `local`) to display alongside the plugin's own meta.tags.
   * Not persisted to plugin meta; computed per-render by the container.
   */
  extraTags?: readonly string[];
  /** Whether this device's answer for this plugin differs from the account's. */
  deviceOnly?: boolean;
  onClick?: (id: string) => void;
  onChange?: (id: string, enabled: boolean) => void;
  /**
   * Install handler. When provided and the plugin is not installed, an Install button
   * is rendered in place of the enable switch.
   */
  onInstall?: (id: string) => void;
  /**
   * When true and plugin is installed, shows an Update button instead of the enable switch.
   */
  hasUpdate?: boolean;
  /** Called when the user clicks the Update button. */
  onUpdate?: (id: string) => void;
  /** Ids of plugins whose update is currently in flight. */
  updating?: readonly string[];
  hasSettings?: (id: string) => boolean;
  onSettings?: (id: string) => void;
  /**
   * Failure record for this plugin, if any. When present a warning badge is
   * rendered next to the plugin name; clicking it opens a popover with the
   * phase, reason, and error message.
   */
  failure?: PluginManager.PluginFailure;
  readOnly?: boolean;
};

export const PluginItem = ({
  plugin,
  installed,
  installing,
  enabled = [],
  extraTags,
  deviceOnly,
  onClick,
  onChange,
  onInstall,
  hasUpdate,
  onUpdate,
  updating,
  hasSettings: hasSettingsProp,
  onSettings,
  failure,
  readOnly,
}: PluginItemProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { key: id, name, description, tags, icon: rawIcon } = plugin.meta.profile;
  const icon = rawIcon?.key ?? 'ph--circle--regular';
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
  const isUpdating = updating?.includes(id) ?? false;
  const showInstallButton = !!onInstall && !isInstalled;
  const showUpdateButton = !!onUpdate && isInstalled && !!hasUpdate;
  const hasSettings = hasSettingsProp?.(id) ?? false;
  const handleClick = useCallback(() => onClick?.(id), [id, onClick]);
  const handleSettings = useCallback(() => onSettings?.(id), [id, onSettings]);
  const handleInstall = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onInstall?.(id);
    },
    [id, onInstall],
  );
  const handleUpdate = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onUpdate?.(id);
    },
    [id, onUpdate],
  );

  return (
    <Listbox.Item id={id} data-testid={`pluginList.${id}`}>
      <Listbox.ItemIcon icon={icon} />
      <Listbox.ItemText />
      {description && <Listbox.ItemDescription>{description}</Listbox.ItemDescription>}
      {failure && <PluginFailureBadge failure={failure} />}
      {deviceOnly && <Next.Icon data-testid={`pluginList.${id}.deviceOnly`} icon='ph--monitor--regular' />}
      {displayTags.map((tag) => (
        <Next.Tag key={tag} hue={tagColors[tag as RegistryTagType]}>
          {tag}
        </Next.Tag>
      ))}
      <Next.Button variant='ghost' iconOnly icon='ph--info--regular' label={t('details.label')} onClick={handleClick} />
      <Next.Button
        variant='ghost'
        iconOnly
        icon='ph--gear--regular'
        label={t('plugin-settings.label')}
        disabled={!hasSettings}
        onClick={handleSettings}
      />
      {isUpdating ? (
        <Next.Button variant='primary' disabled label={t('updating.label')} />
      ) : showUpdateButton ? (
        <Next.Button variant='primary' label={t('update.label')} onClick={handleUpdate} />
      ) : showInstallButton ? (
        <Next.Button
          variant='primary'
          disabled={isInstalling}
          label={isInstalling ? t('installing.label') : t('install.label')}
          onClick={handleInstall}
        />
      ) : (
        <Next.Switch
          aria-label={name ?? id}
          checked={isEnabled}
          disabled={readOnly}
          onCheckedChange={({ checked }) => onChange?.(id, checked)}
        />
      )}
    </Listbox.Item>
  );
};

const tagColors: Record<RegistryTagType, Next.TagHue> = {
  new: 'rose',
  // Tier hues ramp green -> blue -> purple so the ordering reads without knowing the labels.
  beta: 'green',
  alpha: 'blue',
  labs: 'purple',
  popular: 'green',
  featured: 'pink',
  experimental: 'amber',
  registry: 'indigo',
  local: 'neutral',
};
