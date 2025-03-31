//
// Copyright 2025 DXOS.org
//

import { formatISO } from 'date-fns/formatISO';

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create, makeRef } from '@dxos/live-object';

import { OutlinerAction, JournalType, JournalEntryType, Tree, OutlineType } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: OutlinerAction.CreateJournal,
      resolve: ({ name }) => {
        const tree = new Tree();
        tree.addNode(tree.root);
        return {
          data: {
            object: create(JournalType, {
              name,
              entries: [
                makeRef(
                  create(JournalEntryType, {
                    date: formatISO(new Date(), { representation: 'date' }),
                    tree: makeRef(tree.tree),
                  }),
                ),
              ],
            }),
          },
        };
      },
    }),
    createResolver({
      intent: OutlinerAction.CreateOutline,
      resolve: ({ name }) => ({
        data: {
          object: create(OutlineType, {
            name,
            tree: makeRef(Tree.create()),
          }),
        },
      }),
    }),
  ]);
