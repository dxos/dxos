//
// Copyright 2024 DXOS.org
//

import { EchoObject, Ref, S } from '@dxos/echo-schema';
import { create, makeRef, RefArray } from '@dxos/live-object';

import { Tree, TreeType } from './tree';

//
// Outline
//

export const OutlineType = S.Struct({
  name: S.optional(S.String),
  tree: Ref(TreeType),
}).pipe(EchoObject('dxos.org/type/Outline', '0.1.0'));

export interface OutlineType extends S.Schema.Type<typeof OutlineType> {}

//
// Journal
//

export const JournalEntryType = S.Struct({
  date: S.String, // TODO(burdon): Date.
  tree: Ref(TreeType),
}).pipe(EchoObject('dxos.org/type/JournalEntry', '0.1.0'));

export interface JournalEntryType extends S.Schema.Type<typeof JournalEntryType> {}

export const JournalType = S.Struct({
  name: S.optional(S.String),
  entries: S.mutable(S.Array(Ref(JournalEntryType))),
}).pipe(EchoObject('dxos.org/type/Journal', '0.1.0'));

export interface JournalType extends S.Schema.Type<typeof JournalType> {}

export const createJournalEntry = (date = new Date()): JournalEntryType => {
  return create(JournalEntryType, {
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
export const getDateString = (date: Date) => {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
};
