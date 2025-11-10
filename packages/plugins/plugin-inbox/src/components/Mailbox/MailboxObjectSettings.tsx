//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { LayoutAction, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Trigger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { AutomationAction } from '@dxos/plugin-automation/types';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';
import { type Mailbox } from '../../types';

export const MailboxObjectSettings = ({ object }: { object: Mailbox.Mailbox }) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = useMemo(() => getSpace(object), [object]);
  const triggers = useQuery(space, Filter.type(Trigger.Trigger));

  const handleConfigureSync = useCallback(() => {
    invariant(space);

    const syncTrigger = triggers.find(
      (trigger) => trigger.spec?.kind === 'timer' && trigger.input?.mailboxId === object.id,
    );
    if (syncTrigger) {
      void dispatch(
        createIntent(LayoutAction.Open, {
          part: 'main',
          subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`],
          options: {
            workspace: space.id,
          },
        }),
      );
    } else {
      void dispatch(
        createIntent(AutomationAction.CreateTriggerFromTemplate, {
          space,
          template: { type: 'timer', cron: '*/30 * * * * *' },
          scriptName: 'Gmail',
          input: { mailboxId: Obj.getDXN(object).toString() },
        }),
      );
    }
  }, [dispatch, space, object.id, triggers]);

  const handleConfigureSubscription = useCallback(() => {
    invariant(space);

    const subscriptionTrigger = triggers.find((trigger) => {
      if (trigger.spec?.kind === 'queue') {
        if (trigger.spec.queue === object.queue.dxn.toString()) {
          return true;
        }
      }
      return false;
    });
    if (subscriptionTrigger) {
      void dispatch(
        createIntent(LayoutAction.Open, {
          part: 'main',
          subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`],
          options: {
            workspace: space.id,
          },
        }),
      );
    } else {
      void dispatch(
        createIntent(AutomationAction.CreateTriggerFromTemplate, {
          space,
          template: { type: 'queue', queueDXN: object.queue.dxn },
        }),
      );
    }
  }, [dispatch, space, object.queue.dxn, triggers]);

  // TODO(wittjosiah): More than one trigger may be desired, particularly for subscription.
  //   Distinguish between configuring existing triggers and adding new ones.
  return (
    <div className='flex flex-col gap-4'>
      <h2>{t('mailbox sync label')}</h2>
      <div className='p-1 flex flex-row gap-1'>
        <Button onClick={handleConfigureSync}>{t('mailbox object settings configure sync button label')}</Button>
        <Button onClick={handleConfigureSubscription}>
          {t('mailbox object settings configure subscription button label')}
        </Button>
      </div>
    </div>
  );
};
