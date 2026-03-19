//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiContextService } from '@dxos/assistant';
import { Database, Obj, Ref, Relation, Tag } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { trim } from '@dxos/util';

export const Query = Operation.make({
  meta: {
    key: 'org.dxos.function.database.query',
    name: 'Query',
    description: trim`
      Query for objects in ECHO.
      Use this tool when searching for information in the space (both automerge and queues).
      Currently, two types of queries are supported:
        - Full-text search - terms may appear anywhere in the object.
        - Type-based search - objects of a specific type.
      You can use them together, for example, to search for objects of a specific type that match a full-text query.
      Important: Whem querying by typename, make sure to list the schema first, to get the exact typename.

      Omit both typename and text to search for all objects.

      <output_format>
        You can choose to either return the full object data, or just the DXN, type and label.
        When expecting a lot of results, run with includeContent=false to not pollute the context, and then load specific objects using the load tool.

        You can choose to get the content right away, if you don't expect a lot of results.
        To load content right away, run with includeContent=true.
        When loading content, set an appropriate limit on the number of results to avoid overwhelming the context.
      </output_format>

      <example description="All tasks related to Cyberdyne and Bob">
        {
          "typename": "org.dxos.type.task",
          "text": "cyberdyne bob",
        }
      </example>

      <example description="Financial report Q1 2026">
        {
          "typename": "org.dxos.type.document",
          "text": "financial report Q1 2026",
          "includeContent": true
          "limit": 3
        }
      </example>
    `,
  },
  input: Schema.Struct({
    typename: Schema.optional(
      Schema.String.annotations({
        description: 'The typename of the objects to list.',
        example: 'org.dxos.type.task',
      }),
    ),
    text: Schema.optional(
      Schema.String.annotations({
        description: 'Full text search query.',
        example: 'email cyberdyne bob',
      }),
    ),
    includeContent: Schema.optional(
      Schema.Boolean.annotations({
        description: 'Include the full object data in the response.',
        default: false,
      }),
    ),
    limit: Schema.optional(
      Schema.Number.annotations({
        description: 'The maximum number of results to return.',
        default: 10,
      }),
    ),
    includeQueues: Schema.optional(
      Schema.Boolean.annotations({
        description: 'Search in queues as well as spaces. Only use this if searching for emails.',
        default: false,
      }),
    ),
  }),
  output: Schema.Array(Schema.Unknown),
  services: [Database.Service],
});

export const Load = Operation.make({
  meta: {
    key: 'org.dxos.function.database.load',
    name: 'Load object',
    description: trim`
      Loads the object or relation content.
      Can load multiple objects at at time.
      Use the to read the data when you have a DXN.
      Call this tool with an array of one or more DXNs or object IDs.
      When use see a reference ({ '/': 'dxn:...' }), you can call this function to load the object.
      Note that returned data is only a snapshot in time, and might have changed since the object was last loaded.
    `,
  },
  input: Schema.Struct({
    refs: Schema.Array(Ref.Ref(Obj.Unknown)),
  }),
  output: Schema.Unknown,
  services: [Database.Service],
});

export const ObjectCreate = Operation.make({
  meta: {
    key: 'org.dxos.function.database.object-create',
    name: 'Create object',
    description: trim`
      Creates a new object and adds it to the current space.
      Get the schema from the schema-list tool and ensure that the data matches the corresponding schema.
      References are provided in the following format: { "/": "dxn:..." }.
      Reference examples: { "/": "dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4" }, { "/": "dxn:queue:data:01KG7R1ZXWFMWQ4DA1Q6TN1DG4:01KG7R1ZXWFMWQ4DA1Q6TN1DG4" }
    `,
  },
  input: Schema.Struct({
    typename: Schema.String,
    data: Schema.Any,
  }),
  output: Schema.Unknown,
  services: [Database.Service],
});

export const ObjectUpdate = Operation.make({
  meta: {
    key: 'org.dxos.function.database.object-update',
    name: 'Update object',
    description: trim`
      Updates the object properties.
      References are provided in the following format: { "/": "dxn:..." }.
      Reference examples: { "/": "dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4" }, { "/": "dxn:queue:data:01KG7R1ZXWFMWQ4DA1Q6TN1DG4:01KG7R1ZXWFMWQ4DA1Q6TN1DG4" }
    `,
  },
  input: Schema.Struct({
    obj: Ref.Ref(Obj.Unknown),
    properties: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }),
  output: Schema.Unknown,
  services: [Database.Service],
});

export const ObjectDelete = Operation.make({
  meta: {
    key: 'org.dxos.function.database.object-delete',
    name: 'Delete object',
    description: trim`
      Deletes the object.
    `,
  },
  input: Schema.Struct({
    obj: Ref.Ref(Obj.Unknown),
  }),
  output: Schema.Void,
  services: [Database.Service],
});

export const SchemaAdd = Operation.make({
  meta: {
    key: 'org.dxos.function.database.schema-add',
    name: 'Add schema',
    description: trim`
      Adds a schema to the space.
      The name will be used when displayed to the user.
    `,
  },
  input: Schema.Struct({
    name: Schema.String,
    typename: Schema.String.annotations({
      description: 'The typename of the schema in the format of "com.example.type.type".',
    }),
    jsonSchema: Schema.Any,
  }),
  output: Schema.Void,
  services: [Database.Service],
});

export const SchemaList = Operation.make({
  meta: {
    key: 'org.dxos.function.database.schema-list',
    name: 'List schemas',
    description: trim`
      Lists schemas definitions.
    `,
  },
  input: Schema.Struct({
    limit: Schema.optional(Schema.Number),
  }),
  output: Schema.Array(Schema.Unknown),
  services: [Database.Service],
});

export const ContextAdd = Operation.make({
  meta: {
    key: 'org.dxos.function.database.context-add',
    name: 'Add to context',
    description: trim`
      Adds the object to the chat context.
      Use this it for objects that are useful long-term for the conversation.
    `,
  },
  input: Schema.Struct({
    obj: Ref.Ref(Obj.Unknown).annotations({
      description: 'Object to add to the chat context.',
    }),
  }),
  output: Schema.Void,
  services: [AiContextService],
});

export const ContextRemove = Operation.make({
  meta: {
    key: 'org.dxos.function.database.context-remove',
    name: 'Remove from context',
    description: trim`
      Removes the object from the chat context.
      Use this it for objects that are no longer useful for the conversation.
    `,
  },
  input: Schema.Struct({
    obj: Ref.Ref(Obj.Unknown).annotations({
      description: 'Object to remove from the chat context.',
    }),
  }),
  output: Schema.Void,
  services: [AiContextService],
});

export const RelationCreate = Operation.make({
  meta: {
    key: 'org.dxos.function.database.relation-create',
    name: 'Create relation',
    description: trim`
      Creates a new relation and adds it to the current space.
      Get the schema from the schema-list tool and ensure that the data matches the corresponding schema.
    `,
  },
  input: Schema.Struct({
    typename: Schema.String,
    source: Ref.Ref(Obj.Unknown),
    target: Ref.Ref(Obj.Unknown),
    properties: Schema.Any.annotations({
      description: 'The data to be stored in the relation.',
    }),
  }),
  output: Schema.Unknown,
  services: [Database.Service],
});

export const RelationDelete = Operation.make({
  meta: {
    key: 'org.dxos.function.database.relation-delete',
    name: 'Delete relation',
    description: trim`
      Deletes the relation.
    `,
  },
  input: Schema.Struct({
    rel: Ref.Ref(Relation.Unknown),
  }),
  output: Schema.Void,
  services: [Database.Service],
});

export const TagAdd = Operation.make({
  meta: {
    key: 'org.dxos.function.database.tag-add',
    name: 'Add tag',
    description: trim`
      Adds a tag to an object.
      Tags are objects of type ${Tag.Tag.typename}.
      You must search database for available tags, or create a new one.
    `,
  },
  input: Schema.Struct({
    tag: Ref.Ref(Obj.Unknown),
    obj: Ref.Ref(Obj.Unknown),
  }),
  output: Schema.Unknown,
  services: [Database.Service],
});

export const TagRemove = Operation.make({
  meta: {
    key: 'org.dxos.function.database.tag-remove',
    name: 'Remove tag',
    description: trim`
      Removes a tag from an object.
      Tags are objects of type ${Tag.Tag.typename}.
    `,
  },
  input: Schema.Struct({
    tag: Ref.Ref(Obj.Unknown),
    obj: Ref.Ref(Obj.Unknown),
  }),
  output: Schema.Unknown,
  services: [Database.Service],
});
