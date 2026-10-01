//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

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
  const { t } = useTranslation(meta.profile.key);
  const resolveName = onResolvePluginName ?? ((id: string) => id);
  return (
    <Next.AlertDialog.Content>
      <Next.AlertDialog.Body>
        <Next.AlertDialog.Title>{t('disable-dependents-dialog.title')}</Next.AlertDialog.Title>
        <Next.AlertDialog.Description>
          {t('disable-dependents-dialog.description', { plugin: resolveName(pluginId) })}
        </Next.AlertDialog.Description>
        <ul className='mt-2 list-disc pl-6 text-sm text-description'>
          {dependents.map((dependentId) => (
            <li key={dependentId} title={dependentId}>
              {resolveName(dependentId)}
            </li>
          ))}
        </ul>
      </Next.AlertDialog.Body>
      <Next.AlertDialog.Footer>
        <div className='grow' />
        <Next.AlertDialog.Cancel>{t('cancel.label')}</Next.AlertDialog.Cancel>
        <Next.AlertDialog.Action variant='primary' onClick={onConfirm}>
          {t('disable-dependents-dialog.confirm.label')}
        </Next.AlertDialog.Action>
      </Next.AlertDialog.Footer>
    </Next.AlertDialog.Content>
  );
};
