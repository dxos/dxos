//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { List } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { InvitationListItem, type InvitationListItemProps } from './InvitationListItem';
import { type SharedInvitationListProps } from './InvitationListProps';

export interface InvitationListProps
  extends Omit<InvitationListItemProps, 'invitation' | 'value'>,
    Pick<SharedInvitationListProps, 'send'> {
  invitations: CancellableInvitationObservable[];
  InvitationListItem?: React.ComponentType<InvitationListItemProps>;
  className?: string;
}

export const InvitationList = ({ invitations, send, ...invitationProps }: InvitationListProps) => {
  const { className, InvitationListItem: Item = InvitationListItem } = invitationProps;
  return (
    <List classNames={mx('flex flex-col gap-2', className)}>
      {invitations.map((invitation) => {
        const value = invitation.get().invitationId;
        return <Item key={value} send={send} invitation={invitation} {...invitationProps} />;
      })}
    </List>
  );
};
