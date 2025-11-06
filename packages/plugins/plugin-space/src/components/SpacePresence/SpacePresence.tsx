//
// Copyright 2023 DXOS.org
//

import * as Option from 'effect/Option';
import React, { forwardRef, useCallback, useEffect, useState } from 'react';

import { useAppGraph, useCapability } from '@dxos/app-framework/react';
import { generateName } from '@dxos/display-name';
import { type Type } from '@dxos/echo';
import { PublicKey, useClient } from '@dxos/react-client';
import { type SpaceMember, fullyQualifiedId, getSpace, useMembers } from '@dxos/react-client/echo';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import {
  Avatar,
  type AvatarContentProps,
  type DxAvatar,
  List,
  ListItem,
  Popover,
  type Size,
  type ThemedClassName,
  Tooltip,
  useDefaultValue,
  useTranslation,
} from '@dxos/react-ui';
import { AttentionGlyph, type AttentionGlyphProps, useAttended, useAttention } from '@dxos/react-ui-attention';
import { ComplexMap, keyToFallback } from '@dxos/util';

import { SpaceCapabilities } from '../../capabilities';
import { usePath } from '../../hooks';
import { meta } from '../../meta';
import { type ObjectViewerProps } from '../../types';

// TODO(thure): Get/derive these values from protocol
const REFRESH_INTERVAL = 5000;
const ACTIVITY_DURATION = 30_000;

// TODO(thure): This is chiefly meant to satisfy TS & provide an empty map after `deepSignal` interactions.
const noViewers = new ComplexMap<PublicKey, ObjectViewerProps>(PublicKey.hash);

// TODO(wittjosiah): Factor out?
const getName = (identity: Identity) => identity.profile?.displayName ?? generateName(identity.identityKey.toHex());

export type SpacePresenceProps = {
  object: Type.Expando;
  spaceKey?: PublicKey;
};

export const SpacePresence = ({ object, spaceKey }: SpacePresenceProps) => {
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
    <div className='dx-avatar-group' data-testid='spacePlugin.presence'>
      {members.slice(0, 3).map((member, i) => (
        <Tooltip.Trigger
          key={member.identity.identityKey.toHex()}
          side='bottom'
          content={getName(member.identity)}
          className='grid focus:outline-none'
        >
          <PresenceAvatar
            identity={member.identity}
            match={member.currentlyAttended} // TODO(Zan): Match always true now we're showing 'members viewing current object'.
            index={members.length - i}
            onClick={() => onMemberClick?.(member)}
            size={size}
          />
        </Tooltip.Trigger>
      ))}

      {members.length > 3 && (
        <Popover.Root>
          <Popover.Trigger className='grid focus:outline-none'>
            <Avatar.Root>
              {/* TODO(wittjosiah): Make text fit. */}
              <Avatar.Content
                status='inactive'
                style={{ zIndex: members.length - 4 }}
                fallback={`+${members.length - 3}`}
                size={size}
              />
            </Avatar.Root>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content side='bottom'>
              <Popover.Arrow />
              <Popover.Viewport classNames='max-bs-56'>
                <List>
                  {members.map((member) => (
                    <ListItem.Root
                      key={member.identity.identityKey.toHex()}
                      classNames='flex gap-2 items-center cursor-pointer mbe-2'
                      onClick={() => onMemberClick?.(member)}
                      data-testid='identity-list-item'
                    >
                      {/* TODO(Zan): Match always true now we're showing 'members viewing current object'. */}
                      <PresenceAvatar
                        identity={member.identity}
                        size={size}
                        showName
                        match={member.currentlyAttended}
                      />
                    </ListItem.Root>
                  ))}
                </List>
              </Popover.Viewport>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
};

type PresenceAvatarProps = Pick<AvatarContentProps, 'size'> & {
  identity: Identity;
  showName?: boolean;
  match?: boolean;
  index?: number;
  onClick?: () => void;
};

const PresenceAvatar = forwardRef<DxAvatar, PresenceAvatarProps>(
  ({ identity, showName, match, index, onClick, size }, forwardedRef) => {
    const status = match ? 'current' : 'active';
    const fallbackValue = keyToFallback(identity.identityKey);
    return (
      <Avatar.Root>
        <Avatar.Content
          status={status}
          hue={identity.profile?.data?.hue || fallbackValue.hue}
          data-testid='spacePlugin.presence.member'
          data-status={status}
          size={size}
          {...(index ? { style: { zIndex: index } } : {})}
          onClick={onClick}
          fallback={identity.profile?.data?.emoji || fallbackValue.emoji}
          ref={forwardedRef}
        />
        <Avatar.Label classNames={showName ? 'text-sm truncate pli-2' : 'sr-only'}>{getName(identity)}</Avatar.Label>
      </Avatar.Root>
    );
  },
);

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
  const containsAttended = !open && !isAttended && id && Option.isSome(path) ? path.value.includes(id) : false;

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
  const { t } = useTranslation(meta.id);

  return (
    <Tooltip.Trigger asChild content={t('presence label', { count })} side='bottom'>
      <AttentionGlyph
        attended={attended}
        containsAttended={containsAttended}
        presence={count > 1 ? 'many' : count === 1 ? 'one' : 'none'}
        classNames='self-center mie-1'
      />
    </Tooltip.Trigger>
  );
};
