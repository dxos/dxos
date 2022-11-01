//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { UserPlus, UserCircleGear, Gear } from 'phosphor-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Party, Profile as NaturalProfile } from '@dxos/client';
import {
  Avatar,
  AvatarProps,
  Button,
  defaultActive,
  defaultFocus,
  defaultHover,
  getSize,
  Popover,
  PopoverProps
} from '@dxos/react-ui';
import { humanize } from '@dxos/util';

import { PartyInviteSingleton } from '../Party';
import { UsernameInput } from '../Profile';

export interface PresenceProps
  extends Omit<AvatarProps, 'label' | 'fallbackValue'>,
    Pick<PopoverProps, 'collisionPadding' | 'sideOffset'> {
  profile: NaturalProfile;
  party?: Party;
  closeLabel?: string;
  onClickManageParty?: () => void;
  onClickManageProfile?: () => void;
}

const ProfileMenu = (props: PresenceProps) => {
  const {
    profile,
    onClickManageProfile,
    party: _party,
    closeLabel: _closeLabel,
    onClickManageParty: _onClickManageParty,
    sideOffset,
    collisionPadding,
    ...avatarProps
  } = props;
  const { t } = useTranslation();
  return (
    <Popover
      openTrigger={
        <Avatar
          tabIndex={0}
          size={7}
          variant='circle'
          {...avatarProps}
          fallbackValue={profile.publicKey.toHex()}
          label={<span className='sr-only'>{profile.username ?? humanize(profile.publicKey.toHex())}</span>}
          className={cx(
            'bg-white dark:bg-neutral-700 p-0.5 button-elevation rounded-full cursor-pointer',
            defaultHover({}),
            defaultFocus,
            defaultActive,
            avatarProps.className
          )}
        />
      }
      collisionPadding={collisionPadding ?? 8}
      sideOffset={sideOffset ?? 0}
      className='flex flex-col gap-4 items-center'
    >
      <Button className='flex w-full gap-2' onClick={onClickManageProfile}>
        <UserCircleGear className={getSize(5)} />
        <span>{t('manage profile label')}</span>
      </Button>
      <UsernameInput profile={profile} />
    </Popover>
  );
};

const PartyMenu = (props: Omit<PresenceProps, 'party'> & { party: Party }) => {
  const {
    party,
    onClickManageParty,
    profile: _profile,
    onClickManageProfile: _onClickManageProfile,
    closeLabel: _closeLabel,
    sideOffset,
    collisionPadding
  } = props;
  const { t } = useTranslation();
  return (
    <Popover
      openTrigger={
        <Button compact>
          <UserPlus className={getSize(4)} />
        </Button>
      }
      collisionPadding={collisionPadding ?? 8}
      sideOffset={sideOffset ?? 0}
      className='flex flex-col gap-4 items-center'
    >
      <PartyInviteSingleton party={party} />
      <Button className='flex w-full gap-2' onClick={onClickManageParty}>
        <Gear className={getSize(5)} />
        <span>{t('manage party label')}</span>
      </Button>
    </Popover>
  );
};

export const Presence = (props: PresenceProps) => {
  return (
    <div role='none' className='flex gap-1 items-center'>
      {props.party && <PartyMenu {...props} party={props.party!} />}
      <ProfileMenu {...props} />
    </div>
  );
};
