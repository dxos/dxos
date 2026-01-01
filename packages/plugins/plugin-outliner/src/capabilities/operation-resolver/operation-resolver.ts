//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Task } from '@dxos/types';

import { Journal, Outline, OutlineOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: OutlineOperation.CreateJournal,
        handler: ({ name }) =>
          Effect.succeed({
            object: Journal.make({ name }),
          }),
      }),
      OperationResolver.make({
        operation: OutlineOperation.CreateOutline,
        handler: ({ name }) =>
          Effect.succeed({
            object: Outline.make({ name }),
          }),
      }),
      OperationResolver.make({
        operation: OutlineOperation.CreateTask,
        handler: ({ text }) =>
          Effect.succeed({
            object: Obj.make(Task.Task, { title: text }),
          }),
      }),
    ]),
  ),
);

