//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';

import { Initialize } from '#components';
import { meta } from '#meta';
import { Mailbox } from '#types';

export type InitializeMailboxProps = {
  mailbox: Mailbox.Mailbox;
};

export const InitializeMailbox = Util.composable<HTMLDivElement, InitializeMailboxProps>(
  ({ mailbox, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
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
