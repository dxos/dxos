//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as LanguageModel from '@effect/ai/LanguageModel';
import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import { Blueprint } from '@dxos/blueprints';

import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { AiService, GenericToolkit, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService, QueueService, TracingService } from '@dxos/functions';
import { Process, ProcessManager, ServiceResolver } from '@dxos/functions-runtime';
import { Organization, type Message } from '@dxos/types';
import { trim } from '@dxos/util';
import { Operation, OperationHandlerSet, OperationRegistry } from '@dxos/operation';

import { makeAgentExecutable } from './agent-executable';
import { AssistantTestLayer } from './layer';
import { ObjectId } from '@dxos/keys';
import { AiContextBinder, ContextBinding } from '../conversation';
import { acquireReleaseResource } from '@dxos/effect';
import { failedInvariant } from '@dxos/invariant';
import { dbg, log } from '@dxos/log';

ObjectId.dangerouslyDisableRandomness();

//
// Test data.
//

const TEST_DATA = {
  organizations: [
    Organization.make({
      name: 'Cyberdyne Systems',
      website: 'https://cyberdyne.com',
    }),
    Organization.make({
      name: 'Acme Robotics',
      website: 'https://acmerobotics.example',
    }),
    Organization.make({
      name: 'Globex Research',
      website: 'https://globex.example',
    }),
  ],
  research: {
    'https://cyberdyne.com': `
      Cyberdyne Systems is a company that builds AI agents.
      They are based in San Francisco, California.
      They were founded in 1984.
      They are a public company.
      They are listed on the NASDAQ under the symbol CYBR.
      They are a member of the S&P 500 index.
    `,
    'https://acmerobotics.example': `
      Acme Robotics designs industrial automation and collaborative robots.
      They are headquartered in Austin, Texas.
      They were founded in 2010.
      They serve manufacturing and logistics customers worldwide.
    `,
    'https://globex.example': `
      Globex Research runs applied R&D labs focused on materials science and energy storage.
      They are based in Cambridge, Massachusetts.
      They partner with universities and government grants programs.
      Their flagship product line is solid-state battery prototypes for EVs.
    `,
  } as Record<string, string>,
};

const Research = Operation.make({
  meta: {
    key: 'org.dxos.function.research',
    name: 'Research',
    description: 'Research an organization',
  },
  input: Schema.Struct({
    website: Schema.String.annotations({ description: 'The website of the organization to research' }),
  }),
  output: Schema.String,
});

const handlers = OperationHandlerSet.make(
  Research.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ website }) {
        log.info('begin research', { website });
        yield* Effect.sleep(
          15_000 * (TEST_DATA.organizations.findIndex((organization) => organization.website === website) + 1),
        );
        log.info('end research', { website });
        return TEST_DATA.research[website];
      }),
    ),
  ),
);
const ResearchBlueprint = Blueprint.make({
  key: 'org.dxos.blueprint.research',
  name: 'Research',
  tools: Blueprint.toolDefinitions({ operations: [Research] }),
});

//
// Test layer: AI services + toolkit.
//

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(ProcessManager.layer),
  Layer.provideMerge(
    ServiceResolver.layerRequirements(
      Database.Service,
      GenericToolkit.GenericToolkitProvider,
      QueueService,
      AiService.AiService,
      OperationRegistry.Service,
    ),
  ),
  Layer.provideMerge(OperationRegistry.layer),
  Layer.provideMerge(
    AssistantTestLayer({
      types: [Organization.Organization, Feed.Feed, Blueprint.Blueprint],
      tracing: 'pretty',
      aiServicePreset: 'edge-remote',
      operationHandlers: [handlers],
      blueprints: [ResearchBlueprint],
    }),
  ),
  Layer.provideMerge(KeyValueStore.layerMemory),
);

const SYSTEM_PROMPT = trim`
  You are reacting to a continuous stream of organizations.
  Research each organization.
  Research takes a while to complete.
  Do not block on the research since there might be more organizations to research, and we want research to happen in parallel.
  Do not wait longer then 3 seconds to keep the conversation open for new events or user queries.
  Do internal reasoning, but only show the answers to the user.
`;

describe('Agent Executable', () => {
  it.live(
    'runs AI agent with background tools via process manager',
    Effect.fnUntraced(
      function* (_) {
        const feed = yield* Database.add(Feed.make());
        const queue = yield* QueueService.getQueue<Message.Message | ContextBinding>(
          Feed.getQueueDxn(feed) ?? failedInvariant(),
        );
        const binder = yield* acquireReleaseResource(() => new AiContextBinder({ queue }));
        const researchBlueprint = yield* Database.add(ResearchBlueprint);
        yield* Effect.promise(() =>
          binder.bind({
            blueprints: [Ref.make(researchBlueprint)],
            objects: [],
          }),
        );

        const manager = yield* ProcessManager.ProcessManagerService;
        const handle = yield* manager.spawn(
          makeAgentExecutable({
            feed,
            systemPrompt: SYSTEM_PROMPT,
          }),
        );
        for (const org of TEST_DATA.organizations) {
          yield* handle.submitInput(JSON.stringify(org));
        }
        yield* handle.runToCompletion();
      },
      Effect.provide(TestLayer),
      Effect.scoped,
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
