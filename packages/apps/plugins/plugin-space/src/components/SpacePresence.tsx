//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { usePlugin } from '@dxos/app-framework';
import { generateName } from '@dxos/display-name';
import { type PublicKey, useClient } from '@dxos/react-client';
import { type TypedObject, getSpaceForObject, useSpace, useMembers, type SpaceMember } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import {
  Avatar,
  AvatarGroup,
  AvatarGroupItem,
  type Size,
  type ThemedClassName,
  Tooltip,
  useDensityContext,
  useTranslation,
  Button,
} from '@dxos/react-ui';
import { getColorForValue, mx } from '@dxos/react-ui-theme';
import { ComplexMap } from '@dxos/util';

import { SPACE_PLUGIN } from '../meta';
import type { SpacePluginProvides } from '../types';

export const SpacePresence = ({ object, spaceKey }: { object: TypedObject; spaceKey?: PublicKey }) => {
  const density = useDensityContext();
  const spacePlugin = usePlugin<SpacePluginProvides>(SPACE_PLUGIN);
  const client = useClient();
  const identity = useIdentity();
  const defaultSpace = useSpace();
  const space = spaceKey ? client.spaces.get(spaceKey) : getSpaceForObject(object);
  const spaceMembers = useMembers(space?.key);

  if (!identity || !spacePlugin || !space || defaultSpace?.key.equals(space.key)) {
    return null;
  }

  // TODO(wittjosiah): This isn't working because of issue w/ deepsignal state.
  //  Assigning plugin to deepsignal seems to create a new instance of objects in provides and breaks the reference.
  const viewers = spacePlugin.provides.space.viewers
    .filter((viewer) => {
      return (
        space.key.equals(viewer.spaceKey) && object.id === viewer.objectId && Date.now() - viewer.lastSeen < 30_000
      );
    })
    .reduce((viewers, viewer) => {
      viewers.set(viewer.identityKey, viewer.lastSeen);
      return viewers;
    }, new ComplexMap<PublicKey, number>((key) => key.toHex()));

  const members = spaceMembers
    .filter((member) => member.presence === 1 && !identity.identityKey.equals(member.identity.identityKey))
    .map((member) => ({
      ...member,
      match: viewers.has(member.identity.identityKey),
      lastSeen: viewers.get(member.identity.identityKey) ?? Infinity,
    }))
    .toSorted((a, b) => a.lastSeen - b.lastSeen);

  const onMoreClick = () => client.shell.shareSpace({ spaceKey: space.key });

  return density === 'fine' ? (
    <SmallPresence members={members.filter((member) => member.match)} />
  ) : (
    <FullPresence members={members} onMoreClick={onMoreClick} />
  );
};

export type Member = SpaceMember & {
  /**
   * True if the member is currently viewing the specified object.
   */
  match: boolean;

  /**
   * Last time a member was seen on this object.
   */
  lastSeen: number;
};

export type MemberPresenceProps = ThemedClassName<{
  size?: Size;
  members?: Member[];
  showCount?: boolean;
  onMemberClick?: (member: Member) => void;
  onMoreClick?: () => void;
}>;

export const FullPresence = (props: MemberPresenceProps) => {
  const { members = [], size = 9, onMemberClick, onMoreClick } = props;
  const { t } = useTranslation(SPACE_PLUGIN);

  if (members.length === 0) {
    return null;
  }

  return (
    <AvatarGroup.Root size={size} classNames='mbs-2 mie-4'>
      {members.slice(0, 3).map((member, i) => {
        const memberHex = member.identity.identityKey.toHex();
        const status = member.match ? 'current' : 'active';
        const name = member.identity.profile?.displayName ?? generateName(member.identity.identityKey.toHex());
        return (
          <Tooltip.Root key={memberHex}>
            <Tooltip.Trigger>
              <AvatarGroupItem.Root color={getColorForValue({ value: memberHex, type: 'color' })} status={status}>
                <Avatar.Frame style={{ zIndex: members.length - i }} onClick={() => onMemberClick?.(member)}>
                  <Avatar.Fallback text={name[0]} />
                </Avatar.Frame>
              </AvatarGroupItem.Root>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content side='bottom'>
                <span>{name}</span>
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        );
      })}

      {members.length > 3 && (
        <Tooltip.Root>
          <Tooltip.Trigger>
            <AvatarGroupItem.Root color='#ccc' status='inactive'>
              <Avatar.Frame style={{ zIndex: members.length - 4 }} onClick={onMoreClick}>
                {/* TODO(wittjosiah): Make text fit. */}
                <Avatar.Fallback text={`+${members.length - 3}`} />
              </Avatar.Frame>
            </AvatarGroupItem.Root>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content side='bottom'>
              <span>
                {t('viewers label', { count: members.filter((member) => member.match).length })}
                {t('members online label', { count: members.length - members.filter((member) => member.match).length })}
              </span>
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      )}
    </AvatarGroup.Root>
  );
};

export const SmallPresence = (props: MemberPresenceProps) => {
  const { members = [], size = 2, classNames } = props;
  const { t } = useTranslation(SPACE_PLUGIN);
  return members.length === 0 ? (
    <div role='none' className={mx(classNames)} />
  ) : (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button variant='ghost' classNames={['pli-0', classNames]}>
          <AvatarGroup.Root size={size} classNames='m-1 mie-2'>
            {members.slice(0, 3).map((viewer, i) => {
              const viewerHex = viewer.identity.identityKey.toHex();
              return (
                <AvatarGroupItem.Root key={viewerHex} color={getColorForValue({ value: viewerHex, type: 'color' })}>
                  <Avatar.Frame style={{ zIndex: members.length - i }} />
                </AvatarGroupItem.Root>
              );
            })}
          </AvatarGroup.Root>
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom' classNames='z-[70]'>
          <span>{t('presence label', { count: members.length })}</span>
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
