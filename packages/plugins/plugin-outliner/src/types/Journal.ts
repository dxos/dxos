//
// Copyright 2024 DXOS.org
//

import { isAfter, isBefore, isEqual } from 'date-fns';
import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { Text as TextType } from '@dxos/schema';

import { getDateString, parseDateString } from './util';

export const JournalEntry = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  content: Type.Ref(TextType.Text),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/JournalEntry',
    version: '0.2.0',
  }),
);

export interface JournalEntry extends Schema.Schema.Type<typeof JournalEntry> {}

export const Journal = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  // TODO(burdon): Convert map of references indexed by sortable ISO date.
  entries: Schema.mutable(Schema.Record({ key: Schema.String, value: Type.Ref(JournalEntry) })),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Journal',
    version: '0.3.0',
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
    content: Ref.make(TextType.make()),
  });
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
