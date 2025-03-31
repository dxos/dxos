//
// Copyright 2025 DXOS.org
//

import { formatISO } from 'date-fns/formatISO';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { create, makeRef, RefArray } from '@dxos/live-object';
import { IconButton, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { OUTLINER_PLUGIN } from '../../meta';
import { type JournalType, JournalEntryType, Tree } from '../../types';
import { Outliner } from '../Outliner';

type JournalRootProps = ThemedClassName<{
  journal?: JournalType;
}>;

// TODO(burdon): Convert into single grid.
const JournalRoot = ({ journal, classNames }: JournalRootProps) => {
  const { t } = useTranslation(OUTLINER_PLUGIN);
  const date = useMemo(() => formatISO(new Date(), { representation: 'date' }), []);

  const [entry, setEntry] = useState<JournalEntryType>();
  useEffect(() => {
    const entry = journal?.entries.find((entry) => entry.target?.date === date);
    if (entry) {
      setEntry(entry.target);
    }
  }, [journal, date]);

  // TODO(burdon): CRDT issue (merge entries with same date?)
  const handleCreateEntry = useCallback(() => {
    if (!journal) {
      return;
    }

    const tree = new Tree();
    tree.addNode(tree.root);
    const entry = create(JournalEntryType, { date, tree: makeRef(tree.tree) });
    journal.entries.push(makeRef(entry));
    setEntry(entry);
  }, [journal, date]);

  return (
    <div className={mx('flex flex-col overflow-y-auto divide-y divide-separator', classNames)}>
      {RefArray.targets(journal?.entries ?? []).map((entry) => (
        <JournalEntry key={entry.id} entry={entry} />
      ))}
      {!entry && (
        <div>
          <IconButton label={t('create entry label')} icon='ph--plus--regular' onClick={handleCreateEntry} />
        </div>
      )}
    </div>
  );
};

type JournalEntryProps = ThemedClassName<{
  entry: JournalEntryType;
}>;

const JournalEntry = ({ entry, classNames }: JournalEntryProps) => {
  if (!entry.tree.target) {
    return null;
  }

  return (
    <div className={mx(classNames, 'flex flex-col')}>
      <div className='p-2 text-lg'>{new Date(entry.date).toDateString()}</div>
      <Outliner.Root tree={entry.tree.target} />
    </div>
  );
};

export const Journal = {
  Root: JournalRoot,
  Entry: JournalEntry,
};

export type { JournalRootProps, JournalEntryProps };
