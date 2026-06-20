//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Operation, Trigger } from '@dxos/compute';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { FeedOperation, Subscription } from '#types';

export type FeedPropertiesProps = AppSurface.ObjectPropertiesProps<Subscription.Subscription>;

export const FeedProperties = ({ subject }: FeedPropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);
  const [pending, setPending] = useState(false);

  const childTriggers = useQuery(
    db,
    Query.select(Filter.and(Filter.type(Trigger.Trigger), Filter.childOf(subject, { transitive: false }))).debugLabel(
      'plugin-feed.FeedProperties.syncTrigger',
    ),
  );

  const syncTrigger = useMemo(() => childTriggers.find((trigger) => trigger.spec?.kind === 'timer'), [childTriggers]);

  const [syncEnabled, setSyncEnabled] = useObject(syncTrigger, 'enabled');

  const handleToggleSync = useCallback(async () => {
    if (!db) {
      return;
    }

    if (syncTrigger) {
      setSyncEnabled((enabled) => !enabled);
      return;
    }

    setPending(true);
    try {
      const operation = await ensureSyncFeedOperation(db);
      db.add(
        Trigger.make({
          [Obj.Parent]: subject,
          enabled: true,
          spec: Trigger.specTimer('*/5 * * * *'),
          function: Ref.make(operation),
          input: { feed: db.makeRef(Obj.getURI(subject)) },
        }),
      );
    } finally {
      setPending(false);
    }
  }, [syncTrigger, db, subject, setSyncEnabled]);

  const handleViewTrigger = useCallback(() => {
    if (!db) {
      return;
    }

    void invokePromise(LayoutOperation.Open, {
      subject: [Paths.getSpacePath(db.spaceId, 'settings', 'org.dxos.plugin.automation.automations')],
      workspace: Paths.getSpacePath(db.spaceId),
    });
  }, [invokePromise, db]);

  return (
    <Form.Section>
      <Input.Root>
        <Input.Label>{t('feed-sync.label')}</Input.Label>
        <div className='flex flex-row items-center'>
          <Input.Switch
            checked={syncEnabled ?? false}
            disabled={pending}
            onCheckedChange={() => {
              void handleToggleSync();
            }}
          />
          {syncTrigger && (
            <IconButton iconOnly icon='ph--gear--regular' label={t('view-trigger.label')} onClick={handleViewTrigger} />
          )}
        </div>
      </Input.Root>
    </Form.Section>
  );
};

const ensureSyncFeedOperation = async (db: NonNullable<ReturnType<typeof Obj.getDatabase>>) => {
  const existing = await db
    .query(Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(FeedOperation.SyncFeed.meta.key)))
    .run();
  const [existingOperation] = existing;
  if (existingOperation) {
    return existingOperation;
  }

  return db.add(Operation.serialize(FeedOperation.SyncFeed));
};
