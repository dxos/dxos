//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { Ref } from '@dxos/echo-schema';
import { live, makeRef, RefArray } from '@dxos/live-object';
import { DataType } from '@dxos/schema';

import { getDateString } from './util';

//
// Outline
//

export const OutlineType = Schema.Struct({
  name: Schema.optional(Schema.String),
  content: Ref(DataType.Text),
}).pipe(
  Type.def({
    typename: 'dxos.org/type/Outline',
    version: '0.2.0',
  }),
);

export interface OutlineType extends Schema.Schema.Type<typeof OutlineType> {}

//
// Journal
//

export const JournalEntryType = Schema.Struct({
  date: Schema.String, // TODO(burdon): Date.
  content: Ref(DataType.Text),
}).pipe(
  Type.def({
    typename: 'dxos.org/type/JournalEntry',
    version: '0.2.0',
  }),
);

export interface JournalEntryType extends Schema.Schema.Type<typeof JournalEntryType> {}

export const JournalType = Schema.Struct({
  name: Schema.optional(Schema.String),
  entries: Schema.mutable(Schema.Array(Ref(JournalEntryType))),
}).pipe(
  Type.def({
    typename: 'dxos.org/type/Journal',
    version: '0.2.0',
  }),
);

export interface JournalType extends Schema.Schema.Type<typeof JournalType> {}

export const createOutline = (name?: string): OutlineType => {
  return live(OutlineType, {
    name,
    content: makeRef(live(DataType.Text, { content: '' })),
  });
};

export const createJournalEntry = (date = new Date()): JournalEntryType => {
  return live(JournalEntryType, {
    date: getDateString(date),
    content: makeRef(live(DataType.Text, { content: '' })),
  });
};

export const getJournalEntries = (journal: JournalType, date: Date): JournalEntryType[] => {
  const str = getDateString(date);
  return RefArray.targets(journal.entries).filter((entry) => entry.date === str);
};
