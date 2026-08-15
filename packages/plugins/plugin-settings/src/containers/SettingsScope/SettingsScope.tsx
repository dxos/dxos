//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useSettingsScope } from '@dxos/app-toolkit/ui';
import { AlertDialog, Button, IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type SettingsScopeProps = {
  /** Settings prefix the control scopes — a plugin key, or one of the app-level namespaces. */
  prefix: string;
};

/**
 * Whether a settings panel follows the account or stays on this device, as a single control in the
 * plank header.
 *
 * It lives in the header rather than in the form because the scope is a property of the panel, not
 * of any one field — which is also what lets one control cover every plugin, including the majority
 * that render their own settings surface instead of {@link DefaultSettings}.
 *
 * Leaving the account is silent: the current values freeze here and no other device is touched.
 * Rejoining replaces this device's values with the account's, so it asks first.
 */
export const SettingsScope = ({ prefix }: SettingsScopeProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { available, synced, setSynced } = useSettingsScope(prefix);
  const [confirming, setConfirming] = useState(false);

  const handleClick = useCallback(() => {
    if (synced) {
      setSynced(false);
    } else {
      setConfirming(true);
    }
  }, [setSynced, synced]);

  const handleConfirm = useCallback(() => {
    setSynced(true);
    setConfirming(false);
  }, [setSynced]);

  if (!available) {
    return null;
  }

  return (
    <>
      <IconButton
        data-testid='settingsScope.toggle'
        variant='ghost'
        icon={synced ? 'ph--cloud-check--regular' : 'ph--monitor--regular'}
        label={synced ? t('settings-scope.synced.label') : t('settings-scope.local.label')}
        iconOnly
        onClick={handleClick}
      />
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
