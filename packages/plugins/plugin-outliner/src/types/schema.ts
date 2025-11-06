//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';

import { getDateString } from './util';

//
// Outline
//

export const OutlineType = Schema.Struct({
  name: Schema.optional(Schema.String),
  content: Type.Ref(Text.Text),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Outline',
    version: '0.2.0',
  }),
);

export interface OutlineType extends Schema.Schema.Type<typeof OutlineType> {}

//
// Journal
//

export const JournalEntryType = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  content: Type.Ref(Text.Text),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/JournalEntry',
    version: '0.2.0',
  }),
);

export interface JournalEntryType extends Schema.Schema.Type<typeof JournalEntryType> {}

export const JournalType = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  entries: Schema.mutable(Schema.Array(Type.Ref(JournalEntryType))),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Journal',
    version: '0.2.0',
  }),
);

export interface JournalType extends Schema.Schema.Type<typeof JournalType> {}

//
// Helpers
//

export const createOutline = (name?: string, content?: string): OutlineType => {
  return Obj.make(OutlineType, {
    name,
    content: Ref.make(Text.make(content)),
  });
};

export const createJournal = (name?: string): JournalType => {
  return Obj.make(JournalType, {
    name,
    entries: [Ref.make(createJournalEntry())],
  });
};

export const createJournalEntry = (date = new Date()): JournalEntryType => {
  return Obj.make(JournalEntryType, {
    date: getDateString(date),
    content: Ref.make(Text.make()),
  });
};

export const getJournalEntries = (journal: JournalType, date: Date): JournalEntryType[] => {
  const str = getDateString(date);
  return Ref.Array.targets(journal.entries).filter((entry) => entry.date === str);
};
