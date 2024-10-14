//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxos-theme';

import { PublicKey } from '@dxos/keys';
import { HaloSpaceMember, SpaceMember } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { FullPresence, type MemberPresenceProps, SmallPresence, type Member } from './SpacePresence';
import translations from '../translations';

export default {
  title: 'plugin-space/SpacePresence',
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: { translations },
  actions: { argTypesRegex: '^on.*' },
};

const nViewers = (n: number, currentlyAttended = true): Member[] =>
  Array.from({ length: n }, () => ({
    role: HaloSpaceMember.Role.ADMIN,
    identity: { identityKey: PublicKey.random() },
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

export const Small = (props: MemberPresenceProps) => {
  const p: MemberPresenceProps = {
    ...props,
  };

  return (
    <div className='p-4'>
      <div className='p-3'>
        <SmallPresence count={0} {...p} />
      </div>
      <div className='p-3'>
        <SmallPresence count={1} {...p} />
      </div>
      <div className='p-3'>
        <SmallPresence count={2} {...p} />
      </div>
      <div className='p-3'>
        <SmallPresence count={3} {...p} />
      </div>
      <div className='p-3'>
        <SmallPresence count={4} {...p} />
      </div>
      <div className='p-3'>
        <SmallPresence count={5} {...p} />
      </div>
    </div>
  );
};
