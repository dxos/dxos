//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { useAppGraph, useCapability } from '@dxos/app-framework';
import { generateName } from '@dxos/display-name';
import { type Expando } from '@dxos/echo-schema';
import { PublicKey, useClient } from '@dxos/react-client';
import { getSpace, useMembers, type SpaceMember, fullyQualifiedId } from '@dxos/react-client/echo';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import {
  Avatar,
  AvatarGroup,
  AvatarGroupItem,
  type Size,
  type ThemedClassName,
  Tooltip,
  useTranslation,
  List,
  ListItem,
  useDefaultValue,
} from '@dxos/react-ui';
import { AttentionGlyph, useAttended, useAttention, type AttentionGlyphProps } from '@dxos/react-ui-attention';
import { ComplexMap, keyToFallback } from '@dxos/util';

import { SpaceCapabilities } from '../capabilities';
import { usePath } from '../hooks';
import { SPACE_PLUGIN } from '../meta';
import type { ObjectViewerProps } from '../types';

// TODO(thure): Get/derive these values from protocol
const REFRESH_INTERVAL = 5000;
const ACTIVITY_DURATION = 30_000;

// TODO(thure): This is chiefly meant to satisfy TS & provide an empty map after `deepSignal` interactions.
const noViewers = new ComplexMap<PublicKey, ObjectViewerProps>(PublicKey.hash);

// TODO(wittjosiah): Factor out?
const getName = (identity: Identity) => identity.profile?.displayName ?? generateName(identity.identityKey.toHex());

export const SpacePresence = ({ object, spaceKey }: { object: Expando; spaceKey?: PublicKey }) => {
  // TODO(wittjosiah): Doesn't need to be mutable but readonly type messes with ComplexMap.
  const spaceState = useCapability(SpaceCapabilities.MutableState);
  const client = useClient();
  const identity = useIdentity();
  const space = spaceKey ? client.spaces.get(spaceKey) : getSpace(object);
  const spaceMembers = useMembers(space?.key);

  const [_moment, setMoment] = useState(Date.now());

  // NOTE(thure): This is necessary so Presence updates without any underlying data updating.
  useEffect(() => {
    const interval = setInterval(() => setMoment(Date.now()), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const memberOnline = useCallback((member: SpaceMember) => member.presence === 1, []);
  const memberIsNotSelf = useCallback(
    (member: SpaceMember) => !identity?.identityKey.equals(member.identity.identityKey),
    [identity?.identityKey],
  );

  // TODO(thure): Could it be a smell to return early when there are interactions with `deepSignal` later, since it
  //  prevents reactivity?
  if (!identity || !spaceState || !space) {
    return null;
  }

  const currentObjectViewers = spaceState.viewersByObject[fullyQualifiedId(object)] ?? noViewers;

  const membersForObject = spaceMembers
    .filter((member) => memberOnline(member) && memberIsNotSelf(member))
    .filter((member) => currentObjectViewers.has(member.identity.identityKey))
    .map((member) => {
      const objectView = currentObjectViewers.get(member.identity.identityKey);
      const lastSeen = objectView?.lastSeen ?? -Infinity;
      const currentlyAttended = objectView?.currentlyAttended ?? false;

      return {
        ...member,
        currentlyAttended,
        lastSeen,
      };
    })
    .toSorted((a, b) => a.lastSeen - b.lastSeen);

  return <FullPresence members={membersForObject} />;
};

export type Member = SpaceMember & {
  /**
   * Last time a member was seen on this object.
   */
  lastSeen: number;
  currentlyAttended: boolean;
};

export type MemberPresenceProps = ThemedClassName<{
  size?: Size;
  members?: Member[];
  showCount?: boolean;
  onMemberClick?: (member: Member) => void;
}>;

export const FullPresence = (props: MemberPresenceProps) => {
  const { size = 9, onMemberClick } = props;
  const members = useDefaultValue(props.members, () => []);

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
              match={member.currentlyAttended} // TODO(Zan): Match always true now we're showing 'members viewing current object'.
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
                    {/* TODO(Zan): Match always true now we're showing 'members viewing current object'. */}
                    <PrensenceAvatar identity={member.identity} showName match={member.currentlyAttended} />
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
  const fallbackValue = keyToFallback(identity.identityKey);
  return (
    <Root status={status} hue={identity.profile?.data?.hue || fallbackValue.hue}>
      <Avatar.Frame
        data-testid='spacePlugin.presence.member'
        data-status={status}
        {...(index ? { style: { zIndex: index } } : {})}
        onClick={() => onClick?.()}
      >
        <Avatar.Fallback text={identity.profile?.data?.emoji || fallbackValue.emoji} />
      </Avatar.Frame>
      {showName && <Avatar.Label classNames='text-sm truncate pli-2'>{getName(identity)}</Avatar.Label>}
    </Root>
  );
};

export type SmallPresenceLiveProps = {
  id?: string;
  open?: boolean;
  viewers?: ComplexMap<PublicKey, ObjectViewerProps>;
};

export const SmallPresenceLive = ({ id, open, viewers }: SmallPresenceLiveProps) => {
  const { hasAttention, isAncestor, isRelated } = useAttention(id);
  const isAttended = hasAttention || isAncestor || isRelated;

  // TODO(wittjosiah): If the attended node is deep in the graph and the graph is not fully loaded
  //   this will result in an empty path until the graph is connected.
  // TODO(wittjosiah): Consider using this indicator for all open nodes instead of just attended.
  const { graph } = useAppGraph();
  const attended = useAttended();
  const startOfAttention = attended.at(-1);
  const path = usePath(graph, startOfAttention);
  const containsAttended = !open && !isAttended && id && path ? path.includes(id) : false;

  const getActiveViewers = (viewers: ComplexMap<PublicKey, ObjectViewerProps>): ObjectViewerProps[] => {
    const moment = Date.now();
    return Array.from<ObjectViewerProps>(viewers.values()).filter(
      (viewer) => moment - viewer.lastSeen < ACTIVITY_DURATION,
    );
  };

  const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers(viewers) : []);

  useEffect(() => {
    if (viewers) {
      setActiveViewers(getActiveViewers(viewers));
      const interval = setInterval(() => {
        setActiveViewers(getActiveViewers(viewers));
      }, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [viewers]);

  return <SmallPresence count={activeViewers.length} attended={isAttended} containsAttended={containsAttended} />;
};

export type SmallPresenceProps = {
  count?: number;
} & Pick<AttentionGlyphProps, 'attended' | 'containsAttended'>;

export const SmallPresence = ({ count = 0, attended, containsAttended }: SmallPresenceProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <AttentionGlyph
          attended={attended}
          containsAttended={containsAttended}
          presence={count > 1 ? 'many' : count === 1 ? 'one' : 'none'}
          classNames='self-center mie-1'
        />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom'>
          <span>{t('presence label', { count })}</span>
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
