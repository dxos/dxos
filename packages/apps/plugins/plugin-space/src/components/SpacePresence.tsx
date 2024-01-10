//
// Copyright 2023 DXOS.org
//

import { CaretDown } from '@phosphor-icons/react';
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
  Button,
  type Size,
  type ThemedClassName,
  Tooltip,
  useDensityContext,
  useTranslation,
  DropdownMenu,
} from '@dxos/react-ui';
import { getColorForValue, mx } from '@dxos/react-ui-theme';

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
  const viewers = new Set(
    spacePlugin.provides.space.viewers
      .filter((viewer) => {
        return (
          space.key.equals(viewer.spaceKey) && object.id === viewer.objectId && Date.now() - viewer.lastSeen < 30_000
        );
      })
      .map((viewer) => viewer.identityKey),
  );

  const members = spaceMembers
    .map((member) => ({
      ...member,
      match: viewers.has(member.identity.identityKey),
    }))
    .toSorted((a, b) => {
      if (a.presence && !b.presence) {
        return -1;
      }
      if (!a.presence && b.presence) {
        return 1;
      }
      if (a.match && !b.match) {
        return -1;
      }
      if (!a.match && b.match) {
        return 1;
      }
      return 0;
    });

  return density === 'fine' ? (
    <SmallPresence members={members.filter((member) => member.match)} />
  ) : (
    <FullPresence members={members} />
  );
};

export type Member = SpaceMember & {
  /**
   * True if the member is currently viewing the specified object.
   */
  match?: boolean;
};

export type MemberPresenceProps = ThemedClassName<{
  size?: Size;
  members?: Member[];
  showCount?: boolean;
}>;

export const FullPresence = (props: MemberPresenceProps) => {
  const { members = [], size = 8 } = props;
  return (
    <AvatarGroup.Root size={size}>
      {members.slice(0, 3).map((member, i) => {
        const memberHex = member.identity.identityKey.toHex();
        const status = member.match ? 'warning' : member.presence === 1 ? 'active' : 'inactive';
        const name = member.identity.profile?.displayName ?? generateName(member.identity.identityKey.toHex());
        return (
          <Tooltip.Root key={memberHex}>
            <Tooltip.Trigger>
              <AvatarGroupItem.Root color={getColorForValue({ value: memberHex, type: 'color' })} status={status}>
                <Avatar.Frame style={{ zIndex: members.length - i }}>
                  <Avatar.Fallback text={name[0]} />
                </Avatar.Frame>
              </AvatarGroupItem.Root>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content side='bottom' classNames='z-[70]'>
                <span>{name}</span>
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        );
      })}

      <AvatarGroup.Label classNames='text-xs font-semibold'>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant='ghost' classNames='pli-1'>
              {members.length > 3 && <span className='me-1'>{members.length}</span>}
              <CaretDown />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content classNames='z-[70]'>
              <DropdownMenu.Arrow />
              <DropdownMenu.Viewport>
                {members.map((member) => {
                  const viewerHex = member.identity.identityKey.toHex();
                  const status = member.match ? 'warning' : member.presence === 1 ? 'active' : 'inactive';
                  const name =
                    member.identity.profile?.displayName ?? generateName(member.identity.identityKey.toHex());
                  const description = member.presence === 1 ? 'Online' : 'Offline';
                  return (
                    <DropdownMenu.Item key={member.identity.identityKey.toHex()}>
                      <div className='flex flex-row gap-3 align-middle items-center'>
                        <Avatar.Root color={getColorForValue({ value: viewerHex, type: 'color' })} status={status}>
                          <Avatar.Frame>
                            <Avatar.Fallback text={name[0]} />
                          </Avatar.Frame>
                          <div>
                            <Avatar.Label classNames='block'>{name}</Avatar.Label>
                            <Avatar.Description classNames='block'>{description}</Avatar.Description>
                          </div>
                        </Avatar.Root>
                      </div>
                    </DropdownMenu.Item>
                  );
                })}
              </DropdownMenu.Viewport>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </AvatarGroup.Label>
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
      <Tooltip.Trigger>
        <AvatarGroup.Root size={size} classNames={size !== 'px' && size > 3 ? 'm-2 mie-4' : 'm-1 mie-2'}>
          {members.slice(0, 3).map((viewer, i) => {
            const viewerHex = viewer.identity.identityKey.toHex();
            return (
              <AvatarGroupItem.Root key={viewerHex} color={getColorForValue({ value: viewerHex, type: 'color' })}>
                <Avatar.Frame style={{ zIndex: members.length - i }} />
              </AvatarGroupItem.Root>
            );
          })}
        </AvatarGroup.Root>
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
