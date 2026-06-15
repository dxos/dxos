//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';

import { meta } from '#meta';
import { InboxOperation } from '#types';
import { type Mailbox } from '#types';

import { Initialize, InitializeAction } from '../../components';
import { GMAIL_PROVIDER_ID } from '../../constants';

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
  return (
    <InitializeAction
      target={mailbox}
      targetKey='mailbox'
      providerId={GMAIL_PROVIDER_ID}
      operation={InboxOperation.GoogleMailSync}
      syncLabel={t('sync-mailbox.label')}
      notify={{
        success: ['sync-mailbox-success.title', { ns: meta.id }],
        error: ['sync-mailbox-error.title', { ns: meta.id }],
      }}
    />
  );
};
