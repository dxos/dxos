//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Mailbox as MailboxType, Message as MessageType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { MessageList } from './MessageList';

export const Mailbox: FC<{ mailbox: MailboxType }> = ({ mailbox }) => {
  const space = getSpaceForObject(mailbox);
  const { objects: messages = [] } = space?.db.query(MessageType.filter()) ?? {};

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <MessageList messages={messages} />
    </Main.Content>
  );
};
