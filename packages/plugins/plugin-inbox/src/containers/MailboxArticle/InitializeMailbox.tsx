//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';

import { Initialize } from '#components';
import { Mailbox } from '#types';

import { InboxNamespace } from '../../namespace.ts';

export type InitializeMailboxProps = {
  mailbox: Mailbox.Mailbox;
};

export const InitializeMailbox = Util.composable<HTMLDivElement, InitializeMailboxProps>(
  ({ mailbox, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(InboxNamespace.key);
    return (
      <Initialize
        {...props}
        target={mailbox}
        noConnectionsMessage={t('no-connections.label')}
        emptyMessage={t('empty-mailbox.message')}
        ref={forwardedRef}
      />
    );
  },
);

InitializeMailbox.displayName = 'InitializeMailbox';
