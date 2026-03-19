//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Database, Obj, Ref } from '@dxos/echo';
import { FunctionInvocationService, TracingService } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { trim } from '@dxos/util';

export const Research = Operation.make({
  meta: {
    key: 'org.dxos.function.research',
    name: 'Research',
    description: trim`
      Search the web to research information about the given subject.
      Inserts structured data into the research graph. 
      Creates a research summary and returns the objects created.
    `,
  },
  input: Schema.Struct({
    query: Schema.String.annotations({
      description: trim`
        The search query.
        If doing research on an object then load it first and pass it as JSON.
      `,
    }),
    instructions: Schema.optional(Schema.String).annotations({
      description: trim`
        The instructions for the research agent. 
      `,
    }),
    // TOOD(burdon): Move to context.
    mockSearch: Schema.optional(Schema.Boolean).annotations({
      description: 'Whether to use the mock search tool.',
      default: false,
    }),
    entityExtraction: Schema.optional(Schema.Boolean).annotations({
      description: trim`
        Whether to extract structured entities from the research. 
        Experimental feature only enable if user explicitly requests it.
      `,
      default: false,
    }),
  }),
  output: Schema.Struct({
    document: Schema.optional(Schema.String).annotations({
      description: 'The generated research document.',
    }),
    objects: Schema.Array(Schema.Unknown).annotations({
      description: 'Structured objects created during the research process.',
    }),
  }),
  services: [AiService.AiService, Database.Service, TracingService, FunctionInvocationService],
});

export const DocumentCreate = Operation.make({
  meta: {
    key: 'org.dxos.function.research.document-create',
    name: 'Create research document',
    description: 'Creates a note summarizing the research.',
  },
  input: Schema.Struct({
    subject: Ref.Ref(Obj.Unknown).annotations({
      description: trim`
        ID of the object (organization, contact, etc.) for which the research was performed. 
      `,
    }),
    name: Schema.String.annotations({
      description: 'Name of the document.',
    }),
    content: Schema.String.annotations({
      description: trim`
        Content of the note. 
        Supports (and are prefered) references to research objects using @ syntax and <object> tags (refer to research blueprint instructions).
      `,
    }),
  }),
  output: Schema.Struct({
    document: Schema.String.annotations({
      description: 'DXN of the created document.',
    }),
  }),
  services: [Database.Service, TracingService],
});
