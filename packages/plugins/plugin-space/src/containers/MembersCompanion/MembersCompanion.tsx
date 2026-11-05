//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { EID } from '@dxos/keys';
import { MembershipPolicy } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Listbox } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { SpaceCapabilities, SpaceOperation } from '#types';

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
  const ephemeral = Hooks.useAtomCapability(SpaceCapabilities.EphemeralState);
  const identity = useIdentity();
  const members = useMembers(space?.id);
  const now = useNow();
  const [showSessions, setShowSessions] = useShowSessions();

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
        if (!member.online || !member.identityKey || member.identityKey === identity?.identityKey) {
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
              defaultSessionId: sessions[0].sessionId,
            },
          ]);
        }
      }
    }
    return byObject;
  }, [space, ephemeral, members, identity?.identityKey, now]);

  const listed = useMemo(() => [...groups.values()].flat(), [groups]);
  const online = useMemo(() => new Set(listed.map((member) => member.identityKey)).size, [listed]);

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
                <Listbox.Root
                  items={getPresenceOptions(listed, showSessions, t)}
                  data-testid='spacePlugin.membersCompanion'
                >
                  <Listbox.Content aria-label={t('members-companion.label')}>
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
              <PeerActions spaceId={space.id} identityKey={member.identityKey} sessionId={sessionId} />
            ) : null
          }
        />
      ))}
    </Listbox.ItemGroup>
  );
};
