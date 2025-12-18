//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { LayoutAction, createIntent } from '@dxos/app-framework';
import { type SurfaceComponentProps, useIntentDispatcher } from '@dxos/app-framework/react';
import { Obj, Ref } from '@dxos/echo';
import { Trigger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { AutomationAction } from '@dxos/plugin-automation/types';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';
import { type Mailbox } from '../../types';

export const MailboxSettings = ({ subject }: SurfaceComponentProps<Mailbox.Mailbox>) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);
  const triggers = useQuery(db, Filter.type(Trigger.Trigger));

  const handleConfigureSync = useCallback(() => {
    invariant(db);

    const syncTrigger = triggers.find(
      (trigger) => trigger.spec?.kind === 'timer' && trigger.input?.mailboxId === subject.id,
    );
    if (syncTrigger) {
      void dispatch(
        createIntent(LayoutAction.Open, {
          part: 'main',
          subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${db.spaceId}`],
          options: {
            workspace: db.spaceId,
          },
        }),
      );
    } else {
      void dispatch(
        createIntent(AutomationAction.CreateTriggerFromTemplate, {
          db,
          template: { type: 'timer', cron: '*/5 * * * *' },
          scriptName: 'Gmail',
          input: { mailbox: Ref.make(subject) },
        }),
      );
    }
  }, [dispatch, db, subject.id, triggers]);

  const handleConfigureSubscription = useCallback(() => {
    invariant(db);

    const subscriptionTrigger = triggers.find((trigger) => {
      if (trigger.spec?.kind === 'queue') {
        if (trigger.spec.queue === subject.queue.dxn.toString()) {
          return true;
        }
      }
      return false;
    });
    if (subscriptionTrigger) {
      void dispatch(
        createIntent(LayoutAction.Open, {
          part: 'main',
          subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${db.spaceId}`],
          options: {
            workspace: db.spaceId,
          },
        }),
      );
    } else {
      void dispatch(
        createIntent(AutomationAction.CreateTriggerFromTemplate, {
          db,
          template: { type: 'queue', queueDXN: subject.queue.dxn },
        }),
      );
    }
  }, [dispatch, db, subject.queue.dxn, triggers]);

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
