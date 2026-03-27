//
// Copyright 2025 DXOS.org
//

import { format } from 'date-fns/format';
import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { ComposableProps, IconButton, ScrollArea, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { composableProps, mx } from '@dxos/ui-theme';

import { meta } from '../../meta';
import { Journal as JournalType, getDateString, parseDateString } from '../../types';
import { Outline, type OutlineController, type OutlineProps } from '../Outline';

const RECENT = 7 * 24 * 60 * 60 * 1_000;

export type JournalProps = Omit<ComposableProps<HTMLDivElement>, 'onSelect'> &
  Pick<JournalEntryProps, 'onSelect'> & {
    journal: JournalType.Journal;
  };

// TODO(burdon): Virtualize.
export const Journal = forwardRef<HTMLDivElement, JournalProps>(({ journal, onSelect, ...props }, forwardedRef) => {
  const { t } = useTranslation(meta.id);
  const date = new Date();

  // Subscribe to the journal object reactively so we pick up new entries.
  const [journalSnapshot] = useObject(journal);
  const entryRefs = useMemo(
    () =>
      Object.entries(journalSnapshot?.entries ?? {})
        .toSorted(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
        .map(([, ref]) => ref),
    [journalSnapshot],
  );

  const handleCreateEntry = useCallback(() => {
    if (!journal) {
      return;
    }

    const entry = JournalType.makeEntry();
    Obj.change(journal, (obj) => {
      obj.entries[getDateString(date)] = Ref.make(entry);
    });
  }, [journal, date]);

  return (
    <ScrollArea.Root {...composableProps(props)} orientation='vertical' ref={forwardedRef}>
      <ScrollArea.Viewport>
        {entryRefs.length === 0 && (
          <div className='p-2'>
            <IconButton label={t('create entry label')} icon='ph--plus--regular' onClick={handleCreateEntry} />
          </div>
        )}
        {entryRefs.map((ref, i) => (
          <JournalEntry key={ref.dxn?.toString() ?? i} entryRef={ref} classNames='p-2' onSelect={onSelect} autoFocus={i === 0} />
        ))}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

Journal.displayName = 'Journal';

type JournalEntryProps = ThemedClassName<
  {
    entryRef: Ref.Ref<JournalType.JournalEntry>;
    onSelect?: (event: { date: Date }) => void;
  } & Pick<OutlineProps, 'autoFocus'>
>;

const JournalEntry = ({ classNames, entryRef, onSelect, ...props }: JournalEntryProps) => {
  const { t } = useTranslation(meta.id);
  const [entry] = useObject(entryRef);
  const outlinerRef = useRef<OutlineController>(null);
  const [focused, setFocused] = useState(false);

  const date = entry ? parseDateString(entry.date) : undefined;
  const isToday = entry ? getDateString() === entry.date : false;
  const isRecent = useMemo(() => (entry ? Date.now() - new Date(entry.date).getTime() < RECENT : false), [entry?.date]);

  const handleFocus = useCallback(() => {
    outlinerRef.current?.focus();
    if (date) {
      onSelect?.({ date });
    }
  }, [date, onSelect]);

  if (!entry || !entry.content.target) {
    return null;
  }

  return (
    <div
      className={mx('group flex flex-col', classNames)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      // TODO(burdon): Experiment with `peer-focus-within` Tailwind selector.
      {...{ 'data-has-focus': focused ? true : undefined }}
    >
      <div className='flex items-center gap-2 bg-transparent'>
        <IconButton
          label={date ? format(date, 'MMM d, yyyy') : ''}
          icon={isToday ? 'ph--calendar-check--regular' : 'ph--calendar-blank--regular'}
          onClick={handleFocus}
        />
        {isRecent && date && <div className='text-sm text-subdued'>{format(date, 'EEEE')}</div>}
        {isToday && <div className='text-xs'>{t('today label')}</div>}
      </div>
      <Outline
        ref={outlinerRef}
        id={entry.id}
        text={entry.content.target}
        classNames='pt-2 pb-2'
        scrollable={false}
        showSelected={false}
        {...props}
      />
    </div>
  );
};
