//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { Text as TextType } from '@dxos/schema';

import { getDateString } from './util';

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
  entries: Schema.mutable(Schema.Array(Type.Ref(JournalEntry))),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Journal',
    version: '0.2.0',
  }),
);

export interface Journal extends Schema.Schema.Type<typeof Journal> {}

export const make = (name?: string): Journal => {
  return Obj.make(Journal, {
    name,
    entries: [Ref.make(makeEntry())],
  });
};

export const makeEntry = (date = new Date()): JournalEntry => {
  return Obj.make(JournalEntry, {
    date: getDateString(date),
    content: Ref.make(TextType.make()),
  });
};

export const getEntries = (journal: Journal, date: Date): JournalEntry[] => {
  const str = getDateString(date);
  return Ref.Array.targets(journal.entries).filter((entry) => entry.date === str);
};
