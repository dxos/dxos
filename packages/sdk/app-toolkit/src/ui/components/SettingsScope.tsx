//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { AlertDialog, Button, ToggleGroup, ToggleGroupIconItem, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { useSettingsScope } from '../hooks';

export type SettingsScopeProps = {
  /** Settings prefix the control scopes — a plugin key, or one of the app-level namespaces. */
  prefix: string;
};

/**
 * Whether a settings panel follows the account or stays on this device.
 *
 * Belongs in the heading row of a settings panel's first section, via `Form.Section`'s `actions`
 * slot: the scope is a property of the panel, not of any one field. Every settings panel renders it,
 * the schema-driven default and the bespoke ones alike, so it lives here rather than in
 * `plugin-settings` — which most of them do not depend on.
 *
 * Leaving the account is silent: the current values freeze here and no other device is touched.
 * Rejoining replaces this device's values with the account's, so it asks first.
 */
export const SettingsScope = ({ prefix }: SettingsScopeProps) => {
  const { t } = useTranslation(osTranslations);
  const { available, synced, setSynced } = useSettingsScope(prefix);
  const [confirming, setConfirming] = useState(false);

  const handleValueChange = useCallback(
    (value: string) => {
      // Radix clears the value when the pressed item is the active one; only a real change acts.
      if (value === 'synced' && !synced) {
        setConfirming(true);
      } else if (value === 'local' && synced) {
        setSynced(false);
      }
    },
    [setSynced, synced],
  );

  const handleConfirm = useCallback(() => {
    setSynced(true);
    setConfirming(false);
  }, [setSynced]);

  if (!available) {
    return null;
  }

  return (
    <>
      <ToggleGroup type='single' value={synced ? 'synced' : 'local'} onValueChange={handleValueChange}>
        <ToggleGroupIconItem
          value='synced'
          data-testid='settingsScope.synced'
          icon='ph--cloud-check--regular'
          label={t('settings-scope.synced.label')}
          iconOnly
        />
        <ToggleGroupIconItem
          value='local'
          data-testid='settingsScope.local'
          icon='ph--monitor--regular'
          label={t('settings-scope.local.label')}
          iconOnly
        />
      </ToggleGroup>
      <AlertDialog.Root open={confirming} onOpenChange={setConfirming}>
        <AlertDialog.Overlay>
          <AlertDialog.Content>
            <AlertDialog.Body>
              <AlertDialog.Title>{t('settings-scope.rejoin-dialog.title')}</AlertDialog.Title>
              <AlertDialog.Description>{t('settings-scope.rejoin-dialog.description')}</AlertDialog.Description>
            </AlertDialog.Body>
            <AlertDialog.ActionBar>
              <div className='grow' />
              <AlertDialog.Cancel asChild>
                <Button>{t('settings-scope.rejoin-dialog.cancel.label')}</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button data-testid='settingsScope.confirm' variant='primary' onClick={handleConfirm}>
                  {t('settings-scope.rejoin-dialog.confirm.label')}
                </Button>
              </AlertDialog.Action>
            </AlertDialog.ActionBar>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Root>
    </>
  );
};

SettingsScope.displayName = 'SettingsScope';
