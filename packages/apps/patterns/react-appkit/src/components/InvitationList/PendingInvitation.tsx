//
// Copyright 2022 DXOS.org
//

import { ProhibitInset, XCircle } from '@phosphor-icons/react';
import React from 'react';

import { Button, defaultGroup, getSize, useTranslation, mx } from '@dxos/aurora';
import { Invitation, CancellableInvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';

import { Avatar } from '../Avatar';
import { HeadingWithActions } from '../HeadingWithActions';
import { InvitationStatus } from '../InvitationStatus';
import { Loading } from '../Loading';
import { CompactQrCode } from '../QrCode';
import { Tooltip } from '../Tooltip';

export interface PendingInvitationProps {
  wrapper: CancellableInvitationObservable;
  createInvitationUrl: (invitation: string) => string;
  onClickRemove: (invitation: CancellableInvitationObservable) => void;
}

const PendingInvitationSkeleton = ({ message }: { message: string }) => {
  return <Loading label={message} />;
};

export const PendingInvitation = ({ wrapper, createInvitationUrl, onClickRemove }: PendingInvitationProps) => {
  const { t } = useTranslation('appkit');
  const { cancel, status, haltedAt, authCode, invitationCode } = useInvitationStatus(wrapper);

  return (
    <div role='group' className={mx(defaultGroup({ elevation: 'group' }), 'mbe-2')}>
      {wrapper.get() ? (
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
                  fallbackValue={wrapper.get().invitationId}
                  label={<InvitationStatus {...{ status, haltedAt }} className='grow' />}
                />
              )
            }}
            actions={
              <>
                {status === Invitation.State.AUTHENTICATING ? (
                  <p className='text-xl text-center text-success-500 dark:text-success-300'>{authCode}</p>
                ) : (
                  <CompactQrCode
                    {...{
                      copyLabel: t('copy space invite code short label', { ns: 'appkit' }),
                      displayQrLabel: t('display space invite qr code label', { ns: 'appkit' }),
                      value: createInvitationUrl(invitationCode!)
                    }}
                  />
                )}
                {/* TODO(wittjosiah): Helper for determining terminal states. */}
                {status === Invitation.State.CANCELLED ||
                status === Invitation.State.ERROR ||
                status === Invitation.State.TIMEOUT ||
                status === Invitation.State.SUCCESS ? (
                  <>
                    <Tooltip content={t('remove label')} tooltipLabelsTrigger>
                      <Button className='flex md:hidden gap-1 items-center' onClick={() => onClickRemove(wrapper)}>
                        <XCircle className={getSize(5)} />
                      </Button>
                    </Tooltip>
                    <Button className='hidden md:flex gap-1 items-center' onClick={() => onClickRemove(wrapper)}>
                      <XCircle className={getSize(5)} />
                      <span>{t('remove label')}</span>
                    </Button>
                  </>
                ) : (
                  <>
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
                )}
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
