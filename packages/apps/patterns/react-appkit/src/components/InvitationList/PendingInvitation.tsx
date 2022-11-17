//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { ProhibitInset } from 'phosphor-react';
import React from 'react';

import { Invitation, InvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { Avatar, Button, CompactQrCode, defaultGroup, getSize, Loading, Tooltip } from '@dxos/react-ui';
import { InvitationStatus, useTranslation } from '@dxos/react-uikit';

import { HeadingWithActions } from '../HeadingWithActions';

export interface PendingInvitationProps {
  wrapper: InvitationObservable;
  createInvitationUrl: (invitation: string) => string;
}

const PendingInvitationSkeleton = ({ message }: { message: string }) => {
  return <Loading label={message} />;
};

export const PendingInvitation = ({ wrapper, createInvitationUrl }: PendingInvitationProps) => {
  const { t } = useTranslation('uikit');
  const { cancel, status, haltedAt, authenticationCode, invitationCode } = useInvitationStatus(wrapper);

  return (
    <div role='group' className={cx(defaultGroup({ elevation: 1 }), 'mbe-2')}>
      {wrapper.invitation ? (
        <>
          <HeadingWithActions
            compact
            spacer={null}
            heading={{
              level: 2,
              className: 'text-lg font-body flex gap-2 items-center grow-[99] pie-2',
              children: (
                <Avatar
                  size={10}
                  fallbackValue={wrapper.invitation.invitationId!}
                  label={<InvitationStatus {...{ status, haltedAt }} className='grow' />}
                />
              )
            }}
            actions={
              <>
                {status === Invitation.State.AUTHENTICATING ? (
                  <p className='text-xl text-center text-success-500 dark:text-success-300'>{authenticationCode}</p>
                ) : (
                  <CompactQrCode
                    {...{
                      copyLabel: t('copy space invite code short label', { ns: 'uikit' }),
                      displayQrLabel: t('display space invite qr code label', { ns: 'uikit' }),
                      value: createInvitationUrl(invitationCode!)
                    }}
                  />
                )}
                <Tooltip content={t('cancel label')} tooltipLabelsTrigger>
                  <Button className='flex md:hidden gap-1 items-center' onClick={cancel}>
                    <ProhibitInset className={getSize(5)} />
                  </Button>
                </Tooltip>
                <Button className='hidden md:flex gap-1 items-center' onClick={cancel}>
                  <ProhibitInset className={getSize(5)} />
                  <span>{t('cancel label')}</span>
                </Button>
              </>
            }
          />
        </>
      ) : (
        <PendingInvitationSkeleton message={t('generic loading label')} />
      )}
    </div>
  );
};
