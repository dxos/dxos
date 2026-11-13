//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type Identity } from '@dxos/halo';
import { useIdentity, useSpaces } from '@dxos/halo-react';
import { type SpaceId } from '@dxos/keys';

import { type Stage, reached } from '../stage.ts';
import { Contacts, Members } from './Contacts.tsx';
import { Devices } from './Devices.tsx';
import { InviteBar } from './Invitations.tsx';
import { ProfileChip } from './Profile.tsx';
import { Recovery } from './Recovery.tsx';
import { SpacePicker } from './Spaces.tsx';
import { Boundary } from './ui.tsx';
import { Welcome } from './Welcome.tsx';

export type ContactBookProps = {
  stage: Stage;
};

/**
 * The contact book on one device, with what `stage` has built. It runs against
 * the HALO services of the `HaloProvider` above it.
 */
export const ContactBook = ({ stage }: ContactBookProps) => {
  // #region follow
  /** The identity, re-rendering on each change; undefined before it exists. */
  const identity = useIdentity();
  // #endregion
  return identity ? (
    <Signedin stage={stage} identity={identity} />
  ) : (
    <Welcome stage={stage} />
  );
};

type Tab = 'people' | 'devices' | 'recovery';

const Signedin = ({
  stage,
  identity,
}: {
  stage: Stage;
  identity: Identity.Info;
}) => {
  // #region spaces
  /** The spaces that are open, re-rendering on each change. */
  const spaces = useSpaces();
  /** The named ones, by name. */
  const named = useMemo(
    () =>
      spaces
        .filter((space) => space.name)
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [spaces],
  );
  // #endregion
  const [selected, setSelected] = useState<SpaceId>();
  const current = named.find((space) => space.id === selected) ?? named[0];
  const [tab, setTab] = useState<Tab>('people');
  const tabs: { value: Tab; label: string; at: Stage }[] = [
    {
      value: 'people',
      label: reached(stage, 'contacts') ? 'Contacts' : 'People',
      at: 'invite',
    },
    { value: 'devices', label: 'Devices', at: 'devices' },
    { value: 'recovery', label: 'Recovery', at: 'recovery' },
  ];
  const shown = tabs.filter((tab) => reached(stage, tab.at));

  return (
    <div className='cb-book'>
      <header className='cb-header'>
        <ProfileChip name={identity.displayName} />
        {reached(stage, 'spaces') && (
          <SpacePicker
            spaces={named}
            current={current?.id}
            onSelect={setSelected}
          />
        )}
      </header>
      {reached(stage, 'invite') && <InviteBar spaceId={current?.id} />}
      {shown.length > 1 && (
        <nav className='cb-tabs'>
          {shown.map(({ value, label }) => (
            <button
              key={value}
              className='cb-tab'
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      <main className='cb-main'>
        <Boundary key={tab}>
          {!reached(stage, 'spaces') && (
            <p className='cb-muted'>
              Hello, {identity.displayName}. This device holds your identity.
            </p>
          )}
          {reached(stage, 'spaces') && !reached(stage, 'invite') && (
            <p className='cb-muted'>
              {current
                ? `You're in ${current.name}.`
                : 'No spaces yet. Make one with New space.'}
            </p>
          )}
          {reached(stage, 'invite') &&
            tab === 'people' &&
            (reached(stage, 'contacts') ? (
              <Contacts />
            ) : (
              current && <Members spaceId={current.id} />
            ))}
          {tab === 'devices' && reached(stage, 'devices') && <Devices />}
          {tab === 'recovery' && reached(stage, 'recovery') && <Recovery />}
        </Boundary>
      </main>
    </div>
  );
};
