//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { NavigationAction, useIntentDispatcher, usePlugin } from '@dxos/app-framework';
import { generateName } from '@dxos/display-name';
import { type Expando } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { PublicKey, useClient } from '@dxos/react-client';
import { getSpace, useSpace, useMembers, type SpaceMember, fullyQualifiedId } from '@dxos/react-client/echo';
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
  useDefaultValue,
} from '@dxos/react-ui';
import { AttentionGlyphCloseButton } from '@dxos/react-ui-deck';
import { ComplexMap, keyToFallback } from '@dxos/util';

import { SPACE_PLUGIN } from '../meta';
import type { ObjectViewerProps, SpacePluginProvides } from '../types';

// TODO(thure): Get/derive these values from protocol
const REFRESH_INTERVAL = 10_000;
const ACTIVITY_DURATION = 30_000;

// TODO(thure): This is chiefly meant to satisfy TS & provide an empty map after `deepSignal` interactions.
const noViewers = new ComplexMap<PublicKey, ObjectViewerProps>(PublicKey.hash);

// TODO(wittjosiah): Factor out?
const getName = (identity: Identity) => identity.profile?.displayName ?? generateName(identity.identityKey.toHex());

export const SpacePresence = ({ object, spaceKey }: { object: Expando; spaceKey?: PublicKey }) => {
  const density = useDensityContext();
  const dispatch = useIntentDispatcher();
  const spacePlugin = usePlugin<SpacePluginProvides>(SPACE_PLUGIN);
  const client = useClient();
  const identity = useIdentity();
  const defaultSpace = useSpace();
  const space = spaceKey ? client.spaces.get(spaceKey) : getSpace(object);
  const spaceMembers = useMembers(space?.key);

  const [moment, setMoment] = useState(Date.now());

  // NOTE(thure): This is necessary so Presence updates without any underlying data updating.
  useEffect(() => {
    const interval = setInterval(() => setMoment(Date.now()), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // TODO(thure): Could it be a smell to return early when there are interactions with `deepSignal` later, since it
  //  prevents reactivity?
  if (!identity || !spacePlugin || !space || defaultSpace?.key.equals(space.key)) {
    return null;
  }

  const spaceState = spacePlugin.provides.space;
  const currentObjectViewers = spaceState.viewersByObject[fullyQualifiedId(object)] ?? noViewers;
  const viewing = spaceState.viewersByIdentity;

  const members = spaceMembers
    .filter((member) => member.presence === 1 && !identity.identityKey.equals(member.identity.identityKey))
    .map((member) => {
      const lastSeen = currentObjectViewers.get(member.identity.identityKey)?.lastSeen ?? -Infinity;
      // If the member was not seen within the activity duration, they are not considered active on the object.
      const match = moment - lastSeen < ACTIVITY_DURATION;
      return {
        ...member,
        match,
        lastSeen,
      };
    })
    .toSorted((a, b) => a.lastSeen - b.lastSeen);

  return density === 'fine' ? (
    <SmallPresence count={members.filter((member) => member.match).length} />
  ) : (
    <FullPresence
      members={members}
      onMemberClick={(member) => {
        if (
          !currentObjectViewers.has(member.identity.identityKey) &&
          (viewing.get(member.identity.identityKey)?.size ?? 0) > 0
        ) {
          void dispatch({
            action: NavigationAction.OPEN,
            data: { activeParts: { main: Array.from(viewing.get(member.identity.identityKey)!) } },
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
  const { size = 9, onMemberClick } = props;
  const members = useDefaultValue(props.members, []);

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

export const SmallPresenceLive = ({
  viewers,
  onCloseClick,
}: {
  viewers?: ComplexMap<PublicKey, ObjectViewerProps>;
  onCloseClick?: () => void;
}) => {
  const [moment, setMoment] = useState(Date.now());

  // NOTE(thure): This is necessary so Presence updates without any underlying data updating.
  useEffect(() => {
    const interval = setInterval(() => setMoment(Date.now()), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const activeViewers = viewers
    ? Array.from(viewers.values()).filter(({ lastSeen }) => moment - lastSeen < ACTIVITY_DURATION)
    : [];

  return <SmallPresence count={activeViewers.length} onCloseClick={onCloseClick} />;
};

export const SmallPresence = ({ count, onCloseClick }: { count: number; onCloseClick?: () => void }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <AttentionGlyphCloseButton
          presence={count > 1 ? 'many' : count === 1 ? 'one' : 'none'}
          classNames='self-center mie-1'
          onClick={onCloseClick}
        />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom' classNames='z-[70]'>
          <span>{t('presence label', { count })}</span>
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
