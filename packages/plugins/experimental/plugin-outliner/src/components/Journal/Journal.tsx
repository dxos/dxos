//
// Copyright 2025 DXOS.org
//

import React, { useEffect } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type JournalType, type JournalEntryType } from '../../types';
import { Outliner } from '../Outliner';

type JournalRootProps = ThemedClassName<{
  journal: JournalType;
}>;

// TODO(burdon): Convert into single grid.
const JournalRoot = ({ journal, classNames }: JournalRootProps) => {
  // TODO(burdon): CRDT issue (merge).
  useEffect(() => {
    // TODO(burdon): Create new entry for day if doesn't exist.
  }, [journal]);

  return (
    <div className={mx('flex flex-col overflow-y-auto divide-y divide-separator', classNames)}>
      {journal.entries.map((entry) => (
        <JournalEntry key={entry.id} entry={entry} />
      ))}
    </div>
  );
};

type JournalEntryProps = ThemedClassName<{
  entry: JournalEntryType;
}>;

const JournalEntry = ({ entry, classNames }: JournalEntryProps) => {
  if (!entry.root) {
    return null;
  }

  return (
    <div className={mx(classNames, 'flex flex-col')}>
      <div className='p-2 text-lg'>{entry.date.toDateString()}</div>
      <Outliner.Root root={entry.root} />
    </div>
  );
};

export const Journal = {
  Root: JournalRoot,
  Entry: JournalEntry,
};

export type { JournalRootProps, JournalEntryProps };
