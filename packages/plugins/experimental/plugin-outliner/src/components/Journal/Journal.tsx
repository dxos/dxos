//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { create } from '@dxos/live-object';
import { IconButton, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { OUTLINER_PLUGIN } from '../../meta';
import { type JournalType, JournalEntryType, TreeNodeType } from '../../types';
import { Outliner } from '../Outliner';

type JournalRootProps = ThemedClassName<{
  journal?: JournalType;
}>;

// TODO(burdon): Convert into single grid.
const JournalRoot = ({ journal, classNames }: JournalRootProps) => {
  const { t } = useTranslation(OUTLINER_PLUGIN);
  const date = new Date();

  const [today, setToday] = useState<JournalEntryType>();
  useEffect(() => {
    const entry = journal?.entries.find((entry) => entry.date.toDateString() === date.toDateString());
    if (entry) {
      setToday(entry);
    }
  }, [journal, date]);

  // TODO(burdon): CRDT issue (merge entries with same date?)
  const handleCreateEntry = useCallback(() => {
    const entry = create(JournalEntryType, { date, root: create(TreeNodeType, { children: [], text: '' }) });
    journal?.entries.push(entry);
    setToday(entry);
  }, [journal, date]);

  return (
    <div className={mx('flex flex-col overflow-y-auto divide-y divide-separator', classNames)}>
      {journal?.entries.map((entry) => <JournalEntry key={entry.id} entry={entry} />)}
      {!today && (
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
