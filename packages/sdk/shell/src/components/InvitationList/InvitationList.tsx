//
// Copyright 2023 DXOS.org
//
import React, { type ComponentType } from 'react';

import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';
import { useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { translationKey } from '../../translations';
import { InvitationListItem, type InvitationListItemProps } from './InvitationListItem';
import { type SharedInvitationListProps } from './InvitationListProps';

export interface InvitationListProps
  extends Omit<InvitationListItemProps, 'invitation' | 'value'>, Pick<SharedInvitationListProps, 'send'> {
  invitations: CancellableInvitationObservable[];
  InvitationListItem?: ComponentType<InvitationListItemProps>;
  className?: string;
}

export const InvitationList = ({ invitations, send, ...invitationProps }: InvitationListProps) => {
  const { t } = useTranslation(translationKey);
  const { className, InvitationListItem: Item = InvitationListItem } = invitationProps;
  return (
    <Listbox.Root>
      <Listbox.Content classNames={['flex flex-col gap-2', className]} aria-label={t('invitation-list.heading')}>
        {invitations.map((invitation) => {
          const value = invitation.get().invitationId;
          return <Item key={value} send={send} invitation={invitation} {...invitationProps} />;
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};
