//
// Copyright 2025 DXOS.org
//

import { format } from 'date-fns/format';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { makeRef, RefArray } from '@dxos/live-object';
import { IconButton, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { OUTLINER_PLUGIN } from '../../meta';
import {
  createJournalEntry,
  getJournalEntries,
  getDateString,
  parseDateString,
  type JournalType,
  type JournalEntryType,
} from '../../types';
import { Outliner, type OutlinerController, type OutlinerProps } from '../Outliner';

// TODO(burdon): Only show one selected line entry.

type JournalProps = ThemedClassName<{
  journal: JournalType;
}>;

// TODO(burdon): Virtualize.
export const Journal = ({ journal, classNames, ...props }: JournalProps) => {
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
    <div className={mx('flex flex-col w-full overflow-y-auto', classNames)}>
      {showAddEntry && (
        <div className='p-2'>
          <IconButton label={t('create entry label')} icon='ph--plus--regular' onClick={handleCreateEntry} />
        </div>
      )}
      {RefArray.targets(journal?.entries ?? [])
        .sort(({ date: a }, { date: b }) => (a < b ? 1 : a > b ? -1 : 0))
        .map((entry, i) => (
          <JournalEntry key={entry.id} entry={entry} classNames='p-2' {...props} autoFocus={i === 0} />
        ))}
    </div>
  );
};

type JournalEntryProps = ThemedClassName<
  {
    entry: JournalEntryType;
  } & Pick<OutlinerProps, 'autoFocus'>
>;

const JournalEntry = ({ entry, classNames, ...props }: JournalEntryProps) => {
  const { t } = useTranslation(OUTLINER_PLUGIN);
  const date = parseDateString(entry.date);
  const isToday = getDateString() === entry.date;
  const outlinerRef = useRef<OutlinerController>(null);

  const handleFocus = useCallback(() => {
    outlinerRef.current?.focus();
  }, []);

  if (!entry.content.target) {
    return null;
  }

  return (
    <div className={mx('flex flex-col', classNames)}>
      <div className='flex items-center gap-2 bg-transparent'>
        <IconButton
          label={format(date, 'MMM d, yyyy')}
          icon={isToday ? 'ph--calendar-dot--regular' : 'ph--calendar-blank--regular'}
          onClick={handleFocus}
        />
        <div className='text-sm text-subdued'>{format(date, 'EEEE')}</div>
        {isToday && <div className='text-xs'>{t('today label')}</div>}
      </div>
      <Outliner
        ref={outlinerRef}
        id={entry.id}
        text={entry.content.target}
        classNames='pbs-2 pbe-2'
        scrollable={false}
        showSelected={false}
        {...props}
      />
    </div>
  );
};
