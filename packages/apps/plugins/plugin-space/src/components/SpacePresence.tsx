//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { NavigationAction, useIntentDispatcher, usePlugin } from '@dxos/app-framework';
import { generateName } from '@dxos/display-name';
import { log } from '@dxos/log';
import { PublicKey, useClient } from '@dxos/react-client';
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
  List,
  ListItem,
} from '@dxos/react-ui';
import { AttentionGlyph } from '@dxos/react-ui-deck';
import { ComplexMap, keyToFallback } from '@dxos/util';

import { SPACE_PLUGIN } from '../meta';
import type { ObjectViewerProps, SpacePluginProvides } from '../types';

const defaultViewers = new ComplexMap<PublicKey, ObjectViewerProps>(PublicKey.hash);

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

  const currentObjectViewers = spacePlugin.provides.space.viewersByObject.get(object.id) ?? defaultViewers;
  const viewing = spacePlugin.provides.space.viewersByIdentity;

  const members = spaceMembers
    .filter((member) => member.presence === 1 && !identity.identityKey.equals(member.identity.identityKey))
    .map((member) => ({
      ...member,
      match: currentObjectViewers.has(member.identity.identityKey),
      lastSeen: currentObjectViewers.get(member.identity.identityKey)?.lastSeen ?? Infinity,
    }))
    .toSorted((a, b) => a.lastSeen - b.lastSeen);

  return density === 'fine' ? (
    <SmallPresence members={members.filter((member) => member.match)} />
  ) : (
    <FullPresence
      members={members}
      onMemberClick={(member) => {
        if (
          !currentObjectViewers.has(member.identity.identityKey) &&
          (viewing.get(member.identity.identityKey)?.size ?? 0) > 0
        ) {
          void dispatch({
            action: NavigationAction.ACTIVATE,
            // TODO(thure): Multitasking will make this multifarious; implement a way to follow other members that
            //  doesn’t assume they can only view one object at a time.
            data: { id: Array.from(viewing.get(member.identity.identityKey)!)[0] },
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
} & Pick<NonNullable<Identity['profile']>, 'hue' | 'emoji'>;

const PrensenceAvatar = ({ identity, showName, match, group, index, onClick, hue, emoji }: PresenceAvatarProps) => {
  const Root = group ? AvatarGroupItem.Root : Avatar.Root;
  const status = match ? 'current' : 'active';
  const fallbackValue = keyToFallback(identity.identityKey);
  return (
    <Root status={status} hue={hue || fallbackValue.hue}>
      <Avatar.Frame
        data-testid='spacePlugin.presence.member'
        data-status={status}
        {...(index ? { style: { zIndex: index } } : {})}
        onClick={() => onClick?.()}
      >
        <Avatar.Fallback text={emoji || fallbackValue.emoji} />
      </Avatar.Frame>
      {showName && <Avatar.Label classNames='text-sm truncate pli-2'>{getName(identity)}</Avatar.Label>}
    </Root>
  );
};

export const SmallPresence = (props: Omit<MemberPresenceProps, 'size'>) => {
  const { members = [] } = props;
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <AttentionGlyph
          presence={members.length > 1 ? 'many' : members.length === 1 ? 'one' : 'none'}
          classNames='self-center mie-1'
        />
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
