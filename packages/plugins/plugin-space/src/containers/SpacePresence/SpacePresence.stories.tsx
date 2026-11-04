//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { IdentityDid, PublicKey } from '@dxos/keys';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { FullPresence, type Member, type MemberPresenceProps, SmallPresence } from './SpacePresence.tsx';

const viewers = (n: number, currentlyAttended = true): Member[] =>
  Array.from({ length: n }, (_, i) => {
    const identityKey = PublicKey.random().toHex();
    const now = Date.now();
    // Every third viewer has the object open on a second device, which went idle a while ago.
    const sessions = [
      {
        sessionId: 'a',
        lastSeen: now,
        movedAt: now,
        currentlyAttended,
        device: { platform: 'Chrome', os: 'macOS', kind: 'browser' as const },
      },
      ...(i % 3 === 0
        ? [
            {
              sessionId: 'b',
              lastSeen: now,
              movedAt: now - 5 * 60_000,
              currentlyAttended,
              device: { platform: 'App', os: 'iOS', kind: 'mobile' as const },
            },
          ]
        : []),
    ];
    return {
      role: 'admin',
      did: IdentityDid.random(),
      identityKey,
      online: true,
      rowId: identityKey,
      sessions,
      now,
    };
  });

const meta = {
  title: 'plugins/plugin-space/containers/SpacePresence',
  decorators: [withTheme()],
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
      <div className='p-trim-md'>
        <FullPresence members={viewers(1)} {...p} />
      </div>
      <div className='p-trim-md'>
        <FullPresence members={viewers(2)} {...p} />
      </div>
      <div className='p-trim-md'>
        <FullPresence members={viewers(3)} {...p} />
      </div>
      <div className='p-trim-md'>
        <FullPresence members={viewers(3, false)} {...p} />
      </div>
      <div className='p-trim-md'>
        <FullPresence members={viewers(4)} {...p} />
      </div>
      <div className='p-trim-md'>
        <FullPresence members={viewers(5)} {...p} />
      </div>
      <div className='p-trim-md'>
        <FullPresence members={viewers(5, false)} {...p} />
      </div>
      <div className='p-trim-md'>
        <FullPresence members={viewers(10)} {...p} />
      </div>
      <div className='p-trim-md'>
        <FullPresence members={viewers(100)} {...p} />
      </div>
    </div>
  );
};

export const Small = () => {
  return (
    <div className='p-4'>
      <div className='flex gap-3 p-trim-md'>
        <SmallPresence count={0} />
        <SmallPresence count={0} attended />
        <SmallPresence count={0} containsAttended />
      </div>
      <div className='flex gap-3 p-trim-md'>
        <SmallPresence count={1} />
        <SmallPresence count={1} attended />
        <SmallPresence count={1} containsAttended />
      </div>
      <div className='flex gap-3 p-trim-md'>
        <SmallPresence count={2} />
        <SmallPresence count={2} attended />
        <SmallPresence count={2} containsAttended />
      </div>
      <div className='flex gap-3 p-trim-md'>
        <SmallPresence count={3} />
        <SmallPresence count={3} attended />
        <SmallPresence count={3} containsAttended />
      </div>
      <div className='flex gap-3 p-trim-md'>
        <SmallPresence count={4} />
        <SmallPresence count={4} attended />
        <SmallPresence count={4} containsAttended />
      </div>
      <div className='flex gap-3 p-trim-md'>
        <SmallPresence count={5} />
        <SmallPresence count={5} attended />
        <SmallPresence count={5} containsAttended />
      </div>
    </div>
  );
};
