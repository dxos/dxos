//
// Copyright 2022 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { Profile as ProfileType } from '@dxos/client';
import { Avatar, Popover } from '@dxos/react-components';
import { humanize } from '@dxos/util';

export interface ProfileMenuProps {
  profile: ProfileType;
}

export const ProfileMenu = (props: PropsWithChildren<ProfileMenuProps>) => {
  const { profile } = props;
  return (
    <Popover
      openTrigger={
        <Avatar
          size={10}
          variant='circle'
          fallbackValue={profile.identityKey.toHex()}
          label={profile.displayName ?? humanize(profile.identityKey.toHex())}
        />
      }
      slots={{
        content: { collisionPadding: 8, sideOffset: 4, className: 'flex flex-col gap-4 items-center z-[2]' },
        trigger: {
          className: 'flex justify-self-end pointer-events-auto bg-white dark:bg-neutral-700 p-0.5 rounded-full'
        }
      }}
      triggerIsInToolbar
    >
      {props.children}
    </Popover>
  );
};
