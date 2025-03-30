//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create, makeRef } from '@dxos/live-object';

import { TreeType, TreeNodeType, OutlinerAction, JournalType } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: OutlinerAction.CreateJournal,
      resolve: ({ name }) => ({
        data: {
          object: create(JournalType, {
            name,
            entries: [],
          }),
        },
      }),
    }),
    createResolver({
      intent: OutlinerAction.CreateOutline,
      resolve: ({ name }) => ({
        data: {
          object: create(TreeType, {
            name,
            root: makeRef(
              create(TreeNodeType, {
                text: '',
                children: [makeRef(create(TreeNodeType, { text: '', children: [] }))],
              }),
            ),
          }),
        },
      }),
    }),
  ]);
