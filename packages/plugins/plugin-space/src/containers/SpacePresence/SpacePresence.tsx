//
// Copyright 2023 DXOS.org
//

import React, { type ComponentProps, type ReactNode, forwardRef, useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { generateName } from '@dxos/display-name';
import { type Key } from '@dxos/echo';
import { type Space } from '@dxos/halo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { type EID } from '@dxos/keys';
import { AttentionGlyph, type AttentionGlyphProps, useAttention } from '@dxos/react-ui-attention';
import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Popover from '@dxos/react-ui/Popover';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import type * as Util from '@dxos/react-ui/Util';
import { hexToFallback } from '@dxos/util';

import { SpaceCapabilities, SpaceSchema } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import { MEMBERS_COMPANION_ID, PRESENCE_EXPIRY } from '../../util/index.ts';
import { PeerActions } from './PeerActions.tsx';

const REFRESH_INTERVAL = 5000;

// TODO(wittjosiah): Factor out?
const getName = (member: Space.Member) => member.displayName ?? generateName(member.identityKey ?? '0');

const byIdentityKey = (a: Space.Member, b: Space.Member) => (a.identityKey ?? '').localeCompare(b.identityKey ?? '');

const isActive = (viewer: SpaceSchema.ObjectViewerProps, now: number) => now - viewer.lastSeen < PRESENCE_EXPIRY;

export const useNow = () => {
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

  return (
    <FullPresence
      members={members}
      renderActions={(member) =>
        spaceId && member.identityKey ? <PeerActions spaceId={spaceId} identityKey={member.identityKey} /> : null
      }
      headerAction={<SeeEveryoneButton />}
    />
  );
};

/** Opens the Members companion, which lists everyone in the space. */
const SeeEveryoneButton = () => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  return (
    <Popover.CloseTrigger asChild>
      <Button.Root
        variant='ghost'
        icon='ph--users--regular'
        iconOnly
        label={t('presence-see-everyone.label')}
        data-testid='spacePlugin.presence.seeEveryone'
        onClick={() =>
          void invokePromise(LayoutOperation.UpdateComplementary, { subject: MEMBERS_COMPANION_ID, state: 'expanded' })
        }
      />
    </Popover.CloseTrigger>
  );
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
  /** Controls shown on a member's row in the list, e.g. their graph actions. */
  renderActions?: (member: Member) => ReactNode;
  /** A control at the end of the list's header, e.g. a link to everyone in the space. */
  headerAction?: ReactNode;
}>;

/** Avatars of the members on an object; clicking any opens the full list, with the clicked member's row highlighted. */
export const FullPresence = (props: MemberPresenceProps) => {
  const { size = 'md', renderActions, headerAction } = props;
  const members = UiHooks.useDefaultValue(props.members, () => []);
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string>();
  const openList = (identityKey?: string) => {
    setHighlighted(identityKey);
    setOpen(true);
  };

  if (members.length === 0) {
    return null;
  }

  return (
    <Popover.Root open={open} onOpenChange={({ open }) => setOpen(open)} positioning={{ placement: 'bottom-end' }}>
      <Popover.Anchor asChild>
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
                match={member.currentlyAttended}
                index={members.length - i}
                onClick={() => openList(member.identityKey)}
                size={size}
              />
            </Tooltip.Trigger>
          ))}
          {members.length > 3 && (
            <Avatar.Root
              status='inactive'
              style={{ zIndex: members.length - 4 }}
              fallback={`+${members.length - 3}`}
              size={size}
              onClick={() => openList()}
            />
          )}
        </div>
      </Popover.Anchor>
      <Popover.Content classNames='w-80'>
        <Popover.Header>
          <Popover.Title>{t('presence-in-object.heading', { count: members.length })}</Popover.Title>
          {headerAction}
        </Popover.Header>
        <Popover.Body>
          <Listbox.Root items={getPresenceOptions(members)} value={highlighted ?? ''} onValueChange={setHighlighted}>
            <Listbox.Content aria-label={t('presence-in-object.heading', { count: members.length })}>
              {members.map((member) => (
                <PresenceItem key={member.identityKey} member={member} renderActions={renderActions} />
              ))}
            </Listbox.Content>
          </Listbox.Root>
        </Popover.Body>
      </Popover.Content>
    </Popover.Root>
  );
};

/** Listbox options for members' rows, keyed by identity key. */
export const getPresenceOptions = (members: Member[]) =>
  members.flatMap((member) => (member.identityKey ? [{ value: member.identityKey, label: getName(member) }] : []));

export type PresenceItemProps = {
  member: Member;
  /** Controls at the end of the row, e.g. the member's graph actions. */
  renderActions?: (member: Member) => ReactNode;
};

/** A member's Listbox row: avatar, name, then their actions. */
export const PresenceItem = ({ member, renderActions }: PresenceItemProps) =>
  member.identityKey ? (
    <Listbox.Item id={member.identityKey} data-testid='spacePlugin.presence.row'>
      <PresenceAvatar member={member} size='sm' match={member.currentlyAttended} />
      <Listbox.ItemText />
      {renderActions?.(member)}
    </Listbox.Item>
  ) : null;

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
