//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode, useCallback, useState } from 'react';

import { Surface, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { Integration } from '@dxos/plugin-integration/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, IconButton, Message, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '#meta';
import { InboxOperation } from '#operations';
import { type Mailbox } from '#types';

import { GMAIL_PROVIDER_ID } from '../../capabilities/integration-provider';

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
    const [syncing, setSyncing] = useState(false);

    const handleOpenSettings = useCallback(() => {
      if (db) {
        void invokePromise(LayoutOperation.Open, {
          subject: [`${getSpacePath(db.spaceId)}/settings/org.dxos.plugin.token-manager.integrations`],
          workspace: getSpacePath(db.spaceId),
        });
      }
    }, [db, invokePromise]);

    const integrations = useQuery(db, Filter.type(Integration.Integration));
    const mailboxIntegration = integrations.find((integration) =>
      integration.targets.some((target) => target.object?.dxn.asEchoDXN()?.echoId === mailbox.id),
    );

    const handleSync = useCallback(async () => {
      if (!mailboxIntegration) {return;}
      setSyncing(true);
      try {
        await invokePromise(InboxOperation.SyncMailbox, {
          integration: Ref.make(mailboxIntegration),
          mailbox: Ref.make(mailbox),
        });
      } finally {
        setSyncing(false);
      }
    }, [invokePromise, mailbox, mailboxIntegration]);

    let message: string | undefined;
    let action: ReactNode;
    // Gate sync on an Integration that directly references *this* mailbox,
    // not on the mere presence of a Google token in the space — a token from
    // an unrelated integration may have the wrong scopes (e.g. calendar-only)
    // and isn't a green light to sync mail.
    if (mailboxIntegration) {
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
      // Pass the current Mailbox through as `existingTarget` so the OAuth
      // flow wires Gmail up to *this* mailbox instead of creating a new one.
      const data = { providerId: GMAIL_PROVIDER_ID, existingTarget: Ref.make(mailbox) };
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
