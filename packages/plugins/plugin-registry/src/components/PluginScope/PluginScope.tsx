//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { ToggleGroup, ToggleGroupIconItem, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type PluginScopeProps = {
  /** Whether this plugin's enabled state follows the account rather than being pinned here. */
  synced: boolean;
  /** Keep this plugin's state on this device. */
  onPin: () => void;
  /** Hand this plugin's state back to the account. */
  onUnpin: () => void;
};

/** Whether one plugin's enabled state follows the account or is pinned to this device. */
export const PluginScope = ({ synced, onPin, onUnpin }: PluginScopeProps) => {
  const { t } = useTranslation(meta.profile.key);
  const handleValueChange = useCallback(
    (value: string) => {
      if (value === 'shared' && !synced) {
        onUnpin();
      } else if (value === 'local' && synced) {
        onPin();
      }
    },
    [onPin, onUnpin, synced],
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
