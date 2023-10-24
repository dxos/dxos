//
// Copyright 2022 DXOS.org
//

import { Smiley, SmileyBlank, UserCircle } from '@phosphor-icons/react';
import React, { FC, useCallback, useEffect } from 'react';

import { scheduleTaskInterval } from '@dxos/async';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { useClient } from '@dxos/react-client';
import { SpaceMember, useMembers } from '@dxos/react-client/echo';

import { useAppReducer, useAppRouter, useAppState } from '../../hooks';

// TODO(burdon): Intent.
export type MemberListProps = {
  onNavigate: (path: string) => void;
};

export const MemberList = ({ onNavigate }: MemberListProps) => {
  const { space } = useAppRouter(); // TODO(burdon): Factor out.
  const members = useMembers(space?.key);
  const client = useClient();
  const { setActiveFrame } = useAppReducer();

  const membersLocations = new Map<string, string>();
  useEffect(() => {
    if (space) {
      const ctx = new Context();
      scheduleTaskInterval(
        ctx,
        async () => {
          await space.postMessage('currentLocation', {
            identityKey: client.halo.identity.get()?.identityKey.toHex(),
            location: window.location.pathname,
          });
        },
        500,
      );

      ctx.onDispose(
        space!.listen('currentLocation', ({ payload: { identityKey, location } }) => {
          if (!membersLocations.has(identityKey) || membersLocations.get(identityKey) !== location) {
            membersLocations.set(identityKey, location);
          }
        }),
      );
      return () => {
        void ctx.dispose();
      };
    }
  }, [space]);

  const { frames: activeFrames } = useAppState();
  const focusOnMember = useCallback((member: SpaceMember) => {
    const path = membersLocations.get(member.identity.identityKey.toHex());

    // TODO(burdon): Hack.
    // Check if Frame which we are try to focus in is installed, and install it if necessary.
    const id = path?.split('/')[3].split('_').join('.');
    // TODO(mykola): Reconcile with FrameRegistry.
    if (id) {
      const activate = !activeFrames.find((frameId) => frameId === id);
      if (activate) {
        setActiveFrame(id, activate);
      }
    }

    if (path) {
      onNavigate(path);
    }
  }, []);

  return (
    <MembersPanel identityKey={client.halo.identity.get()!.identityKey} members={members} onSelect={focusOnMember} />
  );
};

export const MembersPanel: FC<{
  identityKey: PublicKey;
  members: SpaceMember[];
  onSelect?: (member: SpaceMember) => void;
}> = ({ identityKey, members, onSelect }) => {
  members.sort((member) => (member.identity.identityKey.equals(identityKey) ? -1 : 1));

  return (
    <div className='shrink-0 flex flex-1 flex-col overflow-hidden px-4'>
      {members.map((member) => (
        <div
          onClick={() => {
            onSelect?.(member);
          }}
          key={member.identity.identityKey.toHex()}
          className='flex overflow-hidden mb-1 items-center'
        >
          <div className='mr-2'>
            {member.identity.identityKey.equals(identityKey) ? (
              <UserCircle className={mx(getSize(6), 'text-selection-text')} />
            ) : member.presence === SpaceMember.PresenceState.ONLINE ? (
              <Smiley className={mx(getSize(6), 'text-green-500')} />
            ) : (
              <SmileyBlank className={mx(getSize(6), 'text-slate-500')} />
            )}
          </div>
          <div className='truncate'>
            {member.identity?.profile?.displayName ?? member.identity.identityKey.truncate()}
          </div>
        </div>
      ))}
    </div>
  );
};
