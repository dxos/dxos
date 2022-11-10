//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { ProhibitInset } from 'phosphor-react';
import React from 'react';
import urlJoin from 'url-join';

import { Invitation, InvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import {
  Avatar,
  QrCode,
  useTranslation,
  defaultGroup,
  Button,
  Loading,
  getSize,
  InvitationStatus
} from '@dxos/react-uikit';

import { HeadingWithActions } from '../HeadingWithActions';

export interface PendingInvitationProps {
  wrapper: InvitationObservable;
}

const PendingInvitationSkeleton = ({ message }: { message: string }) => {
  return <Loading label={message} />;
};

export const PendingInvitation = ({ wrapper }: PendingInvitationProps) => {
  const { t } = useTranslation('uikit');

  const { cancel, status, haltedAt, authenticationCode, invitationCode } = useInvitationStatus(wrapper);

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
          {status === Invitation.State.AUTHENTICATING ? (
            <p className='text-xl text-center text-success-500 dark:text-success-300'>{authenticationCode}</p>
          ) : (
            <QrCode
              size={40}
              value={createInvitationUrl(invitationCode!)}
              label={<p className='w-20'>{t('copy halo invite code label')}</p>}
              side='top'
              sideOffset={12}
              className='w-full h-auto mt-2'
            />
          )}
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
