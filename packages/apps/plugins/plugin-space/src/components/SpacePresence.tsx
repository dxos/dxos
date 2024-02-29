//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { NavigationAction, useIntentDispatcher, usePlugin } from '@dxos/app-framework';
import { generateName } from '@dxos/display-name';
import { log } from '@dxos/log';
import { type PublicKey, useClient } from '@dxos/react-client';
import { type TypedObject, getSpaceForObject, useSpace, useMembers, type SpaceMember } from '@dxos/react-client/echo';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
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
  List,
  ListItem,
} from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { ComplexMap, hexToHue, keyToEmoji } from '@dxos/util';

import { SPACE_PLUGIN } from '../meta';
import type { SpacePluginProvides } from '../types';

// TODO(wittjosiah): Factor out?
const getName = (identity: Identity) => identity.profile?.displayName ?? generateName(identity.identityKey.toHex());

export const SpacePresence = ({ object, spaceKey }: { object: TypedObject; spaceKey?: PublicKey }) => {
  const density = useDensityContext();
  const dispatch = useIntentDispatcher();
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
    .reduce(
      (viewers, viewer) => {
        viewers.set(viewer.identityKey, viewer.lastSeen);
        return viewers;
      },
      new ComplexMap<PublicKey, number>((key) => key.toHex()),
    );

  const members = spaceMembers
    .filter((member) => member.presence === 1 && !identity.identityKey.equals(member.identity.identityKey))
    .map((member) => ({
      ...member,
      match: viewers.has(member.identity.identityKey),
      lastSeen: viewers.get(member.identity.identityKey) ?? Infinity,
    }))
    .toSorted((a, b) => a.lastSeen - b.lastSeen);

  return density === 'fine' ? (
    <SmallPresence members={members.filter((member) => member.match)} />
  ) : (
    <FullPresence
      members={members}
      onMemberClick={(member) => {
        const viewing = spacePlugin.provides.space.viewers.find((viewer) =>
          viewer.identityKey.equals(member.identity.identityKey),
        )?.objectId;
        if (viewing) {
          void dispatch({
            action: NavigationAction.ACTIVATE,
            data: { id: viewing },
          });
        } else {
          log.warn('No viewing object found for member');
        }
      }}
    />
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
}>;

export const FullPresence = (props: MemberPresenceProps) => {
  const { members = [], size = 9, onMemberClick } = props;

  if (members.length === 0) {
    return null;
  }

  return (
    <AvatarGroup.Root size={size} classNames='mbs-2 mie-4' data-testid='spacePlugin.presence'>
      {members.slice(0, 3).map((member, i) => (
        <Tooltip.Root key={member.identity.identityKey.toHex()}>
          <Tooltip.Trigger>
            <PrensenceAvatar
              identity={member.identity}
              group
              match={member.match}
              index={members.length - i}
              onClick={() => onMemberClick?.(member)}
            />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content side='bottom'>
              <span>{getName(member.identity)}</span>
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      ))}

      {members.length > 3 && (
        <Tooltip.Root>
          <Tooltip.Trigger>
            <AvatarGroupItem.Root status='inactive'>
              <Avatar.Frame style={{ zIndex: members.length - 4 }}>
                {/* TODO(wittjosiah): Make text fit. */}
                <Avatar.Fallback text={`+${members.length - 3}`} />
              </Avatar.Frame>
            </AvatarGroupItem.Root>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content side='bottom'>
              <Tooltip.Arrow />
              <List classNames='max-h-56 overflow-y-auto'>
                {members.map((member) => (
                  <ListItem.Root
                    key={member.identity.identityKey.toHex()}
                    classNames='flex gap-2 items-center cursor-pointer mbe-2'
                    onClick={() => onMemberClick?.(member)}
                    data-testid='identity-list-item'
                  >
                    <PrensenceAvatar identity={member.identity} showName match={member.match} />
                  </ListItem.Root>
                ))}
              </List>
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      )}
    </AvatarGroup.Root>
  );
};

type PresenceAvatarProps = {
  identity: Identity;
  showName?: boolean;
  match?: boolean;
  group?: boolean;
  index?: number;
  onClick?: () => void;
};

const PrensenceAvatar = ({ identity, showName, match, group, index, onClick }: PresenceAvatarProps) => {
  const Root = group ? AvatarGroupItem.Root : Avatar.Root;
  const status = match ? 'current' : 'active';
  const fallbackValue = keyToEmoji(identity.identityKey);
  return (
    <Root status={status}>
      <Avatar.Frame
        data-testid='spacePlugin.presence.member'
        data-status={status}
        {...(index ? { style: { zIndex: index } } : {})}
        onClick={() => onClick?.()}
      >
        <Avatar.Fallback text={fallbackValue} />
      </Avatar.Frame>
      {showName && <Avatar.Label classNames='text-sm truncate pli-2'>{getName(identity)}</Avatar.Label>}
    </Root>
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
                <AvatarGroupItem.Root key={viewerHex} hue={hexToHue(viewerHex)}>
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
