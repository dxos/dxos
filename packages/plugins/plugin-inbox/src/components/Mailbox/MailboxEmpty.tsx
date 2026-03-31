//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Surface, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';

import { meta } from '../../meta';
import { InboxOperation } from '../../operations';
import { type Mailbox } from '../../types';

export const MailboxEmpty = ({ mailbox }: { mailbox: Mailbox.Mailbox }) => {
  const db = Obj.getDatabase(mailbox);
  const tokens = useQuery(db, Filter.type(AccessToken.AccessToken));
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const pluginManager = usePluginManager();
  const [syncing, setSyncing] = useState(false);

  const openSpaceSettings = useCallback(() => {
    if (db) {
      void invokePromise(LayoutOperation.Open, {
        subject: [`${getSpacePath(db.spaceId)}/settings/org.dxos.plugin.token-manager.integrations`],
        workspace: getSpacePath(db.spaceId),
      });
    }
  }, [db, invokePromise]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await invokePromise(InboxOperation.SyncMailbox, { mailbox });
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, mailbox]);

  const gmailToken = tokens.find((token) => token.source.includes('google'));
  if (!gmailToken) {
    const authSurfaceData = { source: 'google.com' };
    const hasAuthSurface = Surface.isAvailable(pluginManager.capabilities, {
      role: 'integration--auth',
      data: authSurfaceData,
    });

    if (hasAuthSurface) {
      return (
        <div className='flex flex-col items-center gap-4 p-8'>
          <p className='text-description'>{t('no integrations label')}</p>
          <Surface.Surface role='integration--auth' data={authSurfaceData} limit={1} />
        </div>
      );
    }

    return (
      <div className='flex flex-col items-center gap-4 p-8'>
        <p className='text-description'>{t('no integrations label')}</p>
        <Button onClick={openSpaceSettings}>{t('manage integrations button label')}</Button>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 p-8'>
      <p className='text-description'>{t('empty mailbox message')}</p>
      <Button onClick={handleSync} disabled={syncing}>
        {t('sync mailbox label')}
      </Button>
    </div>
  );
};
