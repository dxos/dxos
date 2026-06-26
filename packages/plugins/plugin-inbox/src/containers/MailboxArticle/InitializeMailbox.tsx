//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Mailbox } from '#types';

import { Initialize, InitializeAction } from '../../components';
import { GMAIL_PROVIDER_ID, JMAP_PROVIDER_ID } from '../../constants';

export type InitializeMailboxProps = {
  mailbox: Mailbox.Mailbox;
};

export const InitializeMailbox = composable<HTMLDivElement, InitializeMailboxProps>(
  ({ mailbox, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
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
  const { t } = useTranslation(meta.profile.key);
  // The sync op is resolved from the bound connection's connector (see `useTargetSync`); `connectorIds`
  // only seeds the connect dropdown shown when the mailbox isn't connected yet.
  return (
    <InitializeAction
      target={mailbox}
      connectorIds={[GMAIL_PROVIDER_ID, JMAP_PROVIDER_ID]}
      syncLabel={t('sync-mailbox.label')}
      notify={{
        success: ['sync-mailbox-success.title', { ns: meta.profile.key }],
        error: ['sync-mailbox-error.title', { ns: meta.profile.key }],
      }}
    />
  );
};
