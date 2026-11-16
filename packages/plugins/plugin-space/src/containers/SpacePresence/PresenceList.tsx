//
// Copyright 2026 DXOS.org
//

import React, {
  type ComponentProps,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { generateName } from '@dxos/display-name';
import { type Key } from '@dxos/echo';
import { type Space } from '@dxos/halo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { EID } from '@dxos/keys';
import { Listbox } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { type Label } from '@dxos/ui-types/translations';
import { hexToFallback } from '@dxos/util';

import { useFollowGroup } from '#hooks';
import { SpaceCapabilities, type SpaceSchema } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import { FOLLOW_HUE, type PeerSession, type ViewersByObject, getFreshSessions, isMoving } from '../../util/index.ts';
import { PeerActions } from './PeerActions.tsx';

const REFRESH_INTERVAL = 5000;

export const getName = (member: Space.Member) => member.displayName ?? generateName(member.identityKey ?? '0');

const byIdentityKey = (a: Space.Member, b: Space.Member) => (a.identityKey ?? '').localeCompare(b.identityKey ?? '');

export const useNow = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);
  return now;
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

export type Member = Space.Member & {
  /** Id of the member's Listbox row, unique in its list. */
  rowId: string;
  /** The member's sessions on the object, the most recently moved first. */
  sessions: PeerSession[];
  /** When the sessions were read, to tell which are moving. */
  now: number;
};

export const isAttending = (member: Member) => member.sessions.some((session) => session.currentlyAttended);

/** The members attending one object. */
export type PresenceGroup = {
  /** The object they attend, which their actions act on. */
  objectKey?: EID.EID;
  /** Shown above the rows; a list of one object's viewers needs none. */
  label?: ReactNode;
  members: Member[];
};

export type PresenceRows = {
  /** The person this session follows, first, with Stop in place of their actions. */
  leader?: Member;
  /** The sessions following this one, in a "Following you" group after the leader. */
  followers: Member[];
  groups: PresenceGroup[];
};

/**
 * The rows of a presence list: everyone else online in the space under each object one of their sessions attends, or,
 * with `objectKey`, only that object's viewers. The leader and the followers are listed apart, before the rest.
 */
export const getPresenceRows = ({
  spaceId,
  objectKey,
  viewersByObject,
  members,
  identityKey,
  leaderKey,
  followerKeys,
  now,
}: {
  spaceId: string;
  objectKey?: EID.EID;
  viewersByObject: ViewersByObject;
  members: readonly Space.Member[];
  identityKey?: string;
  leaderKey?: string;
  followerKeys: ReadonlySet<string>;
  now: number;
}): PresenceRows => {
  const objectKeys = objectKey
    ? [objectKey]
    : Object.keys(viewersByObject).flatMap((key) => {
        const eid = EID.tryParse(key);
        return eid && EID.getSpaceId(eid) === spaceId ? [eid] : [];
      });

  // One object's list keeps a session that moved on until it lapses, as its avatars do; the space's list keeps only the
  // sessions attending each object now, so someone who just moved is listed once.
  const getSessions = (key: string, memberKey: string) => {
    const sessions = getFreshSessions(viewersByObject[key]?.[memberKey], now);
    return objectKey ? sessions : sessions.filter((session) => session.currentlyAttended);
  };
  const getAllSessions = (memberKey: string) => objectKeys.flatMap((key) => getSessions(key, memberKey));
  const sorted = members.toSorted(byIdentityKey);

  const leaderMember = leaderKey ? sorted.find((member) => member.identityKey === leaderKey) : undefined;
  const leaderSessions = leaderKey ? getAllSessions(leaderKey) : [];
  const leader =
    leaderMember && (!objectKey || leaderSessions.length > 0)
      ? { ...leaderMember, rowId: `following/${leaderKey}`, sessions: leaderSessions, now }
      : undefined;

  const followers = sorted.flatMap((member) => {
    const key = member.identityKey;
    if (!key || !followerKeys.has(key) || key === leaderKey) {
      return [];
    }
    const sessions = getAllSessions(key);
    return objectKey && sessions.length === 0 ? [] : [{ ...member, rowId: `followers/${key}`, sessions, now }];
  });

  const apart = new Set([identityKey, leaderKey, ...followerKeys]);
  const groups = objectKeys.flatMap((key) => {
    const rows = sorted.flatMap((member) => {
      const memberKey = member.identityKey;
      if (!member.online || !memberKey || apart.has(memberKey)) {
        return [];
      }
      const sessions = getSessions(key, memberKey);
      return sessions.length > 0 ? [{ ...member, rowId: `${key}/${memberKey}`, sessions, now }] : [];
    });
    return rows.length > 0 ? [{ objectKey: key, members: rows }] : [];
  });

  return { leader, followers, groups };
};

export type PresenceListProps = PresenceRows & {
  /** Rows act through the actions on each peer's graph node in this space; without it they have none. */
  spaceId?: string;
  /** The follow cannot show what the leader is viewing. */
  paused?: boolean;
  onStop?: () => void;
  /** The hue the leader's and followers' rows wash in. */
  followHue?: string;
  /** Everyone in this session's follow; their avatars ring in `followHue`. */
  followMembers?: ReadonlySet<string>;
  showSessions?: boolean;
  onShowSessionsChange?: (showSessions: boolean) => void;
};

/** A presence list of the space, or with `objectKey` of one object, from the session's presence and follow state. */
export const usePresenceList = (spaceId: Key.SpaceId | undefined, objectKey?: EID.EID): PresenceListProps => {
  const [ephemeral, updateEphemeral] = Hooks.useAtomCapabilityState(SpaceCapabilities.EphemeralState);
  const identity = useIdentity();
  const members = useMembers(spaceId);
  const now = useNow();
  const follow = useFollowGroup(spaceId, now);
  const [showSessions, setShowSessions] = useShowSessions();
  const following = spaceId && ephemeral?.following?.spaceId === spaceId ? ephemeral.following : undefined;
  const onStop = useCallback(() => updateEphemeral((state) => ({ ...state, following: undefined })), [updateEphemeral]);
  const rows = useMemo(
    () =>
      spaceId && ephemeral
        ? getPresenceRows({
            spaceId,
            objectKey,
            viewersByObject: ephemeral.viewersByObject,
            members,
            identityKey: identity?.identityKey,
            leaderKey: following?.identityKey,
            followerKeys: new Set(
              follow?.group.leading ? follow.group.followers.map((follower) => follower.identityKey) : [],
            ),
            now,
          })
        : { followers: [], groups: [] },
    [spaceId, objectKey, ephemeral, members, identity?.identityKey, following?.identityKey, follow, now],
  );

  return {
    ...rows,
    spaceId,
    paused: following?.paused,
    onStop,
    followHue: follow?.hue ?? FOLLOW_HUE,
    followMembers: follow?.members,
    showSessions,
    onShowSessionsChange: setShowSessions,
  };
};

const PresenceListContext = createContext<PresenceListProps | undefined>(undefined);

const usePresenceListContext = (part: string) => {
  const context = useContext(PresenceListContext);
  if (!context) {
    throw new Error(`PresenceList.${part} must be inside PresenceList.Root`);
  }
  return context;
};

/** Everyone a presence list shows, the leader and followers first. */
export const getPresenceMembers = ({ leader, followers, groups }: PresenceRows): Member[] => [
  ...(leader ? [leader] : []),
  ...followers,
  ...groups.flatMap((group) => group.members),
];

const PresenceListRoot = ({ children, ...props }: PropsWithChildren<PresenceListProps>) => (
  <PresenceListContext.Provider value={props}>{children}</PresenceListContext.Provider>
);

export type PresenceListAction = {
  id: string;
  label: Label;
  icon: string;
  testId: string;
  onClick: () => void;
};

/** The list's title, the sessions toggle, then one action of the host's. */
const PresenceListToolbar = ({ title, action }: { title: Label; action?: PresenceListAction }) => {
  const { showSessions, onShowSessionsChange } = usePresenceListContext('Toolbar');
  const actions = useMenuBuilder(() => {
    const builder = MenuBuilder.make().text('title', { label: title });
    if (onShowSessionsChange) {
      builder.action(
        'showSessions',
        {
          label: ['presence-show-sessions.label', { ns: SpaceNamespace.key }],
          icon: 'ph--devices--regular',
          iconOnly: true,
          variant: 'toggle',
          checked: !!showSessions,
          placement: { zone: 'end' },
          testId: 'spacePlugin.presence.showSessions',
        },
        () => onShowSessionsChange(!showSessions),
      );
    }
    if (action) {
      builder.action(
        action.id,
        { label: action.label, icon: action.icon, iconOnly: true, placement: { zone: 'end' }, testId: action.testId },
        action.onClick,
      );
    }
    return builder.build();
  }, [title, action, showSessions, onShowSessionsChange]);
  return <ActionToolbar {...actions} alwaysActive />;
};

/** The rows. Nothing in them is selected: a row's buttons act, and only the keys' cursor moves between rows. */
const PresenceListContent = ({ label, testId }: { label: string; testId?: string }) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const { spaceId, leader, followers, groups, paused, onStop, followHue, showSessions } =
    usePresenceListContext('Content');
  const listRef = useRef<HTMLDivElement>(null);
  useRowMotion(listRef);

  const renderActions = (objectKey: EID.EID | undefined) =>
    spaceId && objectKey
      ? (member: Member, sessionId?: string) =>
          member.identityKey ? (
            <PeerActions
              spaceId={spaceId}
              identityKey={member.identityKey}
              presenceKey={objectKey}
              sessionId={sessionId}
            />
          ) : null
      : undefined;

  return (
    <div ref={listRef}>
      <Listbox.Root
        items={[
          ...getPresenceOptions(leader ? [leader] : [], false, t),
          ...getPresenceOptions(followers, false, t),
          ...getPresenceOptions(
            groups.flatMap((group) => group.members),
            showSessions,
            t,
          ),
        ]}
        data-testid={testId}
      >
        <Listbox.Content aria-label={label}>
          {leader && (
            <PresenceItems
              member={leader}
              followHue={followHue}
              renderActions={() => (
                <>
                  {paused && <span className='pe-2 text-sm text-fg-subtle'>{t('presence-follow-paused.label')}</span>}
                  <Button.Root
                    variant='primary'
                    icon='ph--stop--regular'
                    label={t('presence-stop-following.label')}
                    data-testid='spacePlugin.presence.stopFollowing'
                    onClick={onStop}
                  />
                </>
              )}
            />
          )}
          {followers.length > 0 && (
            <Listbox.ItemGroup data-testid='spacePlugin.presence.followers'>
              <Listbox.ItemGroupLabel>{t('presence-following-you.heading')}</Listbox.ItemGroupLabel>
              {followers.map((member) => (
                <PresenceItems key={member.rowId} member={member} followHue={followHue} />
              ))}
            </Listbox.ItemGroup>
          )}
          {groups.map((group, index) => {
            const rows = group.members.map((member) => (
              <PresenceItems
                key={member.rowId}
                member={member}
                showSessions={showSessions}
                renderActions={renderActions(group.objectKey)}
              />
            ));
            return group.label === undefined ? (
              rows
            ) : (
              <Listbox.ItemGroup key={group.objectKey ?? index}>
                <Listbox.ItemGroupLabel>{group.label}</Listbox.ItemGroupLabel>
                {rows}
              </Listbox.ItemGroup>
            );
          })}
        </Listbox.Content>
        <Listbox.Empty icon='ph--users--regular'>{t('members-empty.message')}</Listbox.Empty>
      </Listbox.Root>
    </div>
  );
};

/**
 * The list of who is present, shared by the viewers popover and the Members companion: `Root` takes the rows and the
 * follow, `Toolbar` goes in the host's header and `Content` in its body.
 */
export const PresenceList = {
  Root: PresenceListRoot,
  Toolbar: PresenceListToolbar,
  Content: PresenceListContent,
};

const ROW_MOTION = { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };

type RowPlace = { top: number; follow: boolean };

const getTranslateY = (element: HTMLElement) => {
  const { transform } = getComputedStyle(element);
  return transform && transform !== 'none' ? new DOMMatrixReadOnly(transform).m42 : 0;
};

/** Where each person's first row sits in the list, and whether it is in the follow. */
const measureRows = (root: HTMLElement): Map<string, RowPlace & { element: HTMLElement }> => {
  const rootTop = root.getBoundingClientRect().top;
  const rows = new Map<string, RowPlace & { element: HTMLElement }>();
  for (const element of root.querySelectorAll<HTMLElement>('[data-member]')) {
    const key = element.dataset.member;
    if (key && !rows.has(key)) {
      rows.set(key, {
        // Its place in the layout, without a slide already running, so a render mid-slide does not start another.
        top: element.getBoundingClientRect().top - rootTop - getTranslateY(element),
        follow: element.hasAttribute('data-follow'),
        element,
      });
    }
  }
  return rows;
};

/**
 * Slides a person's rows from where they were to where they are, and fades in the follow's wash on rows that just
 * joined it, so following someone reads as their row rising to the top and changing state.
 */
const useRowMotion = (ref: RefObject<HTMLElement | null>) => {
  const previous = useRef(new Map<string, RowPlace>());

  // A resize (the companion opening, rows rewrapping) moves rows without a render, so their places are taken again.
  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    const observer = new ResizeObserver(() => {
      previous.current = new Map([...measureRows(root)].map(([key, { top, follow }]) => [key, { top, follow }]));
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [ref]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rows = measureRows(root);
    for (const [key, { top, follow, element }] of rows) {
      const before = previous.current.get(key);
      if (still || !before) {
        continue;
      }
      if (before.top !== top) {
        element.animate([{ transform: `translateY(${before.top - top}px)` }, { transform: 'none' }], ROW_MOTION);
      }
      if (follow && !before.follow) {
        const backgroundColor = getComputedStyle(element).backgroundColor;
        element.animate([{ backgroundColor: 'transparent' }, { backgroundColor }], ROW_MOTION);
      }
    }
    previous.current = new Map([...rows].map(([key, { top, follow }]) => [key, { top, follow }]));
  });
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
const getPresenceOptions = (members: Member[], showSessions: boolean | undefined, t: Translate) =>
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
  /** In this session's follow: the rows wash in the follow's hue and the avatar rings in it. */
  followHue?: string;
};

/**
 * A member's Listbox row: avatar, name, then their actions. With `showSessions` a row per session
 * follows it, with whether the session moved lately and its device; the actions move to those rows. The keys' cursor
 * marks the member's rows as one.
 */
export const PresenceItems = ({ member, showSessions, renderActions, followHue }: PresenceItemsProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  return (
    <div
      role='group'
      aria-label={getName(member)}
      className='rounded-sm [&:has([data-highlighted])]:bg-hover-surface-subtle [&>.dx-row]:bg-transparent'
      // Lets the list move a person's rows as one when they change place, as joining a follow does.
      data-member={member.identityKey}
      {...(followHue && {
        'data-follow': true,
        'style': { backgroundColor: `color-mix(in oklab, var(--color-${followHue}-border) 22%, transparent)` },
      })}
    >
      <Listbox.Item id={member.rowId} data-testid='spacePlugin.presence.row'>
        {/* Smaller than the row, so the keys' cursor frames it. */}
        <Listbox.ItemIcon>
          <PresenceAvatar member={member} size='sm' followHue={followHue} />
        </Listbox.ItemIcon>
        <Listbox.ItemText>{getName(member)}</Listbox.ItemText>
        {/* The person's own actions: Go to acts on their session that last moved here, Follow on the person. */}
        {!showSessions && renderActions?.(member)}
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
              {/* A session that moved to another object stays listed until it lapses, but must not act on it. */}
              {session.currentlyAttended && renderActions?.(member, session.sessionId)}
            </Listbox.Item>
          );
        })}
    </div>
  );
};

export type AvatarSize = ComponentProps<typeof Avatar.Root>['size'];

type PresenceAvatarProps = {
  member: Space.Member;
  size?: AvatarSize;
  showName?: boolean;
  match?: boolean;
  index?: number;
  /** In this session's follow: a ring in the follow's hue, whatever the member attends. */
  followHue?: string;
  onClick?: () => void;
};

export const PresenceAvatar = forwardRef<HTMLDivElement, PresenceAvatarProps>(
  ({ member, showName, match, index, followHue, onClick, size }, forwardedRef) => {
    // Rows leave `match` unset and draw no ring: its gap is painted in the surface colour, which shows on hover.
    const status = followHue ? 'current' : match === undefined ? undefined : match ? 'current' : 'inactive';
    const style: CSSProperties & Record<'--dx-avatar-ring', string | undefined> = {
      ...(index ? { zIndex: index } : {}),
      '--dx-avatar-ring': followHue ? `var(--color-${followHue}-border)` : undefined,
    };
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
        style={style}
        {...(followHue && { 'data-follow': true })}
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
