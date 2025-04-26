//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { FunctionTrigger, TriggerKind } from '@dxos/functions';
import { AutomationAction } from '@dxos/plugin-automation/types';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';

import { INBOX_PLUGIN } from '../../meta';
import { type MailboxType } from '../../types';

export const MailboxObjectSettings = ({ object }: { object: MailboxType }) => {
  const { t } = useTranslation(INBOX_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = useMemo(() => getSpace(object), [object]);
  const triggers = useQuery(space, Filter.schema(FunctionTrigger));

  const [showHandleSync, setShowHandleSync] = useState(true);
  useEffect(() => {
    const syncTrigger = triggers.find((trigger) => trigger.meta?.mailboxId === object.id);
    if (syncTrigger) {
      setShowHandleSync(false);
    }
  }, [triggers]);

  const [showHandleSubscription, setShowHandleSubscription] = useState(true);
  useEffect(() => {
    const subscriptionTrigger = triggers.find((trigger) => {
      if (trigger.spec?.type === TriggerKind.Queue) {
        if (trigger.spec.queue === object.queue.dxn.toString()) {
          return true;
        }
      }
      return false;
    });
    if (subscriptionTrigger) {
      setShowHandleSubscription(false);
    }
  }, [triggers]);

  const handleConfigureSync = useCallback(() => {
    void dispatch(
      createIntent(AutomationAction.CreateTriggerFromTemplate, {
        template: { type: 'gmail-sync', mailboxId: object.id },
      }),
    );
  }, [dispatch, object.id]);

  const handleConfigureSubscription = useCallback(() => {
    void dispatch(
      createIntent(AutomationAction.CreateTriggerFromTemplate, {
        template: { type: 'queue', queueDXN: object.queue.dxn },
      }),
    );
  }, [dispatch, object.queue.dxn]);

  if (!showHandleSync && !showHandleSubscription) {
    return null;
  }

  return (
    <div className='p-1 flex flex-row gap-1'>
      {showHandleSync && (
        <Button onClick={handleConfigureSync}>{t('mailbox object settings configure sync button label')}</Button>
      )}
      {showHandleSubscription && (
        <Button onClick={handleConfigureSubscription}>
          {t('mailbox object settings configure subscription button label')}
        </Button>
      )}
    </div>
  );
};
