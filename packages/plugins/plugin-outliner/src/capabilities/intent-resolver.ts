//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create, makeRef } from '@dxos/live-object';

import { OutlinerAction, JournalType, OutlineType, createJournalEntry, createTree, TaskType } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: OutlinerAction.CreateJournal,
      resolve: ({ name }) => ({
        data: {
          object: create(JournalType, {
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
          object: create(OutlineType, {
            name,
            tree: makeRef(createTree()),
          }),
        },
      }),
    }),
    createResolver({
      intent: OutlinerAction.CreateTree,
      resolve: () => ({
        data: {
          object: createTree(),
        },
      }),
    }),
    createResolver({
      intent: OutlinerAction.CreateTask,
      resolve: ({ node }) => {
        const task = create(TaskType, {
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
