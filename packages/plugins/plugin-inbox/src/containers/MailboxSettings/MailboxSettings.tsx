//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Feed, Obj, Ref } from '@dxos/echo';
import { Feed as FeedModule } from '@dxos/echo';
import { Trigger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { AutomationOperation } from '@dxos/plugin-automation/types';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export const MailboxSettings = ({ subject }: SurfaceComponentProps<Feed.Feed>) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);
  const triggers = useQuery(db, Filter.type(Trigger.Trigger));

  // Get the feed's queue DXN from meta keys.
  const queueDxn = useMemo(() => FeedModule.getQueueDxn(subject), [subject]);

  const handleConfigureSync = useCallback(() => {
    invariant(db);

    const syncTrigger = triggers.find(
      (trigger) => trigger.spec?.kind === 'timer' && trigger.input?.feedId === subject.id,
    );
    if (syncTrigger) {
      void invokePromise(LayoutOperation.Open, {
        subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${db.spaceId}`],
        workspace: db.spaceId,
      });
    } else {
      void invokePromise(AutomationOperation.CreateTriggerFromTemplate, {
        db,
        template: { type: 'timer', cron: '*/5 * * * *' },
        scriptName: 'Gmail',
        input: { feed: Ref.make(subject) },
      });
    }
  }, [invokePromise, db, subject.id, triggers, subject]);

  const handleConfigureSubscription = useCallback(() => {
    invariant(db);

    const subscriptionTrigger = triggers.find((trigger) => {
      if (trigger.spec?.kind === 'queue' && queueDxn) {
        if (trigger.spec.queue === queueDxn.toString()) {
          return true;
        }
      }
      return false;
    });
    if (subscriptionTrigger) {
      void invokePromise(LayoutOperation.Open, {
        subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${db.spaceId}`],
        workspace: db.spaceId,
      });
    } else if (queueDxn) {
      void invokePromise(AutomationOperation.CreateTriggerFromTemplate, {
        db,
        template: { type: 'queue', queueDXN: queueDxn },
      });
    }
  }, [invokePromise, db, queueDxn, triggers]);

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
