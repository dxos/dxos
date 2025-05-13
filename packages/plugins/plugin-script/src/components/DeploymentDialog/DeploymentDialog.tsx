//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { getSpace } from '@dxos/react-client/echo';
import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';
import { type DataType } from '@dxos/schema';

import { useCreateAndDeployScriptTemplates } from '../../hooks/useCreateAndDeployScriptTemplates';
import { SCRIPT_PLUGIN } from '../../meta';
import { type Template } from '../../templates';

export const DEPLOYMENT_DIALOG = `${SCRIPT_PLUGIN}/deployment/dialog`;

// TODO(ZaymonFC):
//   - Show activity and feedback to the user.
//   - Only take an array of templateIds and get the name from the data.
//   - Pending / onError states.

type DeploymentDialogProps = {
  accessToken: DataType.AccessToken;
  scriptTemplates: Template[];
};

export const DeploymentDialog = ({ accessToken, scriptTemplates }: DeploymentDialogProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
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
            id: `${SCRIPT_PLUGIN}/deployment-success`,
            icon: 'ph--check--regular',
            duration: Infinity,
            title: ['script deployment toast label', { ns: SCRIPT_PLUGIN, count: scriptTemplates.length }],
            description: ['script deployment toast description', { ns: SCRIPT_PLUGIN, count: scriptTemplates.length }],
            closeLabel: ['script deployment toast close label', { ns: SCRIPT_PLUGIN, count: scriptTemplates.length }],
          },
        }),
      );
      void dispatch(createIntent(LayoutAction.UpdateDialog, { part: 'dialog', options: { state: false } }));
    }
    if (status === 'error') {
      void dispatch(createIntent(LayoutAction.UpdateDialog, { part: 'dialog', options: { state: false } }));
      void dispatch(
        createIntent(LayoutAction.AddToast, {
          part: 'toast',
          subject: {
            id: `${SCRIPT_PLUGIN}/deployment-error`,
            icon: 'ph--warning--regular',
            duration: Infinity,
            title: ['script deployment error toast label', { ns: SCRIPT_PLUGIN, count: scriptTemplates.length }],
            description: [
              'script deployment error toast description',
              { ns: SCRIPT_PLUGIN, count: scriptTemplates.length },
            ],
            closeLabel: [
              'script deployment error toast close label',
              { ns: SCRIPT_PLUGIN, count: scriptTemplates.length },
            ],
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
          <Button density='fine' variant='ghost'>
            <Icon icon='ph--x--regular' size={4} />
          </Button>
        </Dialog.Close>
      </div>
      <div role='none' className='plb-4'>
        {/* TODO: Implement deployment logic and UI. */}
        <p>{t('deployment dialog scripts found message', { count: scriptTemplates.length })}</p>
        <ul className='pbs-2'>
          {scriptTemplates.map((template) => {
            return <li key={template.id}>{template.name}</li>;
          })}
        </ul>
      </div>
      <div role='none' className='flex flex-row-reverse gap-1'>
        <Button variant='primary' onClick={handleCreateAndDeployScripts} disabled={status === 'pending'}>
          {status === 'pending'
            ? t('deployment dialog deploy functions pending button label', { count: scriptTemplates.length })
            : t('deployment dialog deploy functions button label', { count: scriptTemplates.length })}
        </Button>
        <Dialog.Close asChild disabled={status === 'pending'}>
          <Button disabled={status === 'pending'}>{t('deployment dialog skip button label')}</Button>
        </Dialog.Close>
      </div>
    </Dialog.Content>
  );
};

export default DeploymentDialog;
