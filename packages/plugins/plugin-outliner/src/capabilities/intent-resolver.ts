//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { Journal, Outline, OutlineAction } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: OutlineAction.CreateJournal,
      resolve: ({ name }) => ({
        data: {
          object: Obj.make(Journal.Journal, {
            name,
            entries: [Ref.make(Journal.makeEntry())],
          }),
        },
      }),
    }),
    createResolver({
      intent: OutlineAction.CreateOutline,
      resolve: ({ name }) => ({
        data: {
          object: Outline.make(name),
        },
      }),
    }),
    createResolver({
      intent: OutlineAction.CreateTask,
      resolve: ({ text }) => {
        return {
          data: {
            object: Obj.make(Task.Task, { title: text }),
          },
        };
      },
    }),
  ]);
