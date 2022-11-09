//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { ProhibitInset } from 'phosphor-react';
import React from 'react';
import urlJoin from 'url-join';

import { InvitationEncoder } from '@dxos/client';
import {
  Avatar,
  QrCode,
  useTranslation,
  defaultGroup,
  Button,
  Loading,
  getSize,
  useInvitationStatus,
  InvitationStatus,
  ObservableInvitation
} from '@dxos/react-uikit';

import { HeadingWithActions } from '../HeadingWithActions';

export interface PendingInvitationProps {
  wrapper: ObservableInvitation;
}

const PendingInvitationSkeleton = ({ message }: { message: string }) => {
  return <Loading label={message} />;
};

export const PendingInvitation = ({ wrapper }: PendingInvitationProps) => {
  const { t } = useTranslation('uikit');

  const { cancel, status, haltedAt } = useInvitationStatus(wrapper);

  return (
    <div role='group' className={cx(defaultGroup({ elevation: 1 }))}>
      {wrapper.invitation ? (
        <>
          <HeadingWithActions
            compact
            heading={{
              level: 2,
              className: 'text-lg font-body flex gap-2 items-center',
              children: (
                <Avatar
                  size={10}
                  fallbackValue={wrapper.invitation.invitationId!}
                  label={<InvitationStatus {...{ status, haltedAt }} />}
                />
              )
            }}
            actions={
              <>
                <Button className='grow flex gap-1 items-center' onClick={cancel}>
                  <ProhibitInset className={getSize(5)} />
                  <span>{t('cancel label')}</span>
                </Button>
              </>
            }
          />
          <QrCode
            size={40}
            value={createInvitationUrl(InvitationEncoder.encode(wrapper.invitation))}
            label={<p className='w-20'>{t('copy halo invite code label')}</p>}
            side='top'
            sideOffset={12}
            className='w-full h-auto mt-2'
          />
        </>
      ) : (
        <PendingInvitationSkeleton message={t('generic loading label')} />
      )}
    </div>
  );
};

// TODO(wittjosiah): Factor out.
const createInvitationUrl = (invitationCode: string) => {
  const invitationPath = '/identity/join';
  const { origin, pathname } = window.location;
  return urlJoin(origin, pathname, `/#${invitationPath}`, `?invitation=${invitationCode}`);
};
