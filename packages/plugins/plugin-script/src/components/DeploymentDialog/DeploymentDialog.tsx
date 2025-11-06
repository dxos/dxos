//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { LayoutAction, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { getSpace } from '@dxos/react-client/echo';
import { Button, Dialog, IconButton, useTranslation } from '@dxos/react-ui';

import { useCreateAndDeployScriptTemplates } from '../../hooks/useCreateAndDeployScriptTemplates';
import { meta } from '../../meta';
import { type Template } from '../../templates';

export const DEPLOYMENT_DIALOG = `${meta.id}/deployment/dialog`;

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
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  useEffect(() => {
    if (status === 'success') {
      // TODO(ZaymonFC): We can probably re-use this toast for normal script deployment.
      void dispatch(
        createIntent(LayoutAction.AddToast, {
          part: 'toast',
          subject: {
            id: `${meta.id}/deployment-success`,
            icon: 'ph--check--regular',
            duration: Infinity,
            title: ['script deployment toast label', { ns: meta.id, count: scriptTemplates.length }],
            description: ['script deployment toast description', { ns: meta.id, count: scriptTemplates.length }],
            closeLabel: ['script deployment toast close label', { ns: meta.id, count: scriptTemplates.length }],
          },
        }),
      );
      void dispatch(
        createIntent(LayoutAction.UpdateDialog, {
          part: 'dialog',
          options: { state: false },
        }),
      );
    }
    if (status === 'error') {
      void dispatch(
        createIntent(LayoutAction.UpdateDialog, {
          part: 'dialog',
          options: { state: false },
        }),
      );
      void dispatch(
        createIntent(LayoutAction.AddToast, {
          part: 'toast',
          subject: {
            id: `${meta.id}/deployment-error`,
            icon: 'ph--warning--regular',
            duration: Infinity,
            title: ['script deployment error toast label', { ns: meta.id, count: scriptTemplates.length }],
            description: ['script deployment error toast description', { ns: meta.id, count: scriptTemplates.length }],
            closeLabel: ['script deployment error toast close label', { ns: meta.id, count: scriptTemplates.length }],
          },
        }),
      );
    }
  }, [status, dispatch]);

  return (
    <Dialog.Content>
      <div className='flex justify-between items-center'>
        <Dialog.Title>{t('deployment dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <IconButton icon='ph--x--regular' size={4} label='Close' iconOnly density='fine' variant='ghost' />
        </Dialog.Close>
      </div>
      <div role='none' className='plb-4'>
        {/* TODO: Implement deployment logic and UI. */}
        <p>
          {t('deployment dialog scripts found message', {
            count: scriptTemplates.length,
          })}
        </p>
        <ul className='pbs-2'>
          {scriptTemplates.map((template) => {
            return <li key={template.id}>{template.name}</li>;
          })}
        </ul>
      </div>
      <div role='none' className='flex flex-row-reverse gap-1'>
        <Button variant='primary' onClick={handleCreateAndDeployScripts} disabled={status === 'pending'}>
          {status === 'pending'
            ? t('deployment dialog deploy functions pending button label', {
                count: scriptTemplates.length,
              })
            : t('deployment dialog deploy functions button label', {
                count: scriptTemplates.length,
              })}
        </Button>
        <Dialog.Close asChild disabled={status === 'pending'}>
          <Button disabled={status === 'pending'}>{t('deployment dialog skip button label')}</Button>
        </Dialog.Close>
      </div>
    </Dialog.Content>
  );
};

export default DeploymentDialog;
