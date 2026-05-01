//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode, useCallback, useState } from 'react';

import { Surface, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, IconButton, Message, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '#meta';
import { InboxOperation } from '#operations';
import { type Mailbox } from '#types';

export type InitializeMailboxProps = {
  mailbox: Mailbox.Mailbox;
};

/**
 * Empty state for the mailbox: guides the user through connecting an integration or syncing.
 */
export const InitializeMailbox = composable<HTMLDivElement, InitializeMailboxProps>(
  ({ mailbox, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { invokePromise } = useOperationInvoker();
    const pluginManager = usePluginManager();
    const db = Obj.getDatabase(mailbox);
    const tokens = useQuery(db, Filter.type(AccessToken.AccessToken));
    const [syncing, setSyncing] = useState(false);

    const handleOpenSettings = useCallback(() => {
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

    let message: string | undefined;
    let action: ReactNode;
    const token = tokens.find((token) => token.source.includes('google'));
    if (token) {
      action = (
        <IconButton
          disabled={syncing}
          variant='primary'
          iconClassNames={syncing ? 'animate-spin' : undefined}
          icon={syncing ? 'ph--spinner-gap--regular' : 'ph--arrow-clockwise--regular'}
          label={t('sync-mailbox.label')}
          onClick={handleSync}
        />
      );
    } else {
      message = t('no-integrations.label');
      const data = { providerId: 'gmail' };
      action = Surface.isAvailable(pluginManager.capabilities, { role: 'integration--auth', data }) ? (
        <Surface.Surface role='integration--auth' data={data} limit={1} />
      ) : (
        <Button variant='primary' onClick={handleOpenSettings}>
          {t('manage-integrations-button.label')}
        </Button>
      );
    }

    return (
      <div {...composableProps(props, { classNames: 'flex flex-col items-center gap-4 p-8' })} ref={forwardedRef}>
        {message && (
          <Message.Root valence='neutral'>
            <Message.Title>{message}</Message.Title>
          </Message.Root>
        )}
        {action}
      </div>
    );
  },
);

InitializeMailbox.displayName = 'InitializeMailbox';
