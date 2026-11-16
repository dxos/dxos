//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { MembershipPolicy } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { SpaceOperation } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import {
  PresenceList,
  type PresenceListAction,
  getPresenceMembers,
  usePresenceList,
} from '../SpacePresence/PresenceList.tsx';

/** Everyone in the active space, grouped by the object they attend. */
export const MembersCompanion = () => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const space = ToolkitHooks.useActiveSpace();
  const list = usePresenceList(space?.id);
  const groups = useMemo(
    () =>
      space
        ? list.groups.map((group) => ({
            ...group,
            label: group.objectKey && <ObjectLabel space={space} objectKey={group.objectKey} />,
          }))
        : [],
    [space, list.groups],
  );
  const online = new Set(
    getPresenceMembers(list)
      .filter((member) => member.online)
      .map((member) => member.identityKey),
  ).size;
  const invite = useMemo(
    (): PresenceListAction | undefined =>
      space && {
        id: 'invite',
        label: ['members-invite.label', { ns: SpaceNamespace.key }],
        icon: 'ph--user-plus--regular',
        testId: 'spacePlugin.membersCompanion.invite',
        onClick: () => void invokePromise(SpaceOperation.OpenMembers, { space }),
      },
    [space, invokePromise],
  );

  // A private space is locked at genesis, so it never has other members and has no members settings.
  const locked = space?.membershipPolicy === MembershipPolicy.LOCKED;

  return (
    <Panel.Root>
      <PresenceList.Root {...list} groups={groups}>
        <Panel.Header>
          {!locked && space && (
            <PresenceList.Toolbar
              title={['members-online.heading', { ns: SpaceNamespace.key, count: online }]}
              action={invite}
            />
          )}
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
                  <PresenceList.Content label={t('members-companion.label')} testId='spacePlugin.membersCompanion' />
                </Layout.Container>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          )}
        </Panel.Body>
      </PresenceList.Root>
    </Panel.Root>
  );
};

/** The label of the object a group of members attends. */
const ObjectLabel = ({ space, objectKey }: { space: Space; objectKey: EID.EID }) => {
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

  return <>{label}</>;
};
