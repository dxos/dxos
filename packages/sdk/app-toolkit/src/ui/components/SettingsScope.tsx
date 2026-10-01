//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { osTranslations } from '@dxos/ui-theme';

import { useSettingsScope } from '../hooks/index.ts';

export type SettingsScopeProps = {
  /** Settings prefix the control scopes — a plugin key, or one of the app-level namespaces. */
  prefix: string;
};

/** Whether a settings panel follows the account or stays on this device. */
export const SettingsScope = ({ prefix }: SettingsScopeProps) => {
  const { t } = useTranslation(osTranslations);
  const { available, synced, takeLocal, rejoinAccount, getConflicts } = useSettingsScope(prefix);
  const [conflicts, setConflicts] = useState<readonly string[]>([]);

  const handleValueChange = useCallback(
    (value: string) => {
      if (value === 'local' && synced) {
        takeLocal();
      } else if (value === 'synced' && !synced) {
        const conflicting = getConflicts();
        if (conflicting.length === 0) {
          rejoinAccount();
        } else {
          setConflicts(conflicting);
        }
      }
    },
    [getConflicts, rejoinAccount, synced, takeLocal],
  );

  const handleResolve = useCallback(
    (adopt: 'shared' | 'local') => {
      rejoinAccount({ adopt });
      setConflicts([]);
    },
    [rejoinAccount],
  );

  if (!available) {
    return null;
  }

  return (
    <>
      <Next.ToggleGroup type='single' value={synced ? 'synced' : 'local'} onValueChange={handleValueChange}>
        <Next.ToggleGroup.Item
          value='synced'
          data-testid='settingsScope.synced'
          icon='ph--cloud-check--regular'
          label={t('settings-scope.synced.label')}
          iconOnly
        />
        <Next.ToggleGroup.Item
          value='local'
          data-testid='settingsScope.local'
          icon='ph--monitor--regular'
          label={t('settings-scope.local.label')}
          iconOnly
        />
      </Next.ToggleGroup>
      <Next.AlertDialog.Root open={conflicts.length > 0} onOpenChange={(open) => !open && setConflicts([])}>
        <Next.AlertDialog.Content>
          <Next.AlertDialog.Body>
            <Next.AlertDialog.Title>{t('settings-scope.conflict-dialog.title')}</Next.AlertDialog.Title>
            <Next.AlertDialog.Description>
              {t('settings-scope.conflict-dialog.description', { count: conflicts.length })}
            </Next.AlertDialog.Description>
          </Next.AlertDialog.Body>
          <Next.AlertDialog.Footer>
            <div className='grow' />
            <Next.AlertDialog.Cancel asChild>
              <Next.Button>{t('settings-scope.conflict-dialog.cancel.label')}</Next.Button>
            </Next.AlertDialog.Cancel>
            <Next.AlertDialog.Action asChild>
              <Next.Button data-testid='settingsScope.keepLocal' onClick={() => handleResolve('local')}>
                {t('settings-scope.conflict-dialog.keep-local.label')}
              </Next.Button>
            </Next.AlertDialog.Action>
            <Next.AlertDialog.Action asChild>
              <Next.Button
                data-testid='settingsScope.keepShared'
                variant='primary'
                onClick={() => handleResolve('shared')}
              >
                {t('settings-scope.conflict-dialog.keep-shared.label')}
              </Next.Button>
            </Next.AlertDialog.Action>
          </Next.AlertDialog.Footer>
        </Next.AlertDialog.Content>
      </Next.AlertDialog.Root>
    </>
  );
};

SettingsScope.displayName = 'SettingsScope';
