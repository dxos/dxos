//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { Party, Profile } from '@dxos/client';
import { useClient, useHaloInvitations } from '@dxos/react-client';
import {
  Avatar,
  AvatarProps,
  defaultActive,
  defaultFocus,
  defaultHover,
  Loading,
  Popover,
  PopoverProps,
  QrCode
} from '@dxos/react-ui';
import { humanize } from '@dxos/util';

export interface PresenceProps
  extends Omit<AvatarProps, 'label' | 'fallbackValue'>,
    Pick<PopoverProps, 'collisionPadding' | 'sideOffset'> {
  profile: Profile;
  party?: Party;
  closeLabel?: string;
}

const PresenceContent = (props: PresenceProps) => {
  const { t } = useTranslation();
  const client = useClient();
  const invitations = useHaloInvitations(client);

  useEffect(() => {
    if (invitations.length < 1) {
      void client.halo.createInvitation();
    }
  }, [invitations]);

  return client ? (
    <div role='none'>
      {invitations.length ? (
        <QrCode
          value={invitations[0]!.descriptor.encode().toString()}
          label={t('copy invite code label', { ns: 'halo' })}
        />
      ) : (
        <Loading label={t('generic loading label')} size='md' />
      )}
    </div>
  ) : (
    <Loading label={t('generic loading label')} size='lg' />
  );
};

export const Presence = (props: PresenceProps) => {
  const { t } = useTranslation();
  const {
    profile,
    party: _party,
    closeLabel: _closeLabel,
    sideOffset,
    collisionPadding,
    ...avatarProps
  } = props;
  return (
    <Popover
      openTrigger={
        <Avatar
          tabIndex={0}
          size={7}
          variant='circle'
          {...avatarProps}
          fallbackValue={profile.publicKey.toHex()}
          label={
            <span className='sr-only'>
              {profile.username ?? humanize(profile.publicKey.toHex())}
            </span>
          }
          className={cx(
            'bg-white p-0.5 button-elevation rounded-full cursor-pointer',
            defaultHover({}),
            defaultFocus,
            defaultActive,
            avatarProps.className
          )}
        />
      }
      collisionPadding={collisionPadding ?? 8}
      sideOffset={sideOffset ?? -8}
    >
      <Suspense
        fallback={<Loading label={t('generic loading label')} size='lg' />}
      >
        <PresenceContent {...props} />
      </Suspense>
    </Popover>
  );
};
