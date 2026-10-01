//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { getRoutinesSettingsPath } from '@dxos/plugin-routine';
import { Flex, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form/next';
import { Next } from '@dxos/react-ui/next';

import { useSyncTrigger } from '#hooks';
import { meta } from '#meta';
import { Mailbox } from '#types';

export type MailboxPropertiesProps = AppSurface.ObjectPropertiesProps<Mailbox.Mailbox>;

export const MailboxProperties = ({ subject }: MailboxPropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);
  const connectors = useCapabilities(ConnectorSpec.Connector);

  const { syncEnabled, syncTrigger, pending, handleToggleSync } = useSyncTrigger({ db, subject, connectors });

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
      <Next.Field.Root>
        <Next.Field.Label>{t('mailbox-sync.label')}</Next.Field.Label>
        <Flex align='center'>
          {/* TODO(burdon): Pad Switch like button/icon (square with padding). */}
          <Next.Switch
            checked={syncEnabled ?? false}
            disabled={pending}
            onCheckedChange={() => {
              void handleToggleSync();
            }}
          />
          {syncTrigger && (
            <Next.Button
              iconOnly
              icon='ph--gear--regular'
              label={t('view-trigger.label')}
              onClick={handleViewTrigger}
            />
          )}
        </Flex>
      </Next.Field.Root>
    </Form.FieldSet>
  );
};

MailboxProperties.displayName = 'MailboxProperties';
