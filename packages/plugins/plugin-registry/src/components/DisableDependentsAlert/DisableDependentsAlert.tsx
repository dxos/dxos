//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { AlertDialog, Button, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import type { PluginRef } from '../PluginDetail/PluginDetail';

export type DisableDependentsAlertProps = {
  open: boolean;
  pluginName: string;
  dependents: readonly PluginRef[];
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation prompt shown when a user toggles off a plugin that has
 * currently-enabled dependents. Lists the dependents and confirms a
 * cascading disable. Used by both the plugin detail surface and the list
 * surface so the policy is consistent regardless of toggle location.
 */
export const DisableDependentsAlert = ({
  open,
  pluginName,
  dependents,
  onCancel,
  onConfirm,
}: DisableDependentsAlertProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <AlertDialog.Overlay>
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
              <Button onClick={onCancel}>{t('cancel.label')}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant='primary' onClick={onConfirm}>
                {t('disable-dependents-dialog.confirm.label')}
              </Button>
            </AlertDialog.Action>
          </AlertDialog.ActionBar>
        </AlertDialog.Content>
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};
