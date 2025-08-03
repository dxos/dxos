//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { IdentityDid, PublicKey } from '@dxos/keys';
import { HaloSpaceMember, SpaceMember } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';

import { FullPresence, type Member, type MemberPresenceProps, SmallPresence } from './SpacePresence';

const nViewers = (n: number, currentlyAttended = true): Member[] =>
  Array.from({ length: n }, () => ({
    role: HaloSpaceMember.Role.ADMIN,
    identity: { did: IdentityDid.random(), identityKey: PublicKey.random() },
    presence: SpaceMember.PresenceState.ONLINE,
    lastSeen: Date.now(),
    currentlyAttended,
  }));

export const Full = (props: MemberPresenceProps) => {
  const p: MemberPresenceProps = {
    ...props,
  };

  return (
    <div className='p-4'>
      <div className='p-3'>
        <FullPresence members={nViewers(1)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={nViewers(2)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={nViewers(3)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={nViewers(3, false)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={nViewers(4)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={nViewers(5)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={nViewers(5, false)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={nViewers(10)} {...p} />
      </div>
      <div className='p-3'>
        <FullPresence members={nViewers(100)} {...p} />
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

const meta: Meta = {
  title: 'plugins/plugin-space/SpacePresence',
  decorators: [withTheme, withLayout()],
  parameters: { translations },
};

export default meta;
