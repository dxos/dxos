//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { composable } from '@dxos/ui-theme';
import { isTauri } from '@dxos/util';

import { meta } from '#meta';
import { InboxOperation } from '#operations';
import { type Mailbox } from '#types';

import { Initialize, InitializeAction } from '../../components';
import { GMAIL_PROVIDER_ID, IMAP_PROVIDER_ID } from '../../constants';

export type InitializeMailboxProps = {
  mailbox: Mailbox.Mailbox;
};

export const InitializeMailbox = composable<HTMLDivElement, InitializeMailboxProps>(
  ({ mailbox, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    return (
      <Initialize
        {...props}
        target={mailbox}
        noIntegrationMessage={t('no-integrations.label')}
        emptyMessage={t('empty-mailbox.message')}
        ref={forwardedRef}
      />
    );
  },
);

InitializeMailbox.displayName = 'InitializeMailbox';

export const InitializeMailboxAction = ({ mailbox }: InitializeMailboxProps) => {
  const { t } = useTranslation(meta.id);
  // IMAP support is gated to the native (Tauri) app for now — the in-tree
  // `node:net` shim only resolves inside the desktop webview. Web users
  // continue to see just the Gmail connect button.
  const showImap = isTauri();
  return (
    <>
      <InitializeAction
        target={mailbox}
        targetKey='mailbox'
        providerId={GMAIL_PROVIDER_ID}
        operation={InboxOperation.SyncMailbox}
        syncLabel={t('sync-mailbox.label')}
      />
      {showImap && (
        <InitializeAction
          target={mailbox}
          targetKey='mailbox'
          providerId={IMAP_PROVIDER_ID}
          operation={InboxOperation.SyncMailbox}
          syncLabel={t('sync-mailbox.label')}
        />
      )}
    </>
  );
};
