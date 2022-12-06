//
// Copyright 2022 DXOS.org
//

import { UserCircleGear } from 'phosphor-react';
import React, { ForwardedRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Profile as ProfileType } from '@dxos/client';
import { Avatar, Button, defaultActive, defaultFocus, defaultHover, getSize, Popover, mx } from '@dxos/react-ui';
import { humanize } from '@dxos/util';

export interface ProfileMenuProps {
  profile: ProfileType;
  onClickManageProfile?: () => void;
}

export const ProfileMenu = forwardRef((props: ProfileMenuProps, ref: ForwardedRef<HTMLSpanElement>) => {
  const { profile, onClickManageProfile } = props;
  const { t } = useTranslation('uikit');
  return (
    <Popover
      openTrigger={
        <Avatar
          size={10}
          variant='circle'
          fallbackValue={profile.identityKey.toHex()}
          label={<span className='sr-only'>{profile.displayName ?? humanize(profile.identityKey.toHex())}</span>}
          slots={{
            root: {
              tabIndex: 0,
              className: mx(
                'justify-self-end pointer-events-auto bg-white dark:bg-neutral-700 p-0.5 button-elevation rounded-full cursor-pointer',
                defaultHover({}),
                defaultFocus,
                defaultActive
              )
            }
          }}
          ref={ref}
        />
      }
      triggerIsInToolbar
      slots={{ content: { collisionPadding: 8, sideOffset: 4, className: 'flex flex-col gap-4 items-center z-[2]' } }}
    >
      <p>{profile.displayName ?? humanize(profile.identityKey.toHex())}</p>
      {onClickManageProfile && (
        <Button className='flex w-full gap-2' onClick={onClickManageProfile}>
          <UserCircleGear className={getSize(5)} />
          <span>{t('manage profile label')}</span>
        </Button>
      )}
    </Popover>
  );
});
