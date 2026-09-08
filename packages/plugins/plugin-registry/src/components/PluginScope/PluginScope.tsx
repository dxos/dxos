//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { ToggleGroup, ToggleGroupIconItem, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type PluginScopeProps = {
  /** Whether this plugin's enabled state follows the account rather than being pinned here. */
  synced: boolean;
  onSyncedChange: (synced: boolean) => void;
};

/**
 * Whether one plugin's enabled state follows the account or is pinned to this device.
 *
 * Kept away from the enable switch and given its own section: they are not peers, and rendering
 * them side by side read as two competing toggles. This is the same control the settings panels
 * use for a whole namespace, on one plugin instead — the icons and labels match so the two are
 * recognisably the same question.
 *
 * Neither direction asks. Pinning freezes the state already in effect; releasing hands the plugin
 * back to the account, and the only thing undone is a choice made here deliberately.
 */
export const PluginScope = ({ synced, onSyncedChange }: PluginScopeProps) => {
  const { t } = useTranslation(meta.profile.key);
  const handleValueChange = useCallback(
    (value: string) => {
      // Radix clears the value when the pressed item is the active one; only a real change acts.
      if (value === 'shared' && !synced) {
        onSyncedChange(true);
      } else if (value === 'local' && synced) {
        onSyncedChange(false);
      }
    },
    [onSyncedChange, synced],
  );

  return (
    <ToggleGroup type='single' value={synced ? 'shared' : 'local'} onValueChange={handleValueChange}>
      <ToggleGroupIconItem
        value='shared'
        data-testid='pluginDetail.scope.shared'
        icon='ph--cloud-check--regular'
        label={t('plugin-scope.shared.label')}
        iconOnly
      />
      <ToggleGroupIconItem
        value='local'
        data-testid='pluginDetail.scope.local'
        icon='ph--monitor--regular'
        label={t('plugin-scope.device-only.label')}
        iconOnly
      />
    </ToggleGroup>
  );
};

PluginScope.displayName = 'PluginScope';
