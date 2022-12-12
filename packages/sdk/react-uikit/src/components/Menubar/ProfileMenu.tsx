//
// Copyright 2022 DXOS.org
//

import { UserCircleGear } from 'phosphor-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Profile as ProfileType } from '@dxos/client';
import { Avatar, Button, getSize, Popover } from '@dxos/react-ui';
import { humanize } from '@dxos/util';

export interface ProfileMenuProps {
  profile: ProfileType;
  onClickManageProfile?: () => void;
}

export const ProfileMenu = (props: ProfileMenuProps) => {
  const { profile, onClickManageProfile } = props;
  const { t } = useTranslation('uikit');
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
          className:
            'flex justify-self-end pointer-events-auto bg-white dark:bg-neutral-700 p-0.5 button-elevation rounded-full'
        }
      }}
      triggerIsInToolbar
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
};
