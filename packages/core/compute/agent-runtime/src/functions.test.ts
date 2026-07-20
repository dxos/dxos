//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { ConsolePrinter } from '@dxos/ai';
import { ScriptedAiService } from '@dxos/ai/testing';
import { AiRequest, GenerationObserver, ToolExecutionServices, createToolkit } from '@dxos/assistant';
import { Operation, OperationHandlerSet, Skill } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';
import { Organization } from '@dxos/types';

import { AssistantTestLayer } from './testing';

const ReadName = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.readName'),
    name: 'Read Name',
    description: 'Reads the name of an organization.',
  },
  input: Schema.Struct({
    org: Ref.Ref(Organization.Organization),
  }),
  output: Schema.String,
  services: [Database.Service],
});

const Handlers = OperationHandlerSet.make(
  Operation.withHandler(
    ReadName,
    Effect.fn(function* ({ org }) {
      const resolved = yield* Database.load(org);
      return resolved.name ?? '<no org>';
    }),
  ),
);

const skill = Skill.make({
  key: 'org.dxos.skill.test',
  name: 'Test skill',
  tools: Skill.toolDefinitions({ operations: [ReadName] }),
});

// The agent's tool-calling behaviour is scripted inline via a mock model (no recorded conversation
// to regenerate). The `read-name` tool's `org` parameter is a top-level ref, so it is resolved
// lazily from a mutable holder the test fills before running the request.
const testLayer = (script: ScriptedAiService.Script) =>
  Layer.empty.pipe(
    Layer.provideMerge(ToolExecutionServices),
    Layer.provideMerge(
      AssistantTestLayer({
        operationHandlers: Handlers,
        types: [Organization.Organization],
        aiService: ScriptedAiService.layer(script),
      }),
    ),
  );

describe('Research', () => {
  it.effect(
    'call a function with a ref input',
    (() => {
      const ref: { org?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const org = yield* Database.add(
            Obj.make(Organization.Organization, {
              name: 'BlueYard',
              website: 'https://blueyard.com',
            }),
          );
          yield* Database.flush();
          ref.org = Obj.getURI(org);
          yield* new AiRequest.Request({ observer: GenerationObserver.fromPrinter(new ConsolePrinter()) }).run({
            prompt: `What is the name of the organization? ${org.id}`,
            toolkit: yield* createToolkit({
              skills: [skill],
            }),
          });
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.turn({
              text: "I'll look up the name of that organization for you.",
              tools: [{ name: 'read-name', input: () => ({ org: ref.org }) }],
            }),
            ScriptedAiService.text('The name of the organization is **BlueYard**.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );
});
