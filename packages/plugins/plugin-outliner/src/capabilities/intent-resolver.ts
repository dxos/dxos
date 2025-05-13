//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { live, makeRef } from '@dxos/live-object';
import { DataType } from '@dxos/schema';

import { OutlinerAction, JournalType, OutlineType, createJournalEntry, createTree } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: OutlinerAction.CreateJournal,
      resolve: ({ name }) => ({
        data: {
          object: live(JournalType, {
            name,
            entries: [makeRef(createJournalEntry())],
          }),
        },
      }),
    }),
    createResolver({
      intent: OutlinerAction.CreateOutline,
      resolve: ({ name }) => ({
        data: {
          object: live(OutlineType, {
            name,
            tree: makeRef(createTree()),
          }),
        },
      }),
    }),
    createResolver({
      intent: OutlinerAction.CreateTask,
      resolve: ({ node }) => {
        const task = live(DataType.Task, {
          text: node.data.text,
        });
        return {
          data: {
            object: task,
          },
        };
      },
    }),
  ]);
