//
// Copyright 2023 DXOS.org
//
import React, { type ComponentType } from 'react';

import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';
import { List } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { InvitationListItem, type InvitationListItemProps } from './InvitationListItem';
import { type SharedInvitationListProps } from './InvitationListProps';

export interface InvitationListProps
  extends Omit<InvitationListItemProps, 'invitation' | 'value'>,
    Pick<SharedInvitationListProps, 'send'> {
  invitations: CancellableInvitationObservable[];
  InvitationListItem?: ComponentType<InvitationListItemProps>;
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
