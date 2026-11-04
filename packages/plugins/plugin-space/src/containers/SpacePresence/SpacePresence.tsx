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
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Popover from '@dxos/react-ui/Popover';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import type * as Util from '@dxos/react-ui/Util';
import { hexToFallback } from '@dxos/util';

import { SpaceCapabilities, SpaceSchema } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import { PEOPLE_COMPANION_ID, PRESENCE_EXPIRY } from '../../util/index.ts';
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
      footer={<SeeEveryoneButton />}
    />
  );
};

/** Opens the People companion, which lists everyone in the space. */
const SeeEveryoneButton = () => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  return (
    <Popover.CloseTrigger asChild>
      <Button.Root
        variant='ghost'
        icon='ph--users--regular'
        label={t('presence-see-everyone.label')}
        classNames='w-full justify-start mt-1'
        data-testid='spacePlugin.presence.seeEveryone'
        onClick={() =>
          void invokePromise(LayoutOperation.UpdateComplementary, { subject: PEOPLE_COMPANION_ID, state: 'expanded' })
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
  /** Content under the list, e.g. a link to everyone in the space. */
  footer?: ReactNode;
}>;

/** Avatars of the members on an object; clicking any opens the full list, with the clicked member's row highlighted. */
export const FullPresence = (props: MemberPresenceProps) => {
  const { size = 'md', renderActions, footer } = props;
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
      <Popover.Content>
        <Popover.Body classNames='max-h-80 w-64'>
          <PresenceList
            heading={t('presence-in-object.heading', { count: members.length })}
            members={members}
            highlighted={highlighted}
            renderActions={renderActions}
          />
          {footer}
        </Popover.Body>
      </Popover.Content>
    </Popover.Root>
  );
};

export type PresenceListProps = {
  heading?: string;
  members: Member[];
  highlighted?: string;
  /** Subtitle under a member's name, e.g. where they are. */
  renderDetail?: (member: Member) => ReactNode;
  renderActions?: (member: Member) => ReactNode;
};

export const PresenceList = ({ heading, members, highlighted, renderDetail, renderActions }: PresenceListProps) => (
  <div role='list' aria-label={heading} className='flex flex-col'>
    {heading && <div className='px-2 py-1 text-xs text-description'>{heading}</div>}
    {members.map((member) => (
      <div
        key={member.identityKey}
        role='listitem'
        data-testid='spacePlugin.presence.row'
        data-highlighted={member.identityKey === highlighted ? '' : undefined}
        className='flex items-center gap-2 px-2 py-1 rounded-sm data-[highlighted]:bg-current-surface'
      >
        <PresenceAvatar member={member} size='sm' match={member.currentlyAttended} />
        <div className='flex flex-col min-w-0 grow'>
          <span className='text-sm truncate'>{getName(member)}</span>
          {renderDetail && <span className='text-xs text-description truncate'>{renderDetail(member)}</span>}
        </div>
        {renderActions?.(member)}
      </div>
    ))}
  </div>
);

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
