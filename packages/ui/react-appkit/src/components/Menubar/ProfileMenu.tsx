//
// Copyright 2022 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { AvatarFallback, AvatarLabel, AvatarRoot, Avatar, useJdenticonHref } from '@dxos/aurora';
import { Identity as IdentityType } from '@dxos/client';
import { humanize } from '@dxos/util';

import { Popover } from '../Popover';

export interface ProfileMenuProps {
  identity: IdentityType;
}

export const ProfileMenu = (props: PropsWithChildren<ProfileMenuProps>) => {
  const { identity } = props;
  const jdenticon = useJdenticonHref(identity.identityKey.toHex() ?? '', 10);
  return (
    <Popover
      openTrigger={
        <AvatarRoot>
          <AvatarLabel srOnly>{identity.profile?.displayName ?? humanize(identity.identityKey.toHex())}</AvatarLabel>
          <Avatar>
            <AvatarFallback href={jdenticon} />
          </Avatar>
        </AvatarRoot>
      }
      slots={{
        content: { collisionPadding: 8, sideOffset: 4, className: 'flex flex-col gap-4 items-center z-[2]' },
        trigger: {
          className: 'flex justify-self-end pointer-events-auto bg-white dark:bg-neutral-700 p-0.5 rounded-full',
        },
      }}
      triggerIsInToolbar
    >
      {props.children}
    </Popover>
  );
};
