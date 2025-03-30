//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { RefArray } from '@dxos/live-object';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type JournalType, type JournalEntryType } from '../../types';
import { Outliner } from '../Outliner';

type JournalRootProps = ThemedClassName<{
  journal: JournalType;
}>;

// TODO(burdon): Convert into single grid.
const JournalRoot = ({ journal, classNames }: JournalRootProps) => {
  // useEffect(() => {
  //   // TODO(burdon): CRDT issue (merge).
  //   if (journal.entries.length === 0) {
  //     // const space = getSpace(journal);
  //     // invariant(space);

  //     console.log(1);
  //     // const first = create(TreeNodeType, { children: [], text: 'Hello, world!' });
  //     const entry = create(JournalEntryType, {
  //       date: new Date(),
  //       // TOOD(burdon): ERROR: object is not an EchoObject
  //       root: create(TreeNodeType, {
  //         children: [
  //           // makeRef(first)
  //         ],
  //         text: '',
  //       }),
  //     });
  //     console.log(2);

  //     journal.entries.push(entry);
  //   }
  // }, [journal]);

  console.log(JSON.stringify(journal, null, 2));

  return (
    <div className={mx('flex flex-col overflow-y-auto', classNames)}>
      {RefArray.allResolvedTargets(journal.entries).map((entry) => (
        <JournalEntry key={entry.id} entry={entry} />
      ))}
    </div>
  );
};

type JournalEntryProps = ThemedClassName<{
  entry: JournalEntryType;
}>;

const JournalEntry = ({ entry, classNames }: JournalEntryProps) => {
  console.log(entry);
  if (!entry.root.target) {
    return null;
  }

  return (
    <div className={mx(classNames, 'flex flex-col')}>
      <div className='p-2 text-lg'>{entry.date.toDateString()}</div>
      <Outliner.Root root={entry.root.target} />
    </div>
  );
};

export const Journal = {
  Root: JournalRoot,
  Entry: JournalEntry,
};

export type { JournalRootProps, JournalEntryProps };
