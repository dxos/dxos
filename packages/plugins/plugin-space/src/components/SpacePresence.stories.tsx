//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { IdentityDid, PublicKey } from '@dxos/keys';
import { HaloSpaceMember, SpaceMember } from '@dxos/react-client/echo';

import { translations } from '../translations';

import { FullPresence, type Member, type MemberPresenceProps, SmallPresence } from './SpacePresence';

const viewers = (n: number, currentlyAttended = true): Member[] =>
  Array.from({ length: n }, () => ({
    role: HaloSpaceMember.Role.ADMIN,
    identity: { did: IdentityDid.random(), identityKey: PublicKey.random() },
    presence: SpaceMember.PresenceState.ONLINE,
    lastSeen: Date.now(),
    currentlyAttended,
  }));

const meta = {
  title: 'plugins/plugin-space/SpacePresence',
  parameters: {
    translations,
  },
} satisfies Meta<typeof IdentityDid>;

export default meta;

export const Full = (props: MemberPresenceProps) => {
  const p: MemberPresenceProps = {
    ...props,
  };

  return (
    <div className='p-4'>
      <div className='p-3'>
        <FullPresence members={viewers(1)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={viewers(2)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={viewers(3)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={viewers(3, false)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={viewers(4)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={viewers(5)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={viewers(5, false)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={viewers(10)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={viewers(100)} {...p} />
      </div>
    </div>
  );
};

export const Small = () => {
  return (
    <div className='p-4'>
      <div className='flex gap-3 p-3'>
        <SmallPresence count={0} />
        <SmallPresence count={0} attended />
        <SmallPresence count={0} containsAttended />
      </div>
      <div className='flex gap-3 p-3'>
        <SmallPresence count={1} />
        <SmallPresence count={1} attended />
        <SmallPresence count={1} containsAttended />
      </div>
      <div className='flex gap-3 p-3'>
        <SmallPresence count={2} />
        <SmallPresence count={2} attended />
        <SmallPresence count={2} containsAttended />
      </div>
      <div className='flex gap-3 p-3'>
        <SmallPresence count={3} />
        <SmallPresence count={3} attended />
        <SmallPresence count={3} containsAttended />
      </div>
      <div className='flex gap-3 p-3'>
        <SmallPresence count={4} />
        <SmallPresence count={4} attended />
        <SmallPresence count={4} containsAttended />
      </div>
      <div className='flex gap-3 p-3'>
        <SmallPresence count={5} />
        <SmallPresence count={5} attended />
        <SmallPresence count={5} containsAttended />
      </div>
    </div>
  );
};
