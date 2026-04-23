//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';

import { useSyncTrigger } from '#hooks';
import { meta } from '#meta';
import { Mailbox } from '#types';

export const MailboxProperties = ({ subject }: AppSurface.ObjectPropertiesProps<Mailbox.Mailbox>) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);

  const { syncEnabled, syncTrigger, pending, handleToggleSync } = useSyncTrigger({
    db,
    subject,
    functionKey: 'org.dxos.function.inbox.google-mail-sync',
    input: { restrictedMode: true },
  });

  const handleViewTrigger = useCallback(() => {
    if (!db) {
      return;
    }

    void invokePromise(LayoutOperation.Open, {
      subject: [`${getSpacePath(db.spaceId)}/settings/org.dxos.plugin.automation.automations`],
      workspace: getSpacePath(db.spaceId),
    });
  }, [invokePromise, db]);

  return (
    <Input.Root>
      <Input.Label>{t('mailbox-sync.label')}</Input.Label>
      <div role='none' className='flex flex-row items-center'>
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
  );
};
