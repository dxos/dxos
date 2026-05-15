//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { AlertDialog, Button, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type DisableDependentsAlertProps = {
  /** Id of the plugin the user requested to disable. */
  pluginId: string;
  /** Ids of the currently-enabled dependents that would also be disabled. */
  dependents: readonly string[];
  /**
   * Resolves a plugin id to its display name. The component delegates this so
   * the parent can choose how to source names (typically the registered
   * `Plugin.Meta.name`). Falls back to the id when omitted.
   */
  onResolvePluginName?: (pluginId: string) => string;
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
export const DisableDependentsAlert = ({
  pluginId,
  dependents,
  onResolvePluginName,
  onConfirm,
}: DisableDependentsAlertProps) => {
  const { t } = useTranslation(meta.id);
  const resolveName = onResolvePluginName ?? ((id: string) => id);
  return (
    <AlertDialog.Content>
      <AlertDialog.Body>
        <AlertDialog.Title>{t('disable-dependents-dialog.title')}</AlertDialog.Title>
        <AlertDialog.Description>
          {t('disable-dependents-dialog.description', { plugin: resolveName(pluginId) })}
        </AlertDialog.Description>
        <ul className='mt-2 list-disc pl-6 text-sm text-description'>
          {dependents.map((dependentId) => (
            <li key={dependentId} title={dependentId}>
              {resolveName(dependentId)}
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
