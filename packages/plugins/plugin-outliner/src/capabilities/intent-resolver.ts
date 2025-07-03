//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { OutlinerAction, JournalType, createJournalEntry, createOutline } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: OutlinerAction.CreateJournal,
      resolve: ({ name }) => ({
        data: {
          object: Obj.make(JournalType, {
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
          object: createOutline(name),
        },
      }),
    }),
    createResolver({
      intent: OutlinerAction.CreateTask,
      resolve: ({ text }) => {
        return {
          data: {
            object: Obj.make(DataType.Task, { text }),
          },
        };
      },
    }),
  ]);
