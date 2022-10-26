//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import type { Party, Profile as NaturalProfile } from '@dxos/client';
import {
  Avatar,
  AvatarProps,
  defaultActive,
  defaultFocus,
  defaultHover,
  Loading,
  Popover,
  PopoverProps
} from '@dxos/react-ui';
import { humanize } from '@dxos/util';

import { Profile } from '../Profile';

export interface PresenceProps
  extends Omit<AvatarProps, 'label' | 'fallbackValue'>,
    Pick<PopoverProps, 'collisionPadding' | 'sideOffset'> {
  profile: NaturalProfile;
  party?: Party;
  closeLabel?: string;
}

const PresenceContent = ({ profile }: PresenceProps) => {
  return (
    <>
      <Profile profile={profile} />
    </>
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
