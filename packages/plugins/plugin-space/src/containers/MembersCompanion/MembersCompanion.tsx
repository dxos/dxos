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
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';

import { SpaceCapabilities, SpaceOperation } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import { getPeerFocus } from '../../util/index.ts';
import { PeerActions } from '../SpacePresence/PeerActions.tsx';
import { type Member, PresenceList, useNow } from '../SpacePresence/SpacePresence.tsx';

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

  const count = [...groups.values()].reduce((total, group) => total + group.length, 0);

  // A private space is locked at genesis, so it never has other members and has no members settings.
  if (space?.membershipPolicy === MembershipPolicy.LOCKED) {
    return (
      <div
        role='status'
        className='flex flex-col items-center gap-2 p-4 text-center text-sm text-description'
        data-testid='spacePlugin.membersCompanion.private'
      >
        <Icon.Icon icon='ph--lock-simple--regular' size='lg' tone='subtle' />
        <p>{t('members-private.message')}</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-2 p-2 overflow-y-auto' data-testid='spacePlugin.membersCompanion'>
      <div className='px-2 text-sm'>{t('members-online.heading', { count })}</div>
      {count === 0 && <div className='px-2 text-sm text-description'>{t('members-empty.message')}</div>}
      {space &&
        [...groups.entries()].map(([key, group]) => (
          <ObjectGroup key={key} space={space} objectKey={key} members={group} />
        ))}
      {space && (
        <Button.Root
          variant='ghost'
          icon='ph--user-plus--regular'
          label={t('members-invite.label')}
          classNames='w-full justify-start'
          data-testid='spacePlugin.membersCompanion.invite'
          onClick={() => void invokePromise(SpaceOperation.OpenMembers, { space })}
        />
      )}
    </div>
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
    <PresenceList
      heading={label}
      members={members}
      renderActions={(member) =>
        member.identityKey ? <PeerActions spaceId={space.id} identityKey={member.identityKey} /> : null
      }
    />
  );
};
