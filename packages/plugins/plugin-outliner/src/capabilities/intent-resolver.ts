//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { live, makeRef } from '@dxos/live-object';
import { DataType } from '@dxos/schema';

import { OutlinerAction, JournalType, createJournalEntry, createOutline } from '../types';

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
          object: createOutline(name),
        },
      }),
    }),
    createResolver({
      intent: OutlinerAction.CreateTask,
      resolve: ({ text }) => {
        return {
          data: {
            object: live(DataType.Task, { text }),
          },
        };
      },
    }),
  ]);
