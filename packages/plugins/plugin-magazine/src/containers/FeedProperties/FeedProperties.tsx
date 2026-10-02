//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as Trigger from '@dxos/compute/Trigger';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { getRoutinesSettingsPath } from '@dxos/plugin-routine';
import { Form } from '@dxos/react-ui-form';
import * as Field from '@dxos/react-ui/Field';
import * as Flex from '@dxos/react-ui/Flex';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as IconButton from '@dxos/react-ui/IconButton';

import { meta } from '#meta';
import { FeedOperation, Subscription } from '#types';

export type FeedPropertiesProps = AppSurface.ObjectPropertiesProps<Subscription.Subscription>;

export const FeedProperties = ({ subject }: FeedPropertiesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { invokePromise } = AppHooks.useOperationInvoker();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);
  const [pending, setPending] = useState(false);

  const childTriggers = useQuery(
    db,
    Query.select(Filter.and(Filter.type(Trigger.Trigger), Filter.childOf(subject, { transitive: false }))).debugLabel(
      'plugin-magazine.FeedProperties.syncTrigger',
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
          runnable: Ref.make(operation),
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
      subject: [getRoutinesSettingsPath(db.spaceId)],
      workspace: GraphPath.getSpacePath(db.spaceId),
    });
  }, [invokePromise, db]);

  return (
    <Form.FieldSet>
      <Field.Root>
        <Field.Label>{t('feed-sync.label')}</Field.Label>
        <Flex.Root align='center'>
          <Field.Switch
            checked={syncEnabled ?? false}
            disabled={pending}
            onCheckedChange={() => {
              void handleToggleSync();
            }}
          />
          {syncTrigger && (
            <IconButton.Root
              iconOnly
              icon='ph--gear--regular'
              label={t('view-trigger.label')}
              onClick={handleViewTrigger}
            />
          )}
        </Flex.Root>
      </Field.Root>
    </Form.FieldSet>
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

FeedProperties.displayName = 'FeedProperties';
