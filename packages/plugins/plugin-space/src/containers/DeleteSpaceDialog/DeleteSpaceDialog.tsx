//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';
import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { SpaceOperation } from '#types';

import { SpaceNamespace } from '../../namespace.ts';

export type DeleteSpaceDialogProps = {
  space: Space;
};

/** Asks before a space is deleted, since the deletion reaches every device and member. */
export const DeleteSpaceDialog = ({ space }: DeleteSpaceDialogProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();

  // Wired to an onClick handler: must resolve (never reject) so it can't trigger an unhandled rejection.
  const handleDelete = useCallback(async () => {
    await invokePromise(LayoutOperation.UpdateDialog, { state: false });
    const { error } = await invokePromise(SpaceOperation.Delete, { space });
    if (error) {
      log.catch(error, { stage: 'delete space', spaceId: space.id });
      void invokePromise(LayoutOperation.AddToast, {
        id: `${space.id}-delete-failed`,
        title: t('delete-space-failed.message'),
        icon: 'ph--warning--regular',
      });
    }
  }, [space, invokePromise, t]);

  return (
    <AlertDialog.Content data-testid='spacePlugin.deleteSpaceDialog'>
      <AlertDialog.Body>
        <AlertDialog.Title>{t('delete-space-confirm.title')}</AlertDialog.Title>
        <AlertDialog.Description>{t('delete-space-confirm.description')}</AlertDialog.Description>
      </AlertDialog.Body>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>{t('cancel.label')}</AlertDialog.Cancel>
        <AlertDialog.Action variant='destructive' onClick={handleDelete} data-testid='spacePlugin.deleteSpaceConfirm'>
          {t('delete-space.label')}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
};
