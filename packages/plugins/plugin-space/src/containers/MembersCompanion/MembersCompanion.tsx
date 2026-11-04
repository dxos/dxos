//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { type EID } from '@dxos/keys';
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
import { getPeerFocus } from '../../util/index.ts';
import { PeerActions } from '../SpacePresence/PeerActions.tsx';
import { type Member, PresenceItem, getPresenceOptions, useNow } from '../SpacePresence/SpacePresence.tsx';

/** Everyone in the active space, grouped by the object they attend. */
export const MembersCompanion = () => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const space = ToolkitHooks.useActiveSpace();
  const ephemeral = Hooks.useAtomCapability(SpaceCapabilities.EphemeralState);
  const identity = useIdentity();
  const members = useMembers(space?.id);
  const now = useNow();

  const groups = useMemo(() => {
    const byObject = new Map<EID.EID, Member[]>();
    if (!space || !ephemeral) {
      return byObject;
    }
    for (const member of members) {
      if (!member.online || !member.identityKey || member.identityKey === identity?.identityKey) {
        continue;
      }
      const focus = getPeerFocus(ephemeral.viewersByObject, space.id, member.identityKey, now);
      if (focus) {
        const lastSeen = ephemeral.viewersByObject[focus.key]?.[member.identityKey]?.lastSeen ?? now;
        byObject.set(focus.key, [...(byObject.get(focus.key) ?? []), { ...member, lastSeen, currentlyAttended: true }]);
      }
    }
    return byObject;
  }, [space, ephemeral, members, identity?.identityKey, now]);

  const online = useMemo(() => [...groups.values()].flat(), [groups]);

  // A private space is locked at genesis, so it never has other members and has no members settings.
  const locked = space?.membershipPolicy === MembershipPolicy.LOCKED;

  const actions = useMenuBuilder(
    () =>
      locked || !space
        ? MenuBuilder.make().build()
        : MenuBuilder.make()
            .text('online', { label: ['members-online.heading', { ns: SpaceNamespace.key, count: online.length }] })
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
    [locked, space, online.length, invokePromise],
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
                <Listbox.Root items={getPresenceOptions(online)} data-testid='spacePlugin.membersCompanion'>
                  <Listbox.Content aria-label={t('members-companion.label')}>
                    {space &&
                      [...groups.entries()].map(([key, group]) => (
                        <ObjectGroup key={key} space={space} objectKey={key} members={group} />
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
};

/** The members attending one object, under the object's label. */
const ObjectGroup = ({ space, objectKey, members }: ObjectGroupProps) => {
  const [label, setLabel] = useState<string>();
  useEffect(() => {
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
  }, [space, objectKey]);

  return (
    <Listbox.ItemGroup>
      <Listbox.ItemGroupLabel>{label}</Listbox.ItemGroupLabel>
      {members.map((member) => (
        <PresenceItem
          key={member.identityKey}
          member={member}
          renderActions={(member) =>
            member.identityKey ? <PeerActions spaceId={space.id} identityKey={member.identityKey} /> : null
          }
        />
      ))}
    </Listbox.ItemGroup>
  );
};
