//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, test } from 'vitest';

import { Listbox } from '@dxos/react-ui-list';

import { type Member, PresenceItems } from './SpacePresence.tsx';

const member: Member = {
  identityKey: 'a'.repeat(64),
  role: 'edit',
  online: true,
  rowId: 'peer',
  now: 10,
  sessions: [
    { sessionId: 'newest', lastSeen: 10, movedAt: 9, currentlyAttended: true },
    { sessionId: 'older', lastSeen: 10, movedAt: 5, currentlyAttended: true },
  ],
};

/** The session each row asks for its actions on, in row order; `undefined` for the person themself. */
const renderedTargets = (showSessions: boolean) => {
  const targets: (string | undefined)[] = [];
  renderToStaticMarkup(
    <Listbox.Root items={[]}>
      <PresenceItems
        member={member}
        showSessions={showSessions}
        renderActions={(_member, sessionId) => {
          targets.push(sessionId);
          return null;
        }}
      />
    </Listbox.Root>,
  );
  return targets;
};

describe('PresenceItems', () => {
  test('a person’s row acts on the person, so Follow tracks whichever session moves', ({ expect }) => {
    expect(renderedTargets(false)).toEqual([undefined]);
  });

  test('each session’s row acts on that session', ({ expect }) => {
    expect(renderedTargets(true)).toEqual(['newest', 'older']);
  });
});
