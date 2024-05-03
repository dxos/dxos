//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';

import { PublicKey } from '@dxos/keys';
import { SpaceMember } from '@dxos/react-client/echo';
import { Tooltip } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { FullPresence, type MemberPresenceProps, SmallPresence, type Member } from './SpacePresence';
import translations from '../translations';

export default {
  title: 'plugin-space/SpacePresence',
  decorators: [withTheme],
  parameters: { translations },
  actions: { argTypesRegex: '^on.*' },
};

const nViewers = (n: number, match = true): Member[] =>
  Array.from({ length: n }, () => ({
    identity: {
      identityKey: PublicKey.random(),
    },
    presence: SpaceMember.PresenceState.ONLINE,
    match,
    lastSeen: Date.now(),
  }));

export const Full = (props: MemberPresenceProps) => {
  const p: MemberPresenceProps = {
    ...props,
  };

  return (
    <Tooltip.Provider>
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
    </Tooltip.Provider>
  );
};

export const Small = (props: MemberPresenceProps) => {
  const p: MemberPresenceProps = {
    ...props,
  };

  return (
    <Tooltip.Provider>
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
    </Tooltip.Provider>
  );
};
