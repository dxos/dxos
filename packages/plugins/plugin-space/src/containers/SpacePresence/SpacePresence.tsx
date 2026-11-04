//
// Copyright 2023 DXOS.org
//

import React, { type ComponentProps, type ReactNode, forwardRef, useCallback, useEffect, useState } from 'react';

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

import { SpaceCapabilities, type SpaceSchema } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import {
  MEMBERS_COMPANION_ID,
  type ObjectViewers,
  type PeerSession,
  countViewers,
  getFreshSessions,
  getPeerNodeId,
  getSessionNodeId,
  isMoving,
} from '../../util/index.ts';
import { PeerActions, useExpandPeerNodes } from './PeerActions.tsx';

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

/** Whether presence lists show a row per session rather than per person; kept per device. */
export const useShowSessions = (): [boolean, (showSessions: boolean) => void] => {
  const [state, updateState] = Hooks.useAtomCapabilityState(SpaceCapabilities.State);
  const setShowSessions = useCallback(
    (showSessions: boolean) => updateState((state) => ({ ...state, showSessions })),
    [updateState],
  );
  return [state.showSessions ?? false, setShowSessions];
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
  const [showSessions, setShowSessions] = useShowSessions();
  const viewers = (presenceKey && ephemeral?.viewersByObject[presenceKey]) || {};
  // Ready before the list opens, so its rows' actions do not appear after it.
  useExpandPeerNodes(
    spaceId
      ? Object.entries(viewers).flatMap(([identityKey, sessions]) => [
          getPeerNodeId(spaceId, identityKey),
          ...Object.keys(sessions).map((sessionId) => getSessionNodeId(spaceId, identityKey, sessionId)),
        ])
      : [],
  );

  if (!identity || !ephemeral || !presenceKey) {
    return null;
  }

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
      showSessions={showSessions}
      renderActions={(member, sessionId) =>
        spaceId && member.identityKey ? (
          <PeerActions spaceId={spaceId} identityKey={member.identityKey} sessionId={sessionId} />
        ) : null
      }
      headerAction={
        <>
          <SessionsToggle pressed={showSessions} onPressedChange={setShowSessions} />
          <SeeEveryoneButton />
        </>
      }
    />
  );
};

const SessionsToggle = ({
  pressed,
  onPressedChange,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  return (
    <Button.Toggle
      variant='ghost'
      icon='ph--devices--regular'
      iconOnly
      label={t('presence-show-sessions.label')}
      pressed={pressed}
      onPressedChange={onPressedChange}
      data-testid='spacePlugin.presence.showSessions'
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
  /** The session the member's row acts on; the member's most recently moved session anywhere when unset. */
  defaultSessionId?: string;
};

const isAttending = (member: Member) => member.sessions.some((session) => session.currentlyAttended);

type AvatarSize = ComponentProps<typeof Avatar.Root>['size'];

export type MemberPresenceProps = Util.ThemedClassName<{
  size?: AvatarSize;
  members?: Member[];
  showCount?: boolean;
  /** A row per session rather than per member. */
  showSessions?: boolean;
  /** Controls on a member's row, or on one of their session's rows, e.g. its graph actions. */
  renderActions?: (member: Member, sessionId?: string) => ReactNode;
  /** A control at the end of the list's header, e.g. a link to everyone in the space. */
  headerAction?: ReactNode;
}>;

/** Avatars of the members on an object; clicking any opens the full list, with the clicked member's row highlighted. */
export const FullPresence = (props: MemberPresenceProps) => {
  const { size = 'md', showSessions, renderActions, headerAction } = props;
  const members = UiHooks.useDefaultValue(props.members, () => []);
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string>();
  const openList = (member?: Member) => {
    setHighlighted(member?.rowId);
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
                onClick={() => openList(member)}
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
      {/* The Members companion's size, so the two lists read alike; the plank header's would be larger. */}
      <Popover.Content size='md' classNames='w-96'>
        <Popover.Header>
          <Popover.Title>{t('presence-in-object.heading', { count: members.length })}</Popover.Title>
          {headerAction}
        </Popover.Header>
        {/* The header keeps a gap from the panel's top edge; the list keeps the same from its bottom. */}
        <Popover.Body classNames='pb-2'>
          <Listbox.Root
            items={getPresenceOptions(members, showSessions, t)}
            value={highlighted ?? ''}
            onValueChange={setHighlighted}
          >
            <Listbox.Content aria-label={t('presence-in-object.heading', { count: members.length })}>
              {members.map((member) => (
                <PresenceItems
                  key={member.rowId}
                  member={member}
                  showSessions={showSessions}
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

const getSessionRowId = (member: Member, session: PeerSession) => `${member.rowId}/${session.sessionId}`;

type Translate = ReturnType<typeof UiHooks.useTranslation>['t'];

/** A device's label, else what it runs ("Chrome on macOS", or the app on its OS). */
const getDeviceName = (device: SpaceSchema.SessionDevice | undefined, t: Translate): string => {
  if (device?.label) {
    return device.label;
  }
  if (device?.kind === 'native' || device?.kind === 'mobile') {
    return device.os ? t('presence-app-device.label', { os: device.os }) : t('presence-app.label');
  }
  if (device?.platform && device.os) {
    return t('presence-device.label', { platform: device.platform, os: device.os });
  }
  return device?.platform ?? device?.os ?? t('presence-unknown-device.label');
};

type SessionRow = { session: PeerSession; name: string };

/** A member's sessions by device name, numbered where several (tabs) run on the same device, in a stable order. */
const getSessionRows = (member: Member, t: Translate): SessionRow[] => {
  const byDevice = new Map<string, PeerSession[]>();
  for (const session of member.sessions.toSorted((a, b) => a.sessionId.localeCompare(b.sessionId))) {
    const device = getDeviceName(session.device, t);
    byDevice.set(device, [...(byDevice.get(device) ?? []), session]);
  }
  return [...byDevice.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .flatMap(([device, sessions]) =>
      sessions.map((session, i) => ({
        session,
        name: sessions.length > 1 ? t('presence-numbered-device.label', { device, index: i + 1 }) : device,
      })),
    );
};

/** Listbox options for members' rows, each followed by its sessions' rows with `showSessions`. */
export const getPresenceOptions = (members: Member[], showSessions: boolean | undefined, t: Translate) =>
  members.flatMap((member) => [
    { value: member.rowId, label: getName(member) },
    ...(showSessions
      ? getSessionRows(member, t).map(({ session, name }) => ({ value: getSessionRowId(member, session), label: name }))
      : []),
  ]);

export type PresenceItemsProps = {
  member: Member;
  showSessions?: boolean;
  /** Controls at the end of a row, e.g. the member's graph actions; `sessionId` is set on a session's row. */
  renderActions?: (member: Member, sessionId?: string) => ReactNode;
};

/**
 * A member's Listbox row: avatar, name, then their actions. With `showSessions` a row per session
 * follows it, with whether the session moved lately and its device; the actions move to those rows. The member's rows
 * hover and highlight as one.
 */
export const PresenceItems = ({ member, showSessions, renderActions }: PresenceItemsProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  return (
    <div
      role='group'
      aria-label={getName(member)}
      className='rounded-sm [&:is(:hover,:has([data-highlighted]))]:bg-hover-surface-subtle [&>.dx-row]:bg-transparent'
    >
      <Listbox.Item id={member.rowId} data-testid='spacePlugin.presence.row'>
        {/* Smaller than the row, so the row's hover and highlight frame it. */}
        <Listbox.ItemIcon>
          <PresenceAvatar member={member} size='sm' />
        </Listbox.ItemIcon>
        <Listbox.ItemText>{getName(member)}</Listbox.ItemText>
        {!showSessions && renderActions?.(member, member.defaultSessionId)}
      </Listbox.Item>
      {showSessions &&
        getSessionRows(member, t).map(({ session, name }) => {
          const active = isMoving(session, member.now);
          return (
            <Listbox.Item
              key={session.sessionId}
              id={getSessionRowId(member, session)}
              data-testid='spacePlugin.presence.session'
            >
              {/* The dot sits under the avatar, so the device lines up with the member's name. */}
              <Listbox.ItemIcon>
                <span
                  role='img'
                  aria-label={t(active ? 'presence-active.label' : 'presence-idle.label')}
                  data-active={active ? '' : undefined}
                  className='size-2 rounded-full bg-neutral-border data-[active]:bg-success-text'
                />
              </Listbox.ItemIcon>
              <Listbox.ItemText classNames='ps-2'>{name}</Listbox.ItemText>
              {renderActions?.(member, session.sessionId)}
            </Listbox.Item>
          );
        })}
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
    // Rows leave `match` unset and draw no ring: its gap is painted in the surface colour, which shows on hover.
    const status = match === undefined ? undefined : match ? 'current' : 'inactive';
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
