//
// Copyright 2025 DXOS.org
//

import { format } from 'date-fns/format';
import React, { useCallback, useEffect, useState } from 'react';

import { makeRef, RefArray } from '@dxos/live-object';
import { IconButton, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { OUTLINER_PLUGIN } from '../../meta';
import {
  type JournalType,
  createJournalEntry,
  type JournalEntryType,
  getJournalEntries,
  getDateString,
  parseDateString,
} from '../../types';
import { Outliner, type OutlinerRootProps } from '../Outliner';

type JournalRootProps = ThemedClassName<
  {
    journal?: JournalType;
  } & Pick<OutlinerRootProps, 'onCreate' | 'onDelete' | 'onAction'>
>;

// TODO(burdon): Convert into single grid.
const JournalRoot = ({ journal, classNames, ...props }: JournalRootProps) => {
  const { t } = useTranslation(OUTLINER_PLUGIN);
  const date = new Date();

  const [showAddEntry, setShowAddEntry] = useState(false);
  useEffect(() => {
    if (!journal) {
      return;
    }

    // TODO(burdon): CRDT issue (merge entries with same date?)
    const entries = getJournalEntries(journal, date);
    setShowAddEntry(entries.length === 0);
  }, [journal, journal?.entries.length, date]);

  const handleCreateEntry = useCallback(() => {
    if (!journal) {
      return;
    }

    const entry = createJournalEntry();
    journal.entries.push(makeRef(entry));
    setShowAddEntry(false);
  }, [journal, date]);

  return (
    <div className={mx('flex flex-col overflow-y-auto divide-y divide-separator', classNames)}>
      {showAddEntry && (
        <div className='p-2'>
          <IconButton label={t('create entry label')} icon='ph--plus--regular' onClick={handleCreateEntry} />
        </div>
      )}
      {RefArray.targets(journal?.entries ?? [])
        .sort(({ date: a }, { date: b }) => (a < b ? 1 : a > b ? -1 : 0))
        .map((entry) => (
          <JournalEntry key={entry.id} entry={entry} classNames='pbs-4 pbe-4' {...props} />
        ))}
    </div>
  );
};

type JournalEntryProps = ThemedClassName<
  {
    entry: JournalEntryType;
  } & Pick<OutlinerRootProps, 'onCreate' | 'onDelete' | 'onAction'>
>;

const JournalEntry = ({ entry, classNames, ...props }: JournalEntryProps) => {
  if (!entry.tree.target) {
    return null;
  }

  const date = parseDateString(entry.date);
  const isToday = getDateString() === entry.date;
  return (
    <div className={mx('flex flex-col', classNames)}>
      <div className='pis-2'>
        <span className={mx('text-lg', isToday && 'text-primary-500')}>{format(date, 'MMM d, yyyy')}</span>
        <span className='text-sm text-subdued pis-2'>{format(date, 'EEEE')}</span>
      </div>
      <Outliner.Root tree={entry.tree.target} classNames='pbs-2 pbe-2' {...props} />
    </div>
  );
};

export const Journal = {
  Root: JournalRoot,
  Entry: JournalEntry,
};

export type { JournalRootProps, JournalEntryProps };
