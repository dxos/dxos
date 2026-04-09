//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Database, Obj } from '@dxos/echo';
import { FunctionInvocationService, QueueService, TracingService } from '@dxos/functions';
import { Trace } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { Message } from '@dxos/types';

export const EntityExtraction = Operation.make({
  meta: {
    key: 'org.dxos.functions.entity-extraction',
    name: 'Entity Extraction',
    description: 'Extracts entities from emails and transcripts.',
  },
  input: Schema.Struct({
    source: Message.Message.annotations({
      description: 'Email or transcript to extract entities from.',
    }),
    // TODO(dmaretskyi): Consider making this an array of blueprints instead.
    instructions: Schema.optional(Schema.String).annotations({
      description: 'Instructions extraction process.',
    }),
  }),
  output: Schema.Struct({
    entities: Schema.optional(
      Schema.Array(Obj.Unknown).annotations({
        description: 'Extracted entities.',
      }),
    ),
  }),
  services: [
    AiService.AiService,
    Database.Service,
    TracingService,
    FunctionInvocationService,
    QueueService,
    Trace.TraceService,
  ],
});
