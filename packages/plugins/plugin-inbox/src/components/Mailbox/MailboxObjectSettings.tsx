//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { AutomationAction } from '@dxos/plugin-automation/types';
import { Button } from '@dxos/react-ui';

import { type MailboxType } from '../../types';

export const MailboxObjectSettings = ({ object }: { object: MailboxType }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleConfigureSync = () => {
    void dispatch(
      createIntent(AutomationAction.CreateTriggerFromTemplate, {
        template: { type: 'gmail-sync', mailboxId: object.id },
      }),
    );
  };

  const handleConfigureSubscription = () => {
    void dispatch(
      createIntent(AutomationAction.CreateTriggerFromTemplate, {
        template: { type: 'queue', queueDXN: object.queue.dxn },
      }),
    );
  };

  return (
    <div className='p-1 flex flex-row gap-1'>
      <Button onClick={handleConfigureSync}>Configure sync</Button>
      <Button onClick={handleConfigureSubscription}>Configure mailbox subscription</Button>
    </div>
  );
};
