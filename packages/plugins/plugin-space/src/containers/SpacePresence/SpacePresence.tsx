//
// Copyright 2023 DXOS.org
//

import React, { type ComponentProps, forwardRef, useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { generateName } from '@dxos/display-name';
import { type Key } from '@dxos/echo';
import { type Space } from '@dxos/halo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { type EID } from '@dxos/keys';
import { AttentionGlyph, type AttentionGlyphProps, useAttention } from '@dxos/react-ui-attention';
import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Popover from '@dxos/react-ui/Popover';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import type * as Util from '@dxos/react-ui/Util';
import { hexToFallback } from '@dxos/util';

import { SpaceCapabilities, SpaceSchema } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import { PRESENCE_EXPIRY } from '../../util/index.ts';

const REFRESH_INTERVAL = 5000;

// TODO(wittjosiah): Factor out?
const getName = (member: Space.Member) => member.displayName ?? generateName(member.identityKey ?? '0');

const byIdentityKey = (a: Space.Member, b: Space.Member) => (a.identityKey ?? '').localeCompare(b.identityKey ?? '');

const isActive = (viewer: SpaceSchema.ObjectViewerProps, now: number) => now - viewer.lastSeen < PRESENCE_EXPIRY;

const useNow = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);
  return now;
};

export const useActiveViewerCount = (viewers?: Record<string, SpaceSchema.ObjectViewerProps>) => {
  const now = useNow();
  return viewers ? Object.values(viewers).filter((viewer) => isActive(viewer, now)).length : 0;
};

export type SpacePresenceProps = {
  spaceId?: Key.SpaceId;
  presenceKey?: EID.EID;
};

export const SpacePresence = ({ spaceId, presenceKey }: SpacePresenceProps) => {
  const ephemeral = Hooks.useAtomCapability(SpaceCapabilities.EphemeralState);
  const identity = useIdentity();
  const spaceMembers = useMembers(spaceId);
  const now = useNow();

  if (!identity || !ephemeral || !presenceKey) {
    return null;
  }

  const viewers = ephemeral.viewersByObject[presenceKey] ?? {};
  const members = spaceMembers
    .flatMap((member) => {
      const viewer = member.identityKey ? viewers[member.identityKey] : undefined;
      if (!member.online || member.identityKey === identity.identityKey || !viewer || !isActive(viewer, now)) {
        return [];
      }
      return [{ ...member, currentlyAttended: viewer.currentlyAttended, lastSeen: viewer.lastSeen }];
    })
    .toSorted(byIdentityKey);

  return <FullPresence members={members} />;
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
                <Listbox.Viewport>
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
                </Listbox.Viewport>
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
    const status = match ? 'current' : 'inactive';
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
  viewers?: Record<string, SpaceSchema.ObjectViewerProps>;
};

export const SmallPresenceLive = ({ id, open, viewers }: SmallPresenceLiveProps) => {
  const { hasAttention, isAncestor, isRelated } = useAttention(id);
  const count = useActiveViewerCount(viewers);

  return <SmallPresence count={count} attended={hasAttention || isRelated} containsAttended={isAncestor && !open} />;
};

export type SmallPresenceProps = {
  count?: number;
} & Pick<AttentionGlyphProps, 'attended' | 'containsAttended'>;

export const SmallPresence = ({ count = 0, attended, containsAttended }: SmallPresenceProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);

  return (
    <Tooltip.Trigger asChild content={t('presence.label', { count })} side='bottom'>
      <AttentionGlyph
        attended={attended}
        containsAttended={containsAttended}
        presence={count > 1 ? 'many' : count === 1 ? 'one' : 'none'}
        classNames='self-center mx-1'
      />
    </Tooltip.Trigger>
  );
};

SpacePresence.displayName = 'SpacePresence';
