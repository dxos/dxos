//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

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

export const Sessions = () => <Full showSessions />;

const keyboardMembers = viewers(4);

/** The avatars and the "+N" overflow open the viewers list from the keyboard. */
export const TestKeyboard = {
  render: () => (
    <div className='p-4'>
      <FullPresence members={keyboardMembers} />
    </div>
  ),
  play: async () => {
    await userEvent.tab();
    const avatar = document.activeElement;
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getAllByTestId('spacePlugin.presence.row')).toHaveLength(4));
    await expect(screen.getAllByTestId('spacePlugin.presence.row')[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryAllByTestId('spacePlugin.presence.row')).toHaveLength(0));
    // Closing returns the keyboard to the avatar that opened the list, and so does tabbing back out of it.
    await waitFor(() => expect(document.activeElement).toBe(avatar));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getAllByTestId('spacePlugin.presence.row')).toHaveLength(4));
    await expect(screen.getAllByTestId('spacePlugin.presence.row')[0]).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(document.activeElement).not.toBe(avatar));
    await userEvent.tab({ shift: true });
    await waitFor(() => expect(document.activeElement).toBe(avatar));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryAllByTestId('spacePlugin.presence.row')).toHaveLength(0));

    // Reopening from an avatar highlights its row again, even after another row was selected.
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getAllByTestId('spacePlugin.presence.row')).toHaveLength(4));
    await userEvent.click(screen.getAllByTestId('spacePlugin.presence.row')[1]);
    await expect(screen.getAllByTestId('spacePlugin.presence.row')[1]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryAllByTestId('spacePlugin.presence.row')).toHaveLength(0));
    avatar instanceof HTMLElement && avatar.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getAllByTestId('spacePlugin.presence.row')).toHaveLength(4));
    await expect(screen.getAllByTestId('spacePlugin.presence.row')[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryAllByTestId('spacePlugin.presence.row')).toHaveLength(0));

    // Switching to another avatar while open reseeds the selection, and closing returns to that avatar.
    const avatars = within(screen.getByTestId('spacePlugin.presence')).getAllByRole('button');
    avatars[0].focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getAllByTestId('spacePlugin.presence.row')).toHaveLength(4));
    await userEvent.click(screen.getAllByTestId('spacePlugin.presence.row')[2]);
    await userEvent.click(avatars[1]);
    await waitFor(() =>
      expect(screen.getAllByTestId('spacePlugin.presence.row')[1]).toHaveAttribute('aria-selected', 'true'),
    );
    await expect(screen.getAllByTestId('spacePlugin.presence.row')[2]).not.toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryAllByTestId('spacePlugin.presence.row')).toHaveLength(0));
    await waitFor(() => expect(document.activeElement).toBe(avatars[1]));

    const overflow = screen.getByRole('button', { name: /· 4/ });
    overflow.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getAllByTestId('spacePlugin.presence.row')).toHaveLength(4));
  },
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

const EMPTY_EVENT = 'presence-story:empty';
const REFILL_EVENT = 'presence-story:refill';
const refillMembers = viewers(2);

/** A list whose viewers all leave while it is open stays closed when viewers come back. */
export const TestEmptied = {
  render: () => {
    const [members, setMembers] = useState(refillMembers);
    useEffect(() => {
      const empty = () => setMembers([]);
      const refill = () => setMembers(refillMembers);
      document.addEventListener(EMPTY_EVENT, empty);
      document.addEventListener(REFILL_EVENT, refill);
      return () => {
        document.removeEventListener(EMPTY_EVENT, empty);
        document.removeEventListener(REFILL_EVENT, refill);
      };
    }, []);
    return (
      <div className='p-4'>
        <FullPresence members={members} />
      </div>
    );
  },
  play: async () => {
    await userEvent.click(screen.getAllByTestId('spacePlugin.presence.member')[0]);
    await waitFor(() => expect(screen.getAllByTestId('spacePlugin.presence.row')).toHaveLength(2));
    document.dispatchEvent(new Event(EMPTY_EVENT));
    await waitFor(() => expect(screen.queryByTestId('spacePlugin.presence')).toBeNull());
    document.dispatchEvent(new Event(REFILL_EVENT));
    await waitFor(() =>
      expect(
        within(screen.getByTestId('spacePlugin.presence')).getAllByTestId('spacePlugin.presence.member'),
      ).toHaveLength(2),
    );
    await expect(screen.queryAllByTestId('spacePlugin.presence.row')).toHaveLength(0);
  },
};

const LEAVE_EVENT = 'presence-story:leave';
const leavingMembers = viewers(3);

/** Closing a list whose opener left while it was open hands the keyboard to the first remaining avatar. */
export const TestOpenerLeaves = {
  render: () => {
    const [members, setMembers] = useState(leavingMembers);
    useEffect(() => {
      const leave = () => setMembers(leavingMembers.slice(1));
      document.addEventListener(LEAVE_EVENT, leave);
      return () => document.removeEventListener(LEAVE_EVENT, leave);
    }, []);
    return (
      <div className='p-4'>
        <FullPresence members={members} />
      </div>
    );
  },
  play: async () => {
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getAllByTestId('spacePlugin.presence.row')).toHaveLength(3));
    document.dispatchEvent(new Event(LEAVE_EVENT));
    await waitFor(() => expect(screen.getAllByTestId('spacePlugin.presence.row')).toHaveLength(2));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryAllByTestId('spacePlugin.presence.row')).toHaveLength(0));
    const [first] = within(screen.getByTestId('spacePlugin.presence')).getAllByRole('button');
    await waitFor(() => expect(document.activeElement).toBe(first));
  },
};
