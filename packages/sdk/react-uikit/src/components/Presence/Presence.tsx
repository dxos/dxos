//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { UserPlus, UsersThree, UserCircleGear, Gear, Check } from 'phosphor-react';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Party, Profile as NaturalProfile } from '@dxos/client';
import { useMembers, usePartyInvitations } from '@dxos/react-client';
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

import { UsernameInput } from '../Profile';

export interface PresenceProps
  extends Omit<AvatarProps, 'label' | 'fallbackValue'>,
    Pick<PopoverProps, 'collisionPadding' | 'sideOffset'> {
  profile: NaturalProfile;
  space?: Party;
  closeLabel?: string;
<<<<<<< HEAD:packages/sdk/react-uikit/src/components/Presence/Presence.tsx
  managingSpace?: boolean;
  onClickManageSpace?: () => void;
  onClickGoToSpace?: () => void;
=======
  managingParty?: boolean;
  createInvitationUrl?: (invitationCode: string) => string;
  onClickManageParty?: () => void;
  onClickGoToParty?: () => void;
>>>>>>> cde7153fd (fix(react-uikit): Re-add singleton invite):packages/common/react-uikit/src/components/Presence/Presence.tsx
  onClickManageProfile?: () => void;
}

const ProfileMenu = (props: PresenceProps) => {
  const {
    profile,
    onClickManageProfile,
    space: _space,
    closeLabel: _closeLabel,
<<<<<<< HEAD:packages/sdk/react-uikit/src/components/Presence/Presence.tsx
    onClickManageSpace: _onClickManageSpace,
    managingSpace: _managingSpace,
    onClickGoToSpace: _onClickGoToSpace,
=======
    createInvitationUrl: _createInvitationUrl,
    onClickManageParty: _onClickManageParty,
    managingParty: _managingParty,
    onClickGoToParty: _onClickGoToParty,
>>>>>>> cde7153fd (fix(react-uikit): Re-add singleton invite):packages/common/react-uikit/src/components/Presence/Presence.tsx
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
      {onClickManageProfile && (
        <Button className='flex w-full gap-2' onClick={onClickManageProfile}>
          <UserCircleGear className={getSize(5)} />
          <span>{t('manage profile label')}</span>
        </Button>
      )}
      <UsernameInput profile={profile} />
    </Popover>
  );
};

const PartyInviteSingleton = ({
  createInvitationUrl,
  space
}: Required<Pick<PresenceProps, 'createInvitationUrl' | 'space'>>) => {
  const { t } = useTranslation();
  const invitations = usePartyInvitations(space.key);

  useEffect(() => {
    if (invitations.length < 1) {
      void party.createInvitation();
    }
  }, [party, invitations]);

  // TODO(wittjosiah): This should re-generate once it is used.
  const invitationUrl = useMemo(() => invitations[0] && createInvitationUrl(invitations[0].encode()), [invitations]);

  return invitationUrl ? (
    <QrCode
      size={40}
      value={invitationUrl}
      label={<p className='w-20'>{t('copy party invite code label')}</p>}
      side='left'
      sideOffset={12}
      className='w-full h-auto'
    />
  ) : (
    <Loading label={t('generic loading label')} size='md' />
  );
};

const PartyMenu = (props: Omit<PresenceProps, 'space'> & { space: Party }) => {
  const { space, createInvitationUrl, onClickManageSpace, sideOffset, collisionPadding } = props;
  const { t } = useTranslation();
  const members: NaturalProfile[] = useMembers(space);

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
<<<<<<< HEAD:packages/sdk/react-uikit/src/components/Presence/Presence.tsx
      {onClickManageSpace && (
        <Button className='flex w-full gap-2' onClick={onClickManageSpace}>
=======
      {createInvitationUrl && <PartyInviteSingleton createInvitationUrl={createInvitationUrl} party={party} />}
      {onClickManageParty && (
        <Button className='flex w-full gap-2' onClick={onClickManageParty}>
>>>>>>> cde7153fd (fix(react-uikit): Re-add singleton invite):packages/common/react-uikit/src/components/Presence/Presence.tsx
          <Gear className={getSize(5)} />
          <span>{t('manage party label')}</span>
        </Button>
      )}
    </Popover>
  );
};

const PartyLink = ({ onClickGoToSpace }: Pick<PresenceProps, 'onClickGoToSpace'>) => {
  const { t } = useTranslation('halo');
  return (
    <Button compact className='flex w-full gap-1 pli-2' onClick={onClickGoToSpace}>
      <span className='text-xs'>{t('go to party label')}</span>
      <Check className={getSize(4)} weight='bold' />
    </Button>
  );
};

export const Presence = (props: PresenceProps) => {
  return (
    <div role='none' className='flex items-center'>
      {props.space && (props.managingSpace ? <PartyLink {...props} /> : <PartyMenu {...props} space={props.space!} />)}
      <ProfileMenu {...props} />
    </div>
  );
};
