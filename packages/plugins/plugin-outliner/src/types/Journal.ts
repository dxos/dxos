//
// Copyright 2024 DXOS.org
//

import { isAfter, isBefore, isEqual } from 'date-fns';
import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { updateText } from '@dxos/echo-db';
import { SystemTypeAnnotation } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';

import { getDateString, parseDateString } from './util';

export const JournalEntry = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  content: Ref.Ref(Text.Text),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.journalEntry',
    version: '0.1.0',
  }),
  SystemTypeAnnotation.set(true),
);

export interface JournalEntry extends Schema.Schema.Type<typeof JournalEntry> {}

export const Journal = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  // TODO(burdon): Convert map of references indexed by sortable ISO date.
  entries: Schema.Record({ key: Schema.String, value: Ref.Ref(JournalEntry) }),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.journal',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--calendar-check--regular',
    hue: 'indigo',
  }),
);

export interface Journal extends Schema.Schema.Type<typeof Journal> {}

export const make = ({ name, entries }: Partial<Obj.MakeProps<typeof Journal>> = {}): Journal => {
  const today = getDateString(new Date());
  return Obj.make(Journal, {
    name,
    entries: entries ?? { [today]: Ref.make(makeEntry()) },
  });
};

export const makeEntry = (date = new Date()): JournalEntry => {
  return Obj.make(JournalEntry, {
    date: getDateString(date),
    content: Ref.make(Text.make()),
  });
};

/**
 * Append a checkbox bullet to a journal entry's content.
 */
export const addBullet = async (entry: JournalEntry, text: string) => {
  const textObj = await entry.content.load();
  const existing = textObj.content ?? '';
  const sanitized = text.trim().replace(/\n+/g, ' ');
  const bullet = `- [ ] ${sanitized}`;
  const newContent = existing.length > 0 ? `${existing}\n${bullet}` : bullet;
  updateText(textObj, ['content'], newContent);
};

/**
 * Get or create the entry for a given date in a journal.
 * If the entry doesn't exist, creates one and adds it to the journal.
 * Requires `db` to persist the new entry.
 */
export const getOrCreateEntry = (journal: Journal, db: { add: (obj: any) => any }, date = new Date()): JournalEntry => {
  const dateKey = getDateString(date);
  const existing = journal.entries[dateKey]?.target;
  if (existing) {
    return existing;
  }

  const entry = db.add(makeEntry(date)) as JournalEntry;
  Obj.change(journal, (draft) => {
    draft.entries[dateKey] = Ref.make(entry);
  });
  return entry;
};

export const getEntries = (journal: Journal, range?: { from?: Date; to?: Date }): JournalEntry[] => {
  return Ref.Array.targets(Object.values(journal.entries))
    .sort(({ date: a }, { date: b }) => (a < b ? 1 : a > b ? -1 : 0))
    .filter(({ date }) => {
      if (!range) {
        return true;
      }

      const entryDate = parseDateString(date);
      const { from, to } = range;
      const afterOrEqualFrom = !from || isAfter(entryDate, from) || isEqual(entryDate, from);
      const beforeOrEqualTo = !to || isBefore(entryDate, to) || isEqual(entryDate, to);
      return afterOrEqualFrom && beforeOrEqualTo;
    });
};
