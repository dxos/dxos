//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Connector } from '@dxos/plugin-connector';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { useSyncTrigger } from '#hooks';
import { meta } from '#meta';
import { Mailbox } from '#types';

export type MailboxPropertiesProps = AppSurface.ObjectPropertiesProps<Mailbox.Mailbox>;

export const MailboxProperties = ({ subject }: MailboxPropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);
  const connectors = useCapabilities(Connector);

  const { syncEnabled, syncTrigger, pending, handleToggleSync } = useSyncTrigger({ db, subject, connectors });

  const handleViewTrigger = useCallback(() => {
    if (!db) {
      return;
    }

    void invokePromise(LayoutOperation.Open, {
      subject: [Paths.getSpacePath(db.spaceId, 'settings', 'org.dxos.plugin.routine.routines')],
      workspace: Paths.getSpacePath(db.spaceId),
    });
  }, [invokePromise, db]);

  return (
    <Form.Section>
      <Input.Root>
        <Input.Label>{t('mailbox-sync.label')}</Input.Label>
        <div className='flex flex-row items-center'>
          {/* TODO(burdon): Pad Switch like button/icon (square with padding). */}
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

MailboxProperties.displayName = 'MailboxProperties';
