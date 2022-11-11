//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { UserPlus, UsersThree, UserCircleGear, Gear, Check } from 'phosphor-react';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Invitation, Space, Profile as ProfileType } from '@dxos/client';
import { useMembers, useSpaceInvitations } from '@dxos/react-client';
import {
  Avatar,
  AvatarProps,
  Button,
  defaultActive,
  defaultFocus,
  defaultHover,
  defaultInlineSeparator,
  getSize,
  Loading,
  Popover,
  PopoverProps,
  QrCode
} from '@dxos/react-ui';
import { humanize } from '@dxos/util';

import { DisplayNameInput } from '../Profile';

export interface PresenceProps
  extends Omit<AvatarProps, 'label' | 'fallbackValue'>,
    Pick<PopoverProps, 'collisionPadding' | 'sideOffset'> {
  profile: ProfileType;
  space?: Space;
  closeLabel?: string;
  managingSpace?: boolean;
  createInvitationUrl?: (invitationCode: Invitation) => string;
  onClickManageSpace?: () => void;
  onClickGoToSpace?: () => void;
  onClickManageProfile?: () => void;
}

const ProfileMenu = (props: PresenceProps) => {
  const {
    profile,
    onClickManageProfile,
    space: _space,
    closeLabel: _closeLabel,
    createInvitationUrl: _createInvitationUrl,
    onClickManageSpace: _onClickManageSpace,
    managingSpace: _managingSpace,
    onClickGoToSpace: _onClickGoToSpace,
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
          fallbackValue={profile.identityKey.toHex()}
          label={<span className='sr-only'>{profile.displayName ?? humanize(profile.identityKey.toHex())}</span>}
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
      {onClickManageProfile && (
        <Button className='flex w-full gap-2' onClick={onClickManageProfile}>
          <UserCircleGear className={getSize(5)} />
          <span>{t('manage profile label')}</span>
        </Button>
      )}
      <DisplayNameInput profile={profile} />
    </Popover>
  );
};

// TODO(burdon): To discuss.
const SpaceInviteSingleton = ({
  createInvitationUrl,
  space
}: Required<Pick<PresenceProps, 'createInvitationUrl' | 'space'>>) => {
  const { t } = useTranslation();
  const invitations = useSpaceInvitations(space.key);
  useEffect(() => {
    if (invitations.length < 1) {
      void space.createInvitation();
    }
  }, [space, invitations]);

  // TODO(burdon): Update InvitationEncoder.
  // TODO(wittjosiah): This should re-generate once it is used.
  const invitationUrl = useMemo(() => {
    const invitation = invitations[0]?.invitation;
    if (invitation) {
      return createInvitationUrl(invitation);
    }
  }, [invitations]);

  return invitationUrl ? (
    <QrCode
      size={40}
      value={invitationUrl}
      label={<p className='w-20'>{t('copy space invite code label')}</p>}
      side='left'
      sideOffset={12}
      className='w-full h-auto'
    />
  ) : (
    <Loading label={t('generic loading label')} size='md' />
  );
};

const SpaceMenu = (props: Omit<PresenceProps, 'space'> & { space: Space }) => {
  const { space, createInvitationUrl, onClickManageSpace, sideOffset, collisionPadding } = props;
  const { t } = useTranslation();
  const members = useMembers(space.key);

  return (
    <Popover
      openTrigger={
        <Button compact className='flex items-center gap-1'>
          <UsersThree className={getSize(4)} />
          <span className='leading-none'>{members.length}</span>
          <span role='none' className={cx(defaultInlineSeparator, 'bs-3')} />
          <UserPlus className={getSize(4)} />
        </Button>
      }
      collisionPadding={collisionPadding ?? 8}
      sideOffset={sideOffset ?? 0}
      className='flex flex-col gap-4 items-center'
    >
      {createInvitationUrl && <SpaceInviteSingleton createInvitationUrl={createInvitationUrl} space={space} />}
      {onClickManageSpace && (
        <Button className='flex w-full gap-2' onClick={onClickManageSpace}>
          <Gear className={getSize(5)} />
          <span>{t('manage space label')}</span>
        </Button>
      )}
    </Popover>
  );
};

const SpaceLink = ({ onClickGoToSpace }: Pick<PresenceProps, 'onClickGoToSpace'>) => {
  const { t } = useTranslation('halo');
  return (
    <Button compact className='flex w-full gap-1 pli-2' onClick={onClickGoToSpace}>
      <span className='text-xs'>{t('go to space label')}</span>
      <Check className={getSize(4)} weight='bold' />
    </Button>
  );
};

export const Presence = (props: PresenceProps) => {
  return (
    <div role='none' className='flex items-center'>
      {props.space && (props.managingSpace ? <SpaceLink {...props} /> : <SpaceMenu {...props} space={props.space!} />)}
      <ProfileMenu {...props} />
    </div>
  );
};
