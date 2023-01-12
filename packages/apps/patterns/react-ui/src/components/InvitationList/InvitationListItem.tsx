//
// Copyright 2023 DXOS.org
//
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ProhibitInset, QrCode } from 'phosphor-react';
import React from 'react';

import { Invitation, CancellableInvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, useTranslation } from '@dxos/react-components';

import { InvitationStatusAvatar } from './InvitationStatusAvatar';

const statusValueMap = new Map<Invitation.State, number>([
  [Invitation.State.ERROR, -3],
  [Invitation.State.TIMEOUT, -2],
  [Invitation.State.CANCELLED, -1],
  [Invitation.State.INIT, 0],
  [Invitation.State.CONNECTING, 1],
  [Invitation.State.CONNECTED, 2],
  [Invitation.State.AUTHENTICATING, 3],
  [Invitation.State.SUCCESS, 4]
]);

export interface InvitationListItemProps {
  invitation: CancellableInvitationObservable;
  value: string;
}

export const InvitationListItem = ({ invitation, value }: InvitationListItemProps) => {
  const { t } = useTranslation('os');
  const { status, haltedAt } = useInvitationStatus(invitation);
  const statusValue = statusValueMap.get(status) ?? 0;
  const isCancellable = statusValue < 4 && statusValue >= 0;
  const hasShare = statusValue < 3 && statusValue >= 0;
  return (
    <AccordionPrimitive.Item value={value}>
      <AccordionPrimitive.Header className='flex gap-2 items-center'>
        <InvitationStatusAvatar {...{ status, haltedAt }} />
        {hasShare ? (
          <AccordionPrimitive.Trigger asChild>
            <Button className='grow'>
              <span>{t('share label')}</span>
              <QrCode className={getSize(4)} />
            </Button>
          </AccordionPrimitive.Trigger>
        ) : (
          <span role='none' className='grow' />
        )}
        {isCancellable && (
          <Button variant='ghost' compact>
            <span className='sr-only'>{t('cancel invitation label')}</span>
            <ProhibitInset className={getSize(4)} />
          </Button>
        )}
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content>QR Code</AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
};
