//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { getSpace } from '@dxos/react-client/echo';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';
import { type AccessToken } from '@dxos/types';

import { useCreateAndDeployScriptTemplates } from '#hooks';
import { meta } from '#meta';
import { type Template } from '../../templates';

// TODO(ZaymonFC):
//  - Show activity and feedback to the user.
//  - Only take an array of templateIds and get the name from the data.
//  - Pending / onError states.

export type DeploymentDialogProps = {
  accessToken: AccessToken.AccessToken;
  scriptTemplates: Template[];
};

export const DeploymentDialog = ({ accessToken, scriptTemplates }: DeploymentDialogProps) => {
  const { t } = useTranslation(meta.id);
  const space = useMemo(() => getSpace(accessToken), [accessToken]);

  // TODO(ZaymonFC): Thinking further. All of this should get moved to intents to run async in the background.
  //   Deployment shouldn't be tied to the lifecycle of the dialogue component.
  const { handleCreateAndDeployScripts, status } = useCreateAndDeployScriptTemplates(space, scriptTemplates);
  const { invokePromise } = useOperationInvoker();

  useEffect(() => {
    if (status === 'success') {
      // TODO(ZaymonFC): We can probably re-use this toast for normal script deployment.
      void invokePromise(LayoutOperation.AddToast, {
        id: `${meta.id}.deployment-success`,
        icon: 'ph--check--regular',
        duration: Infinity,
        title: ['script-deployment-toast.label', { ns: meta.id, count: scriptTemplates.length }],
        description: ['script-deployment-toast.description', { ns: meta.id, count: scriptTemplates.length }],
        closeLabel: ['script-deployment-toast-close.label', { ns: meta.id, count: scriptTemplates.length }],
      });
      void invokePromise(LayoutOperation.UpdateDialog, { state: false });
    }
    if (status === 'error') {
      void invokePromise(LayoutOperation.UpdateDialog, { state: false });
      void invokePromise(LayoutOperation.AddToast, {
        id: `${meta.id}.deployment-error`,
        icon: 'ph--warning--regular',
        duration: Infinity,
        title: ['script-deployment-error-toast.label', { ns: meta.id, count: scriptTemplates.length }],
        description: ['script-deployment-error-toast.description', { ns: meta.id, count: scriptTemplates.length }],
        closeLabel: ['script-deployment-error-toast-close.label', { ns: meta.id, count: scriptTemplates.length }],
      });
    }
  }, [status, invokePromise]);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('deployment-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <p>
          {t('deployment-dialog-scripts-found.message', {
            count: scriptTemplates.length,
          })}
        </p>
        <ul className='pt-2'>
          {scriptTemplates.map((template) => {
            return <li key={template.id}>{template.name}</li>;
          })}
        </ul>
      </Dialog.Body>
      <Dialog.ActionBar>
        <Dialog.Close asChild>
          <Button disabled={status === 'pending'}>{t('deployment-dialog-skip-button.label')}</Button>
        </Dialog.Close>
        <Button variant='primary' onClick={handleCreateAndDeployScripts} disabled={status === 'pending'}>
          {status === 'pending'
            ? t('deployment-dialog-deploy-functions-pending-button.label', {
                count: scriptTemplates.length,
              })
            : t('deployment-dialog-deploy-functions-button.label', {
                count: scriptTemplates.length,
              })}
        </Button>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};
