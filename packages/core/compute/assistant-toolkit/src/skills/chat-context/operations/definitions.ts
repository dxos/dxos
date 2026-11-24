//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/compute/Agent';
import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import { Database, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const ContextAdd = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.addContext'),
    name: 'Add to context',
    icon: 'ph--plus-circle--regular',
    description: trim`
      Adds the object to the chat context.
      Use this it for objects that are useful long-term for the conversation.
    `,
  },
  input: Schema.Struct({
    obj: Ref.Ref(Obj.Unknown).annotate({
      description: 'Object to add to the chat context.',
    }),
  }),
  output: Schema.Void,
  services: [Agent.Service, Process.ManagerService, Database.Service],
});

export const ContextRemove = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.removeContext'),
    name: 'Remove from context',
    icon: 'ph--minus-circle--regular',
    description: trim`
      Removes the object from the chat context.
      Use this it for objects that are no longer useful for the conversation.
    `,
  },
  input: Schema.Struct({
    obj: Ref.Ref(Obj.Unknown).annotate({
      description: 'Object to remove from the chat context.',
    }),
  }),
  output: Schema.Void,
  services: [Agent.Service, Process.ManagerService, Database.Service],
});
