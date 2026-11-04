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
import * as Collapsible from '@dxos/react-ui/Collapsible';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Popover from '@dxos/react-ui/Popover';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import type * as Util from '@dxos/react-ui/Util';
import { hexToFallback } from '@dxos/util';

import { SpaceCapabilities } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import {
  MEMBERS_COMPANION_ID,
  type ObjectViewers,
  type PeerSession,
  countViewers,
  getFreshSessions,
  isMoving,
} from '../../util/index.ts';
import { PeerActions } from './PeerActions.tsx';

const REFRESH_INTERVAL = 5000;

// TODO(wittjosiah): Factor out?
const getName = (member: Space.Member) => member.displayName ?? generateName(member.identityKey ?? '0');

const byIdentityKey = (a: Space.Member, b: Space.Member) => (a.identityKey ?? '').localeCompare(b.identityKey ?? '');

export const useNow = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);
  return now;
};

export const useActiveViewerCount = (viewers?: ObjectViewers) => {
  const now = useNow();
  return countViewers(viewers, now);
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
      const sessions = getFreshSessions(member.identityKey ? viewers[member.identityKey] : undefined, now);
      if (!member.online || member.identityKey === identity.identityKey || sessions.length === 0) {
        return [];
      }
      return [{ ...member, rowId: member.identityKey ?? '', sessions, now }];
    })
    .toSorted(byIdentityKey);

  return (
    <FullPresence
      members={members}
      renderActions={(member, sessionId) =>
        spaceId && member.identityKey ? (
          <PeerActions spaceId={spaceId} identityKey={member.identityKey} sessionId={sessionId} />
        ) : null
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
  /** Id of the member's Listbox row, unique in its list. */
  rowId: string;
  /** The member's sessions on the object, the most recently moved first. */
  sessions: PeerSession[];
  /** When the sessions were read, to tell which are moving. */
  now: number;
  /** The session the collapsed row acts on; the member's most recently moved session anywhere when unset. */
  defaultSessionId?: string;
};

const isAttending = (member: Member) => member.sessions.some((session) => session.currentlyAttended);

type AvatarSize = ComponentProps<typeof Avatar.Root>['size'];

export type MemberPresenceProps = Util.ThemedClassName<{
  size?: AvatarSize;
  members?: Member[];
  showCount?: boolean;
  /** Controls on a member's row, or on one of their session's rows, e.g. its graph actions. */
  renderActions?: (member: Member, sessionId?: string) => ReactNode;
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
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
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
                match={isAttending(member)}
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
      <Popover.Content classNames='w-96'>
        <Popover.Header>
          <Popover.Title>{t('presence-in-object.heading', { count: members.length })}</Popover.Title>
          {headerAction}
        </Popover.Header>
        {/* The header keeps a gap from the panel's top edge; the list keeps the same from its bottom. */}
        <Popover.Body classNames='pb-2'>
          <Listbox.Root
            items={getPresenceOptions(members, expanded)}
            value={highlighted ?? ''}
            onValueChange={setHighlighted}
          >
            <Listbox.Content aria-label={t('presence-in-object.heading', { count: members.length })}>
              {members.map((member) => (
                <PresenceItem
                  key={member.rowId}
                  member={member}
                  open={expanded.has(member.rowId)}
                  onOpenChange={(open) => setExpanded(toggle(expanded, member.rowId, open))}
                  renderActions={renderActions}
                />
              ))}
            </Listbox.Content>
          </Listbox.Root>
        </Popover.Body>
      </Popover.Content>
    </Popover.Root>
  );
};

/** Adds or removes `id` from the set of expanded rows. */
export const toggle = (expanded: ReadonlySet<string>, id: string, open: boolean): ReadonlySet<string> => {
  const next = new Set(expanded);
  if (open) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
};

const getSessionRowId = (member: Member, session: PeerSession) => `${member.rowId}/${session.sessionId}`;

/** Each session's device name, numbered where several sessions (tabs) run on the same device. */
const getSessionNames = (sessions: PeerSession[], unknown: string): Map<string, string> => {
  const byDevice = new Map<string, string[]>();
  for (const { sessionId, device = unknown } of sessions.toSorted((a, b) => a.sessionId.localeCompare(b.sessionId))) {
    byDevice.set(device, [...(byDevice.get(device) ?? []), sessionId]);
  }
  const names = new Map<string, string>();
  for (const [device, sessionIds] of byDevice) {
    sessionIds.forEach((sessionId, i) => names.set(sessionId, sessionIds.length > 1 ? `${device} (${i + 1})` : device));
  }
  return names;
};

/** Listbox options for members' rows, and their sessions' rows while expanded. */
export const getPresenceOptions = (members: Member[], expanded: ReadonlySet<string>) =>
  members.flatMap((member) => [
    { value: member.rowId, label: getName(member) },
    ...(member.sessions.length > 1 && expanded.has(member.rowId)
      ? member.sessions.map((session) => ({ value: getSessionRowId(member, session), label: session.device ?? '' }))
      : []),
  ]);

export type PresenceItemProps = {
  member: Member;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controls at the end of the row, e.g. the member's graph actions; `sessionId` is set on a session's row. */
  renderActions?: (member: Member, sessionId?: string) => ReactNode;
};

/**
 * A member's Listbox row: avatar, name, then their actions. With more than one session it expands to a row per session,
 * and the actions move to those rows.
 */
export const PresenceItem = ({ member, open, onOpenChange, renderActions }: PresenceItemProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const names = getSessionNames(member.sessions, t('presence-unknown-device.label'));
  const avatar = (
    <Listbox.ItemIcon>
      <PresenceAvatar member={member} size='md' match={isAttending(member)} />
    </Listbox.ItemIcon>
  );

  if (member.sessions.length < 2) {
    return (
      <Listbox.Item id={member.rowId} data-testid='spacePlugin.presence.row'>
        {avatar}
        <Listbox.ItemText />
        {renderActions?.(member, member.defaultSessionId)}
      </Listbox.Item>
    );
  }

  return (
    <Collapsible.Root open={open} onOpenChange={({ open }) => onOpenChange?.(open)} lazyMount unmountOnExit>
      <Listbox.Item id={member.rowId} data-testid='spacePlugin.presence.row'>
        {avatar}
        <Listbox.ItemText />
        <Listbox.ItemDescription>
          {t('presence-sessions.label', { count: member.sessions.length })}
        </Listbox.ItemDescription>
        {!open && renderActions?.(member, member.defaultSessionId)}
        <Collapsible.Trigger data-testid='spacePlugin.presence.sessions' />
      </Listbox.Item>
      <Collapsible.Content>
        {member.sessions.map((session) => (
          <Listbox.Item
            key={session.sessionId}
            id={getSessionRowId(member, session)}
            data-testid='spacePlugin.presence.session'
          >
            <Listbox.ItemIcon>
              <span
                role='img'
                aria-label={t(isMoving(session, member.now) ? 'presence-active.label' : 'presence-idle.label')}
                data-active={isMoving(session, member.now) ? '' : undefined}
                className='size-2 rounded-full bg-neutral-border data-[active]:bg-success-text'
              />
            </Listbox.ItemIcon>
            <Listbox.ItemText>{names.get(session.sessionId)}</Listbox.ItemText>
            {renderActions?.(member, session.sessionId)}
          </Listbox.Item>
        ))}
      </Collapsible.Content>
    </Collapsible.Root>
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
  viewers?: ObjectViewers;
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
