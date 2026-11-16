//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Key, Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { type Progress } from '@dxos/progress';
import { AttentionGlyph, type AttentionGlyphProps, useAttention } from '@dxos/react-ui-attention';
import { type Activity } from '@dxos/react-ui-attention/types';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Popover from '@dxos/react-ui/Popover';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import { toLocalizedString } from '@dxos/ui-types/translations';

import { SpaceCapabilities } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import {
  MEMBERS_COMPANION_ID,
  type ObjectViewers,
  type ViewersByObject,
  countViewers,
  getFreshSessions,
  getPeerNodeIds,
} from '../../util/index.ts';
import { useExpandPeerNodes } from './PeerActions.tsx';
import {
  type AvatarSize,
  PresenceAvatar,
  PresenceList,
  type PresenceListAction,
  type PresenceListProps,
  getName,
  type Member,
  getPresenceMembers,
  isAttending,
  useNow,
  usePresenceList,
} from './PresenceList.tsx';

const useActiveViewerCount = (viewers?: ObjectViewers) => {
  const now = useNow();
  return countViewers(viewers, now);
};

/** Every session attending something in the space, keyed as one object's viewers. */
const getSpaceViewers = (viewersByObject: ViewersByObject, spaceId: string): ObjectViewers => {
  const viewers: ObjectViewers = {};
  for (const [key, objectViewers] of Object.entries(viewersByObject)) {
    const objectKey = EID.tryParse(key);
    if (objectKey && EID.getSpaceId(objectKey) === spaceId) {
      for (const [identityKey, sessions] of Object.entries(objectViewers)) {
        viewers[identityKey] = { ...viewers[identityKey], ...sessions };
      }
    }
  }
  return viewers;
};

export type SpacePresenceProps = {
  spaceId?: Key.SpaceId;
  /** The object the list is of; with `everyone`, the object whose viewers' avatars are lit. */
  presenceKey?: EID.EID;
  /** Lists everyone attending something in the space, under each object they attend. */
  everyone?: boolean;
  size?: AvatarSize;
};

export const SpacePresence = ({ spaceId, presenceKey, everyone, size }: SpacePresenceProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const ephemeral = Hooks.useAtomCapability(SpaceCapabilities.EphemeralState);
  const now = useNow();
  const list = usePresenceList(spaceId, everyone ? undefined : presenceKey);
  const viewers =
    (everyone && spaceId && ephemeral
      ? getSpaceViewers(ephemeral.viewersByObject, spaceId)
      : presenceKey && ephemeral?.viewersByObject[presenceKey]) || {};
  // Ready before the list opens, so its rows' actions do not appear after it.
  useExpandPeerNodes(spaceId ? getPeerNodeIds(spaceId, viewers, now) : []);
  const seeEveryone = useMemo(
    (): PresenceListAction => ({
      id: 'seeEveryone',
      label: ['presence-see-everyone.label', { ns: SpaceNamespace.key }],
      icon: 'ph--users--regular',
      testId: 'spacePlugin.presence.seeEveryone',
      onClick: () =>
        void invokePromise(LayoutOperation.UpdateComplementary, { subject: MEMBERS_COMPANION_ID, state: 'expanded' }),
    }),
    [invokePromise],
  );

  // Listing the space, only those on the object are lit.
  const isLit =
    everyone && presenceKey
      ? (member: Member) =>
          getFreshSessions(ephemeral?.viewersByObject[presenceKey]?.[member.identityKey ?? ''], now).some(
            (session) => session.currentlyAttended,
          )
      : undefined;

  return presenceKey || everyone ? <FullPresence {...list} size={size} isLit={isLit} action={seeEveryone} /> : null;
};

const OVERFLOW_TRIGGER = 'overflow';

type AvatarTriggerProps = ComponentPropsWithoutRef<'button'> & { tooltip: string };

/** A button around an avatar; its tooltip finds it by the id the `asChild` Popover trigger gives it. */
const AvatarTrigger = forwardRef<HTMLButtonElement, AvatarTriggerProps>(
  ({ tooltip, children, ...props }, forwardedRef) => (
    <Tooltip.Root ids={props.id ? { trigger: props.id } : undefined} positioning={{ placement: 'bottom' }}>
      <Tooltip.Trigger asChild>
        <button type='button' className='grid focus:outline-hidden' {...props} ref={forwardedRef}>
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip.Root>
  ),
);

export type FullPresenceProps = PresenceListProps & {
  size?: AvatarSize;
  /** At the end of the list's header; taking it closes the list. */
  action?: PresenceListAction;
  /** Whether a member's avatar is lit; by default, whether they attend the object. */
  isLit?: (member: Member) => boolean;
};

/** Avatars of the members on an object; clicking any opens the presence list of the object. */
export const FullPresence = ({ size = 'md', action, isLit = isAttending, ...props }: FullPresenceProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const [open, setOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const members = getPresenceMembers(props);
  const title = t('presence-in-object.heading', { count: members.length });
  const closingAction = useMemo(
    () =>
      action && {
        ...action,
        onClick: () => {
          setOpen(false);
          action.onClick();
        },
      },
    [action],
  );

  if (members.length === 0) {
    // A list emptied while open stays closed when viewers return.
    if (open) {
      setOpen(false);
    }
    return null;
  }

  // Each avatar and the overflow are the list's own triggers, so the popover returns focus to the one that opened it
  // and keeps the list in the tab order after it (zag binds that tab order at open, not on a switch to another avatar).
  return (
    <Popover.Root
      open={open}
      onOpenChange={({ open }) => setOpen(open)}
      positioning={{ placement: 'bottom-end' }}
      // zag focuses nothing when the opening avatar has left, so focus falls back to the first one.
      finalFocusEl={() =>
        groupRef.current?.querySelector<HTMLElement>('[data-part="trigger"][data-current]') ??
        groupRef.current?.querySelector<HTMLElement>('[data-part="trigger"]') ??
        null
      }
    >
      <Popover.Anchor asChild>
        {/* A row of overlapping avatars; the `dx-avatar-group` rule only styles lit avatars. */}
        <Layout.Flex
          ref={groupRef}
          align='center'
          classNames='dx-avatar-group inline-flex [&>*+*]:-ms-2'
          data-testid='spacePlugin.presence'
          data-follow-keep
        >
          {members.slice(0, 3).map((member, i) => (
            <Popover.Trigger key={member.identityKey} asChild value={member.rowId}>
              <AvatarTrigger tooltip={getName(member)}>
                <PresenceAvatar
                  member={member}
                  match={isLit(member)}
                  index={members.length - i}
                  size={size}
                  followHue={
                    member.identityKey && props.followMembers?.has(member.identityKey) ? props.followHue : undefined
                  }
                />
              </AvatarTrigger>
            </Popover.Trigger>
          ))}
          {members.length > 3 && (
            <Popover.Trigger asChild value={OVERFLOW_TRIGGER}>
              <button type='button' className='grid focus:outline-hidden' aria-label={title}>
                <Avatar.Root
                  status='inactive'
                  style={{ zIndex: members.length - 4 }}
                  fallback={`+${members.length - 3}`}
                  size={size}
                />
              </button>
            </Popover.Trigger>
          )}
        </Layout.Flex>
      </Popover.Anchor>
      {/* The Members companion's size, so the two lists read alike; the plank header's would be larger. */}
      <Popover.Content size='md' classNames='w-96' aria-label={title} data-follow-keep>
        <PresenceList.Root {...props}>
          <Popover.Header>
            <PresenceList.Toolbar
              title={['presence-in-object.heading', { ns: SpaceNamespace.key, count: members.length }]}
              action={closingAction}
            />
          </Popover.Header>
          {/* The header keeps a gap from the panel's top edge; the list keeps the same from its bottom. */}
          <Popover.Body classNames='pb-2'>
            <PresenceList.Content label={title} />
          </Popover.Body>
        </PresenceList.Root>
      </Popover.Content>
    </Popover.Root>
  );
};

export type SmallPresenceLiveProps = {
  id?: string;
  open?: boolean;
  viewers?: ObjectViewers;
  /** The object the row stands for; its progress monitors join its presence. */
  object?: Obj.Unknown;
};

export const SmallPresenceLive = ({ id, open, viewers, object }: SmallPresenceLiveProps) => {
  const { hasAttention, isAncestor, isRelated } = useAttention(id);
  const count = useActiveViewerCount(viewers);

  const monitors = ToolkitHooks.useObjectProgressMonitors(
    object && Obj.getURI(object, { prefer: 'absolute' }).toString(),
  );
  const activity = useMemo(() => monitors.flatMap(toActivity), [monitors]);

  return (
    <SmallPresence
      count={count}
      activity={activity}
      attended={hasAttention || isRelated}
      containsAttended={isAncestor && !open}
    />
  );
};

const ONE_VIEWER: Activity.Treatment = { slot: 'mark', icon: 'dot', hue: 'primary', priority: 10 };
const SEVERAL_VIEWERS: Activity.Treatment = { slot: 'mark', icon: 'dots', hue: 'primary', priority: 10 };
const WORKING: Activity.Treatment = { slot: 'mark', icon: 'star', priority: 30, animate: true };
const FAILED: Activity.Treatment = { slot: 'edge', hue: 'error', priority: 40 };

const toActivity = (monitor: Progress.TaskProgress): Activity.Entry[] => {
  const label = monitor.label ?? monitor.name;
  switch (monitor.status) {
    case 'pending':
    case 'running':
      return [{ source: monitor.name, label, treatment: WORKING }];
    case 'error':
      return [{ source: monitor.name, label: monitor.error ? `${label}: ${monitor.error}` : label, treatment: FAILED }];
    default:
      return [];
  }
};

export type SmallPresenceProps = {
  count?: number;
  /** Other activity on the item; each entry is a tooltip line and may claim a glyph slot. */
  activity?: readonly Activity.Entry[];
} & Pick<AttentionGlyphProps, 'attended' | 'containsAttended'>;

export const SmallPresence = ({ count = 0, activity = [], attended, containsAttended }: SmallPresenceProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const treatments = useMemo(
    () => [
      ...(count > 0 ? [count > 1 ? SEVERAL_VIEWERS : ONE_VIEWER] : []),
      ...activity.flatMap((entry) => (entry.treatment ? [entry.treatment] : [])),
    ],
    [count, activity],
  );
  const lines = [
    ...(count > 0 || activity.length === 0 ? [t('presence.label', { count })] : []),
    ...activity.map((entry) => toLocalizedString(entry.label, t)),
  ];

  return (
    <Tooltip.Trigger asChild content={lines.join(' · ')} side='bottom'>
      <AttentionGlyph
        attended={attended}
        containsAttended={containsAttended}
        treatments={treatments}
        classNames='self-center mx-1'
      />
    </Tooltip.Trigger>
  );
};

SpacePresence.displayName = 'SpacePresence';
