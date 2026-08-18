//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const SchemaAdd = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.database.schemaAdd'),
    name: 'Add schema',
    icon: 'ph--plus--regular',
    description: trim`
      Adds a schema to the space.
      The name will be used when displayed to the user.
    `,
  },
  input: Schema.Struct({
    name: Schema.String,
    typename: Schema.String.annotate({
      description: 'The typename of the schema in the format of "com.example.type.type".',
    }),
    // Typed as a record so the tool parameter advertises `type: object` to the LLM, forcing it to
    // emit the JSON Schema as an object rather than a JSON-encoded string (which an unconstrained
    // `Schema.Any` parameter would allow, breaking `makeObjectFromJsonSchema`).
    jsonSchema: Schema.Record(Schema.String, Schema.Any).annotate({
      description: 'The JSON Schema (draft-07) object describing the fields of the new type.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});

export const ContextAdd = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.database.contextAdd'),
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
  services: [Harness.HarnessService],
});

export const ContextRemove = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.database.contextRemove'),
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
  services: [Harness.HarnessService],
});

export const RelationCreate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.database.relationCreate'),
    name: 'Create relation',
    icon: 'ph--arrows-merge--regular',
    description: trim`
      Creates a new relation and adds it to the current space.
      Get the full JSON Schema from the schema-list tool (pass \`typenames: [typename]\`) and ensure
      that the data matches the corresponding schema.
    `,
  },
  input: Schema.Struct({
    typename: Schema.String,
    source: Ref.Ref(Obj.Unknown),
    target: Ref.Ref(Obj.Unknown),
    properties: Schema.Any.annotate({
      description: 'The data to be stored in the relation.',
    }),
  }),
  output: Schema.Unknown,
  services: [Database.Service],
});
