//
// Copyright 2023 DXOS.org
//

import React, { type ComponentProps, forwardRef, useCallback, useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { generateName } from '@dxos/display-name';
import { type Key, Obj } from '@dxos/echo';
import { type Space } from '@dxos/halo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { PublicKey } from '@dxos/keys';
import { useSpace } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
import { Listbox } from '@dxos/react-ui-list';
import * as AttentionGlyph from '@dxos/react-ui/AttentionGlyph';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Popover from '@dxos/react-ui/Popover';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import type * as Util from '@dxos/react-ui/Util';
import { ComplexMap, hexToFallback } from '@dxos/util';

import { meta } from '#meta';
import { SpaceCapabilities, SpaceSchema } from '#types';

// TODO(thure): Get/derive these values from protocol
const REFRESH_INTERVAL = 5000;
const ACTIVITY_DURATION = 30_000;

// TODO(thure): This is chiefly meant to satisfy TS & provide an empty map after `deepSignal` interactions.
const noViewers = new ComplexMap<PublicKey, SpaceSchema.ObjectViewerProps>(PublicKey.hash);

// TODO(wittjosiah): Factor out?
const getName = (member: Space.Member) => member.displayName ?? generateName(member.identityKey ?? '0');

export type SpacePresenceProps = {
  object: Obj.Unknown;
  spaceId?: Key.SpaceId;
};

export const SpacePresence = ({ object, spaceId }: SpacePresenceProps) => {
  const ephemeral = Hooks.useAtomCapability(SpaceCapabilities.EphemeralState);
  const identity = useIdentity();
  const db = Obj.getDatabase(object);
  const space = useSpace(spaceId ?? db?.spaceId);
  const spaceMembers = useMembers(spaceId ?? db?.spaceId);

  const [_moment, setMoment] = useState(Date.now());

  // NOTE(thure): This is necessary so Presence updates without any underlying data updating.
  useEffect(() => {
    const interval = setInterval(() => setMoment(Date.now()), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const memberOnline = useCallback((member: Space.Member) => member.online, []);
  const memberIsNotSelf = useCallback(
    (member: Space.Member) => identity?.identityKey !== member.identityKey,
    [identity?.identityKey],
  );

  // TODO(thure): Could it be a smell to return early when there are interactions with `deepSignal` later, since it
  //  prevents reactivity?
  if (!identity || !ephemeral || !space) {
    return null;
  }

  const currentObjectViewers = ephemeral.viewersByObject[Obj.getURI(object)] ?? noViewers;

  const membersForObject = spaceMembers
    .filter((member) => memberOnline(member) && memberIsNotSelf(member))
    .flatMap((member) => {
      // Presence viewers are keyed by `PublicKey`; the HALO member carries a hex identity key.
      const memberKey = member.identityKey ? PublicKey.fromHex(member.identityKey) : undefined;
      const objectView = memberKey ? currentObjectViewers.get(memberKey) : undefined;
      if (!objectView) {
        return [];
      }
      return [
        {
          ...member,
          currentlyAttended: objectView.currentlyAttended ?? false,
          lastSeen: objectView.lastSeen ?? -Infinity,
        },
      ];
    })
    .toSorted((a, b) => a.lastSeen - b.lastSeen);

  return <FullPresence members={membersForObject} />;
};

export type Member = Space.Member & {
  /**
   * Last time a member was seen on this object.
   */
  lastSeen: number;
  currentlyAttended: boolean;
};

type AvatarSize = ComponentProps<typeof Avatar.Root>['size'];

export type MemberPresenceProps = Util.ThemedClassName<{
  size?: AvatarSize;
  members?: Member[];
  showCount?: boolean;
  onMemberClick?: (member: Member) => void;
}>;

export const FullPresence = (props: MemberPresenceProps) => {
  const { size = 'md', onMemberClick } = props;
  const members = UiHooks.useDefaultValue(props.members, () => []);

  if (members.length === 0) {
    return null;
  }

  return (
    <div className='dx-avatar-group' data-testid='spacePlugin.presence'>
      {members.slice(0, 3).map((member, i) => (
        <Tooltip.Trigger
          key={member.identityKey}
          side='bottom'
          content={getName(member)}
          className='grid focus:outline-hidden'
        >
          <PresenceAvatar
            member={member}
            match={member.currentlyAttended} // TODO(Zan): Match always true now we're showing 'members viewing current object'.
            index={members.length - i}
            onClick={() => onMemberClick?.(member)}
            size={size}
          />
        </Tooltip.Trigger>
      ))}

      {members.length > 3 && (
        <Popover.Root positioning={{ placement: 'bottom' }}>
          <Popover.Trigger className='grid focus:outline-hidden'>
            {/* TODO(wittjosiah): Make text fit. */}
            <Avatar.Root
              status='inactive'
              style={{ zIndex: members.length - 4 }}
              fallback={`+${members.length - 3}`}
              size={size}
            />
          </Popover.Trigger>
          <Popover.Content>
            <Popover.Body classNames='max-h-56'>
              <Listbox.Root
                items={members.map((member) => ({ value: member.identityKey ?? '', label: member.identityKey ?? '' }))}
              >
                <Listbox.Content aria-label='members'>
                  {members.map((member) => (
                    <Listbox.Item
                      key={member.identityKey}
                      id={member.identityKey ?? ''}
                      classNames='flex gap-2 items-center cursor-pointer mb-2'
                      onClick={() => onMemberClick?.(member)}
                      data-testid='identity-list-item'
                    >
                      {/* TODO(Zan): Match always true now we're showing 'members viewing current object'. */}
                      <PresenceAvatar member={member} size={size} showName match={member.currentlyAttended} />
                    </Listbox.Item>
                  ))}
                </Listbox.Content>
              </Listbox.Root>
            </Popover.Body>
          </Popover.Content>
        </Popover.Root>
      )}
    </div>
  );
};

type PresenceAvatarProps = {
  member: Space.Member;
  size?: AvatarSize;
  showName?: boolean;
  match?: boolean;
  index?: number;
  onClick?: () => void;
};

const PresenceAvatar = forwardRef<HTMLDivElement, PresenceAvatarProps>(
  ({ member, showName, match, index, onClick, size }, forwardedRef) => {
    const status = match ? 'current' : 'active';
    const fallbackValue = hexToFallback(member.identityKey ?? '0');
    const name = getName(member);
    const nameId = UiHooks.useId('presence-name');
    const avatar = (
      <Avatar.Root
        status={status}
        hue={Avatar.toAvatarHue(member.data?.hue || fallbackValue.hue)}
        data-testid='spacePlugin.presence.member'
        data-status={status}
        size={size}
        {...(index ? { style: { zIndex: index } } : {})}
        onClick={onClick}
        fallback={member.data?.emoji || fallbackValue.emoji}
        {...(showName ? { 'aria-labelledby': nameId } : { label: name })}
        ref={forwardedRef}
      />
    );
    return showName ? (
      <>
        {avatar}
        <span id={nameId} className='text-sm truncate px-2'>
          {name}
        </span>
      </>
    ) : (
      avatar
    );
  },
);

export type SmallPresenceLiveProps = {
  id?: string;
  open?: boolean;
  viewers?: ComplexMap<PublicKey, SpaceSchema.ObjectViewerProps>;
};

export const SmallPresenceLive = ({ id, open, viewers }: SmallPresenceLiveProps) => {
  const { hasAttention, isAncestor, isRelated } = useAttention(id);
  const attended = hasAttention || isRelated;
  const containsAttended = isAncestor && !open;
  const getActiveViewers = (
    viewers: ComplexMap<PublicKey, SpaceSchema.ObjectViewerProps>,
  ): SpaceSchema.ObjectViewerProps[] => {
    const moment = Date.now();
    return Array.from<SpaceSchema.ObjectViewerProps>(viewers.values()).filter(
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

  return <SmallPresence count={activeViewers.length} attended={attended} containsAttended={containsAttended} />;
};

export type SmallPresenceProps = {
  count?: number;
} & Pick<AttentionGlyph.AttentionGlyphProps, 'attended' | 'containsAttended'>;

export const SmallPresence = ({ count = 0, attended, containsAttended }: SmallPresenceProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);

  return (
    <Tooltip.Trigger asChild content={t('presence.label', { count })} side='bottom'>
      <AttentionGlyph.AttentionGlyph
        attended={attended}
        containsAttended={containsAttended}
        presence={count > 1 ? 'many' : count === 1 ? 'one' : 'none'}
        classNames='self-center mx-1'
      />
    </Tooltip.Trigger>
  );
};

SpacePresence.displayName = 'SpacePresence';
