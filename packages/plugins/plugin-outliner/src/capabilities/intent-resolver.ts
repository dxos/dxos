//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { JournalType, OutlinerAction, createJournalEntry, createOutline } from '../types';

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
            object: Obj.make(Task.Task, { title: text }),
          },
        };
      },
    }),
  ]);
