//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { live } from '@dxos/live-object';
import { Task } from '@dxos/schema';

import { OutlinerAction, JournalType, OutlineType, createJournalEntry, createTree } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: OutlinerAction.CreateJournal,
      resolve: ({ name }) => ({
        data: {
          object: live(JournalType, {
            name,
            entries: [Ref.make(createJournalEntry())],
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
            tree: Ref.make(createTree()),
          }),
        },
      }),
    }),
    createResolver({
      intent: OutlinerAction.CreateTask,
      resolve: ({ node }) => {
        const task = live(Task, {
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
