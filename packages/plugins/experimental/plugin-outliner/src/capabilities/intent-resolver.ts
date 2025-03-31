//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create, makeRef } from '@dxos/live-object';

import { OutlinerAction, JournalType, JournalEntryType, Tree, OutlineType } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: OutlinerAction.CreateJournal,
      resolve: ({ name }) => ({
        data: {
          object: create(JournalType, {
            name,
            entries: [
              makeRef(
                create(JournalEntryType, {
                  date: new Date(),
                  tree: makeRef(Tree.create()),
                }),
              ),
            ],
          }),
        },
      }),
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
