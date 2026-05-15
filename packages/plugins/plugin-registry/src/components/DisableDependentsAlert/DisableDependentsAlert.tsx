//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { AlertDialog, Button, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

type Dependent = { id: string; name: string };

export type DisableDependentsAlertProps = {
  pluginName: string;
  dependents: readonly Dependent[];
  onConfirm: () => void;
};

/**
 * Confirmation prompt shown when a user toggles off a plugin that has
 * currently-enabled dependents. Rendered inside the layout's dialog surface
 * (via `LayoutOperation.UpdateDialog` with `type: 'alert'`), which provides
 * the `AlertDialog.Root` / `Overlay` wrappers — this component renders only
 * the content. `onConfirm` runs the cascade disable and closes the dialog;
 * cancel is handled by the layout's open-change wiring.
 */
export const DisableDependentsAlert = ({ pluginName, dependents, onConfirm }: DisableDependentsAlertProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <AlertDialog.Content>
      <AlertDialog.Body>
        <AlertDialog.Title>{t('disable-dependents-dialog.title')}</AlertDialog.Title>
        <AlertDialog.Description>
          {t('disable-dependents-dialog.description', { plugin: pluginName })}
        </AlertDialog.Description>
        <ul className='mt-2 list-disc pl-6 text-sm text-description'>
          {dependents.map((dependent) => (
            <li key={dependent.id} title={dependent.id}>
              {dependent.name}
            </li>
          ))}
        </ul>
      </AlertDialog.Body>
      <AlertDialog.ActionBar>
        <div className='grow' />
        <AlertDialog.Cancel asChild>
          <Button>{t('cancel.label')}</Button>
        </AlertDialog.Cancel>
        <AlertDialog.Action asChild>
          <Button variant='primary' onClick={onConfirm}>
            {t('disable-dependents-dialog.confirm.label')}
          </Button>
        </AlertDialog.Action>
      </AlertDialog.ActionBar>
    </AlertDialog.Content>
  );
};
