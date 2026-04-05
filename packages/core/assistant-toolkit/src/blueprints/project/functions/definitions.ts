//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiContextService } from '@dxos/assistant';
import { Database, Obj, Ref } from '@dxos/echo';
import { FunctionInvocationService, QueueService, TracingService, TriggerEvent } from '@dxos/functions';
import { Operation } from '@dxos/operation';

import { Project } from '../../../types';
import { Trace } from '@dxos/functions';

export const Agent = Operation.make({
  meta: {
    key: 'org.dxos.function.project.agent',
    name: 'Project Agent',
    description: 'Agentic worker that drives the project autonomously.',
  },
  input: Schema.Struct({
    project: Schema.suspend(() => Ref.Ref(Project.Project)),
    prompt: Schema.optional(Schema.String),
    event: Schema.optional(TriggerEvent.TriggerEvent),
  }),
  output: Schema.Void,
  services: [
    AiService.AiService,
    Database.Service,
    FunctionInvocationService,
    QueueService,
    // TODO(dmaretskyi): Consider making TracingService a default to all operations.
    Trace.TraceService,
    TracingService,
    // TODO(dmaretskyi): Handle those within session/conversation context.
    ToolExecutionService,
    ToolResolverService,
  ],
});

export const Qualifier = Operation.make({
  meta: {
    key: 'org.dxos.function.project.qualifier',
    name: 'Project Qualifier',
    description:
      'Qualifier that determines if the event is relevant to the project. Puts the data into the input queue of the project.',
  },
  input: Schema.Struct({
    project: Schema.suspend(() => Ref.Ref(Project.Project)),
    event: TriggerEvent.TriggerEvent,
  }),
  output: Schema.Void,
  services: [AiService.AiService, Database.Service],
});

export const GetContext = Operation.make({
  meta: {
    key: 'org.dxos.function.project.get-context',
    name: 'Get Project Context',
    description: 'Get the context of an project.',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    spec: Schema.String,
    plan: Schema.String,
    artifacts: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        type: Schema.optional(Schema.String),
        dxn: Schema.optional(Schema.String),
      }),
    ),
  }),
  services: [AiContextService, Database.Service],
});

export const AddArtifact = Operation.make({
  meta: {
    key: 'org.dxos.function.project.add-artifact',
    name: 'Add artifact',
    description: 'Adds a new artifact.',
  },
  input: Schema.Struct({
    name: Schema.String.annotations({
      description: 'The name of the artifact to add.',
    }),
    artifact: Ref.Ref(Obj.Unknown).annotations({
      description: 'The artifact to add. Do NOT guess or try to generate the ID.',
    }),
  }),
  output: Schema.Void,
  services: [AiContextService, Database.Service],
});
