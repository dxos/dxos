//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { Ref } from '@dxos/echo-schema';
import { live, makeRef, RefArray } from '@dxos/live-object';

import { Tree, TreeType } from './tree';

//
// Outline
//

export const OutlineType = Schema.Struct({
  name: Schema.optional(Schema.String),
  tree: Ref(TreeType),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Outline',
    version: '0.1.0',
  }),
);

export interface OutlineType extends Schema.Schema.Type<typeof OutlineType> {}

//
// Journal
//

export const JournalEntryType = Schema.Struct({
  date: Schema.String, // TODO(burdon): Date.
  tree: Ref(TreeType),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/JournalEntry',
    version: '0.1.0',
  }),
);

export interface JournalEntryType extends Schema.Schema.Type<typeof JournalEntryType> {}

export const JournalType = Schema.Struct({
  name: Schema.optional(Schema.String),
  entries: Schema.mutable(Schema.Array(Ref(JournalEntryType))),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Journal',
    version: '0.1.0',
  }),
);

export interface JournalType extends Schema.Schema.Type<typeof JournalType> {}

export const createJournalEntry = (date = new Date()): JournalEntryType => {
  return live(JournalEntryType, {
    date: getDateString(date),
    tree: makeRef(createTree()),
  });
};

export const getJournalEntries = (journal: JournalType, date: Date): JournalEntryType[] => {
  const str = getDateString(date);
  return RefArray.targets(journal.entries).filter((entry) => entry.date === str);
};

export const createTree = () => {
  const tree = new Tree();
  tree.addNode(tree.root);
  return tree.tree;
};

/**
 * Date string in YYYY-MM-DD format (based on current timezone).
 */
export const getDateString = (date = new Date()) => {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
};

/**
 * Parse date string in YYYY-MM-DD format (based on current timezone).
 */
export const parseDateString = (str: string) => {
  const date = new Date(str);
  return new Date(date.getTime() + date.getTimezoneOffset() * 60_000);
};
