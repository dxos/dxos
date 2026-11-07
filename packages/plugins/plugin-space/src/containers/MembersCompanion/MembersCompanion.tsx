//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type Space } from '@dxos/client/echo';
import { generateName } from '@dxos/display-name';
import { Obj } from '@dxos/echo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { EID } from '@dxos/keys';
import { MembershipPolicy } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Listbox } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';

import { type FollowState, useFollowGroup } from '#hooks';
import { SpaceCapabilities, SpaceOperation, type SpaceSchema } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import { getFreshSessions } from '../../util/index.ts';
import { PeerActions } from '../SpacePresence/PeerActions.tsx';
import {
  type Member,
  PresenceItems,
  getPresenceOptions,
  useNow,
  useShowSessions,
} from '../SpacePresence/SpacePresence.tsx';

/** Everyone in the active space, grouped by the object they attend. */
export const MembersCompanion = () => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const space = ToolkitHooks.useActiveSpace();
  const [ephemeral, updateEphemeral] = Hooks.useAtomCapabilityState(SpaceCapabilities.EphemeralState);
  const identity = useIdentity();
  const members = useMembers(space?.id);
  const now = useNow();
  const follow = useFollowGroup(space?.id, now);
  const [showSessions, setShowSessions] = useShowSessions();
  const following = space && ephemeral?.following?.spaceId === space.id ? ephemeral.following : undefined;
  const stopFollowing = useCallback(
    () => updateEphemeral((state) => ({ ...state, following: undefined })),
    [updateEphemeral],
  );

  // The person this session follows: one row at the top of the list, out of the object groups.
  const leader = useMemo((): Member | undefined => {
    const member = following && members.find((member) => member.identityKey === following.identityKey);
    if (!member || !ephemeral) {
      return undefined;
    }
    const sessions = Object.values(ephemeral.viewersByObject).flatMap((viewers) =>
      getFreshSessions(viewers[following.identityKey], now).filter((session) => session.currentlyAttended),
    );
    return { ...member, rowId: `following/${following.identityKey}`, sessions, now };
  }, [following, members, ephemeral, now]);

  // Highlighted while followed; the keys can still move the highlight.
  const [highlighted, setHighlighted] = useState<string>();
  useEffect(() => setHighlighted(leader?.rowId), [leader?.rowId]);

  // A member is listed under each object one of their sessions attends, with the sessions attending it.
  const groups = useMemo(() => {
    const byObject = new Map<EID.EID, Member[]>();
    if (!space || !ephemeral) {
      return byObject;
    }
    for (const [key, viewers] of Object.entries(ephemeral.viewersByObject)) {
      const eid = EID.tryParse(key);
      if (!eid || EID.getSpaceId(eid) !== space.id) {
        continue;
      }
      for (const member of members) {
        if (
          !member.online ||
          !member.identityKey ||
          member.identityKey === identity?.identityKey ||
          member.identityKey === leader?.identityKey
        ) {
          continue;
        }
        const sessions = getFreshSessions(viewers[member.identityKey], now).filter(
          (session) => session.currentlyAttended,
        );
        if (sessions.length > 0) {
          byObject.set(eid, [
            ...(byObject.get(eid) ?? []),
            {
              ...member,
              rowId: `${eid}/${member.identityKey}`,
              sessions,
              now,
            },
          ]);
        }
      }
    }
    return byObject;
  }, [space, ephemeral, members, identity?.identityKey, leader?.identityKey, now]);

  const listed = useMemo(() => [...groups.values()].flat(), [groups]);
  const online = useMemo(
    () => new Set([...listed, ...(leader?.online ? [leader] : [])].map((member) => member.identityKey)).size,
    [listed, leader],
  );

  // A private space is locked at genesis, so it never has other members and has no members settings.
  const locked = space?.membershipPolicy === MembershipPolicy.LOCKED;

  const actions = useMenuBuilder(
    () =>
      locked || !space
        ? MenuBuilder.make().build()
        : MenuBuilder.make()
            .text('online', { label: ['members-online.heading', { ns: SpaceNamespace.key, count: online }] })
            .action(
              'showSessions',
              {
                label: ['presence-show-sessions.label', { ns: SpaceNamespace.key }],
                icon: 'ph--devices--regular',
                iconOnly: true,
                variant: 'toggle',
                checked: showSessions,
                placement: { zone: 'end' },
                testId: 'spacePlugin.membersCompanion.showSessions',
              },
              () => setShowSessions(!showSessions),
            )
            .action(
              'invite',
              {
                label: ['members-invite.label', { ns: SpaceNamespace.key }],
                icon: 'ph--user-plus--regular',
                placement: { zone: 'end' },
                testId: 'spacePlugin.membersCompanion.invite',
              },
              () => void invokePromise(SpaceOperation.OpenMembers, { space }),
            )
            .build(),
    [locked, space, online, showSessions, setShowSessions, invokePromise],
  );

  return (
    <Panel.Root>
      <Panel.Header>
        <ActionToolbar {...actions} alwaysActive />
      </Panel.Header>
      <Panel.Body asChild>
        {locked ? (
          <Layout.Flex
            column
            center
            gap='sm'
            classNames='text-fg-subtle'
            role='status'
            data-testid='spacePlugin.membersCompanion.private'
          >
            <Icon.Icon icon='ph--lock-simple--regular' size='lg' tone='subtle' />
            {t('members-private.message')}
          </Layout.Flex>
        ) : (
          <ScrollArea.Root>
            <ScrollArea.Viewport asChild>
              <Layout.Container padBlock>
                {follow && (
                  <FollowBar
                    follow={follow}
                    members={members}
                    pointerStyle={ephemeral?.pointerStyle ?? 'cursor'}
                    onPointerStyleChange={(pointerStyle) => updateEphemeral((state) => ({ ...state, pointerStyle }))}
                  />
                )}
                <Listbox.Root
                  items={[
                    ...getPresenceOptions(leader ? [leader] : [], false, t),
                    ...getPresenceOptions(listed, showSessions, t),
                  ]}
                  value={highlighted ?? ''}
                  onValueChange={setHighlighted}
                  data-testid='spacePlugin.membersCompanion'
                >
                  <Listbox.Content aria-label={t('members-companion.label')}>
                    {leader && (
                      <PresenceItems
                        member={leader}
                        renderActions={() => (
                          <>
                            {following?.paused && (
                              <span className='text-sm text-fg-subtle'>{t('presence-follow-paused.label')}</span>
                            )}
                            <Button.Root
                              variant='outline'
                              icon='ph--stop--regular'
                              label={t('presence-stop-following.label')}
                              data-testid='spacePlugin.presence.stopFollowing'
                              onClick={stopFollowing}
                            />
                          </>
                        )}
                      />
                    )}
                    {space &&
                      [...groups.entries()].map(([key, group]) => (
                        <ObjectGroup
                          key={key}
                          space={space}
                          objectKey={key}
                          members={group}
                          showSessions={showSessions}
                        />
                      ))}
                  </Listbox.Content>
                  <Listbox.Empty icon='ph--users--regular'>{t('members-empty.message')}</Listbox.Empty>
                </Listbox.Root>
              </Layout.Container>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

type FollowBarProps = {
  follow: FollowState;
  members: ReturnType<typeof useMembers>;
  pointerStyle: SpaceSchema.PointerStyle;
  onPointerStyleChange: (pointerStyle: SpaceSchema.PointerStyle) => void;
};

const isPointerStyle = (value: string): value is SpaceSchema.PointerStyle => value === 'cursor' || value === 'laser';

/**
 * The follow this session takes part in, in the leader's hue: whom it follows, or who follows it, and how its own
 * pointer draws for them.
 */
const FollowBar = ({ follow: { group, hue }, members, pointerStyle, onPointerStyleChange }: FollowBarProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const nameOf = (identityKey: string) => {
    const member = members.find((member) => member.identityKey === identityKey);
    return member?.displayName ?? generateName(identityKey);
  };
  const followerNames = [...new Set(group.followers.map((follower) => nameOf(follower.identityKey)))];
  const label = group.leading
    ? t('follow-bar-followed.label', {
        count: followerNames.length,
        names: new Intl.ListFormat(undefined, { type: 'conjunction' }).format(followerNames),
      })
    : t('follow-bar-following.label', { name: nameOf(group.leader) });

  return (
    <div
      className='flex items-center gap-2 mx-2 mb-2 ps-3 pe-1 py-1 rounded-md'
      style={{ backgroundColor: `var(--color-${hue}-surface)`, color: `var(--color-${hue}-fg)` }}
      data-testid='spacePlugin.followBar'
      data-leading={group.leading}
    >
      <Icon.Icon icon='ph--link-simple--regular' />
      <span className='grow truncate text-sm' data-testid='spacePlugin.followBar.label'>
        {label}
      </span>
      <ToggleGroup.Root
        type='single'
        value={pointerStyle}
        aria-label={t('pointer-style.label')}
        onValueChange={(value) => isPointerStyle(value) && onPointerStyleChange(value)}
      >
        <ToggleGroup.Item
          value='cursor'
          variant='ghost'
          icon='ph--cursor--regular'
          iconOnly
          label={t('pointer-cursor.label')}
          data-testid='spacePlugin.followBar.cursor'
        />
        <ToggleGroup.Item
          value='laser'
          variant='ghost'
          icon='ph--crosshair-simple--regular'
          iconOnly
          label={t('pointer-laser.label')}
          data-testid='spacePlugin.followBar.laser'
        />
      </ToggleGroup.Root>
    </div>
  );
};

type ObjectGroupProps = {
  space: Space;
  objectKey: EID.EID;
  members: Member[];
  showSessions: boolean;
};

/** The members attending one object, under the object's label. */
const ObjectGroup = ({ space, objectKey, members, showSessions }: ObjectGroupProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const [label, setLabel] = useState<string>();
  useEffect(() => {
    // Peers on the space's Home attend the space itself, whose key names no object.
    if (!EID.getEntityId(objectKey)) {
      setLabel(t('space-home-node.label'));
      return;
    }

    let cancelled = false;
    void space.db
      .makeRef(objectKey)
      .load()
      .then((object) => {
        if (!cancelled && Obj.isObject(object)) {
          setLabel(Obj.getLabel(object) ?? Obj.getTypename(object));
        }
      })
      .catch(() => setLabel(undefined));
    return () => {
      cancelled = true;
    };
  }, [space, objectKey, t]);

  return (
    <Listbox.ItemGroup>
      <Listbox.ItemGroupLabel>{label}</Listbox.ItemGroupLabel>
      {members.map((member) => (
        <PresenceItems
          key={member.rowId}
          member={member}
          showSessions={showSessions}
          renderActions={(member, sessionId) =>
            member.identityKey ? (
              <PeerActions
                spaceId={space.id}
                identityKey={member.identityKey}
                presenceKey={objectKey}
                sessionId={sessionId}
              />
            ) : null
          }
        />
      ))}
    </Listbox.ItemGroup>
  );
};
