//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { UserPlus, UsersThree, UserCircleGear, Gear, Check } from 'phosphor-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Party, Profile as NaturalProfile } from '@dxos/client';
import { useMembers } from '@dxos/react-client';
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
  managingParty?: boolean;
  onClickManageParty?: () => void;
  onClickGoToParty?: () => void;
  onClickManageProfile?: () => void;
}

const ProfileMenu = (props: PresenceProps) => {
  const {
    profile,
    onClickManageProfile,
    party: _party,
    closeLabel: _closeLabel,
    onClickManageParty: _onClickManageParty,
    managingParty: _managingParty,
    onClickGoToParty: _onClickGoToParty,
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
            'bg-white dark:bg-neutral-700 p-0.5 button-elevation rounded-full cursor-pointer mis-2',
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
  const { party, onClickManageParty, sideOffset, collisionPadding } = props;
  const { t } = useTranslation();
  const members: NaturalProfile[] = useMembers(party);

  return (
    <>
      <Popover
        openTrigger={
          <Button compact className='flex items-center border-ie-0' rounding='rounded-is-md rounded-ie-0'>
            <UsersThree className={getSize(4)} />
            <span className='mli-1 leading-none'>{members.length}</span>
          </Button>
        }
        collisionPadding={collisionPadding ?? 8}
        sideOffset={sideOffset ?? 0}
        className='flex flex-col gap-4 items-center'
      >
        {members.length > 0 ? (
          <ul>
            {members.map((member) => (
              <li>
                <Avatar fallbackValue={member.publicKey.toHex()} label={humanize(member.publicKey.toHex())} />
              </li>
            ))}
          </ul>
        ) : (
          <span>{t('empty space message')}</span>
        )}
      </Popover>
      <Popover
        openTrigger={
          <Button compact rounding='rounded-ie-md rounded-is-0'>
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
    </>
  );
};

const PartyLink = ({ onClickGoToParty }: Pick<PresenceProps, 'onClickGoToParty'>) => {
  const { t } = useTranslation('halo');
  return (
    <Button compact variant='primary' className='flex w-full gap-1 pli-2' onClick={onClickGoToParty}>
      <span className='text-xs'>{t('go to party label')}</span>
      <Check className={getSize(4)} weight='bold' />
    </Button>
  );
};

export const Presence = (props: PresenceProps) => {
  return (
    <div role='none' className='flex items-center'>
      {props.party && (props.managingParty ? <PartyLink {...props} /> : <PartyMenu {...props} party={props.party!} />)}
      <ProfileMenu {...props} />
    </div>
  );
};
