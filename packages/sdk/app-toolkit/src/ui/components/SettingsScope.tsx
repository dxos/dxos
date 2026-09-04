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
 * Rejoining asks only where the two sides actually disagree, and then asks which side to keep —
 * with no disagreement nothing is lost either way, so there is nothing worth interrupting for.
 */
export const SettingsScope = ({ prefix }: SettingsScopeProps) => {
  const { t } = useTranslation(osTranslations);
  const { available, synced, setSynced, getConflicts } = useSettingsScope(prefix);
  const [conflicts, setConflicts] = useState<readonly string[]>([]);

  const handleValueChange = useCallback(
    (value: string) => {
      // Radix clears the value when the pressed item is the active one; only a real change acts.
      if (value === 'local' && synced) {
        setSynced(false);
      } else if (value === 'synced' && !synced) {
        // Rejoining only takes something away where the two sides disagree. With no disagreement
        // there is nothing to decide, so it just happens.
        const conflicting = getConflicts();
        if (conflicting.length === 0) {
          setSynced(true);
        } else {
          setConflicts(conflicting);
        }
      }
    },
    [getConflicts, setSynced, synced],
  );

  const handleResolve = useCallback(
    (adopt: 'shared' | 'local') => {
      setSynced(true, { adopt });
      setConflicts([]);
    },
    [setSynced],
  );

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
      <AlertDialog.Root open={conflicts.length > 0} onOpenChange={(open) => !open && setConflicts([])}>
        <AlertDialog.Overlay>
          <AlertDialog.Content>
            <AlertDialog.Body>
              <AlertDialog.Title>{t('settings-scope.conflict-dialog.title')}</AlertDialog.Title>
              <AlertDialog.Description>
                {t('settings-scope.conflict-dialog.description', { count: conflicts.length })}
              </AlertDialog.Description>
            </AlertDialog.Body>
            <AlertDialog.ActionBar>
              <div className='grow' />
              <AlertDialog.Cancel asChild>
                <Button>{t('settings-scope.conflict-dialog.cancel.label')}</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button data-testid='settingsScope.keepLocal' onClick={() => handleResolve('local')}>
                  {t('settings-scope.conflict-dialog.keep-local.label')}
                </Button>
              </AlertDialog.Action>
              <AlertDialog.Action asChild>
                <Button
                  data-testid='settingsScope.keepShared'
                  variant='primary'
                  onClick={() => handleResolve('shared')}
                >
                  {t('settings-scope.conflict-dialog.keep-shared.label')}
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
