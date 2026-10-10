//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import { osTranslations } from '@dxos/ui-theme';

import { useSettingsScope } from '../hooks/index.ts';

export type SettingsScopeProps = {
  /** Settings prefix the control scopes — a plugin key, or one of the app-level namespaces. */
  prefix: string;
};

/** Whether a settings panel follows the account or stays on this device. */
export const SettingsScope = ({ prefix }: SettingsScopeProps) => {
  const { t } = Hooks.useTranslation(osTranslations);
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
      <ToggleGroup.Root type='single' value={synced ? 'synced' : 'local'} onValueChange={handleValueChange}>
        <ToggleGroup.Item
          value='synced'
          data-testid='settingsScope.synced'
          icon='ph--cloud-check--regular'
          label={t('settings-scope.synced.label')}
          iconOnly
        />
        <ToggleGroup.Item
          value='local'
          data-testid='settingsScope.local'
          icon='ph--monitor--regular'
          label={t('settings-scope.local.label')}
          iconOnly
        />
      </ToggleGroup.Root>
      <AlertDialog.Root open={conflicts.length > 0} onOpenChange={({ open }) => !open && setConflicts([])}>
        <AlertDialog.Content>
          <AlertDialog.Body>
            <AlertDialog.Title>{t('settings-scope.conflict-dialog.title')}</AlertDialog.Title>
            <AlertDialog.Description>
              {t('settings-scope.conflict-dialog.description', { count: conflicts.length })}
            </AlertDialog.Description>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <div className='grow' />
            <AlertDialog.Cancel>{t('settings-scope.conflict-dialog.cancel.label')}</AlertDialog.Cancel>
            <AlertDialog.Action data-testid='settingsScope.keepLocal' onClick={() => handleResolve('local')}>
              {t('settings-scope.conflict-dialog.keep-local.label')}
            </AlertDialog.Action>
            <AlertDialog.Action
              data-testid='settingsScope.keepShared'
              variant='primary'
              onClick={() => handleResolve('shared')}
            >
              {t('settings-scope.conflict-dialog.keep-shared.label')}
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
};

SettingsScope.displayName = 'SettingsScope';
