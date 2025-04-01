//
// Copyright 2024 DXOS.org
//

import { formatISO } from 'date-fns/formatISO';

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
    date: formatISO(date, { representation: 'date' }),
    tree: makeRef(createTree()),
  });
};

export const getJournalEntries = (journal: JournalType, date: Date): JournalEntryType[] => {
  const str = formatISO(date, { representation: 'date' });
  return RefArray.targets(journal.entries).filter((entry) => entry.date === str);
};

export const createTree = () => {
  const tree = new Tree();
  tree.addNode(tree.root);
  return tree.tree;
};
