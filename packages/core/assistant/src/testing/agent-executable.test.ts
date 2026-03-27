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

import { Database, Feed } from '@dxos/echo';
import { AiService, GenericToolkit, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService, QueueService, TracingService } from '@dxos/functions';
import { Process, ProcessManagerImpl, ProcessManagerLayer, ServiceResolver } from '@dxos/functions-runtime';
import { Organization, type Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { makeAgentExecutable } from './agent-executable';
import { AssistantTestLayer } from './layer';

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

//
// Toolkit with background job support.
//

class TestToolkit extends Toolkit.make(
  Tool.make('research-organization', {
    description: 'Get information about an organization',
    parameters: {
      website: Schema.String.annotations({
        description: 'The website of the organization to get information about',
        examples: ['https://cyberdyne.com'],
      }),
    },
  }),
) {}

const TestToolkitLayer = TestToolkit.toLayer({
  'research-organization': ({ website }) =>
    Effect.gen(function* () {
      yield* Effect.sleep(
        15_000 * (TEST_DATA.organizations.findIndex((organization) => organization.website === website) + 1),
      );
      return TEST_DATA.research[website];
    }),
});

//
// Test layer: AI services + toolkit.
//

const TestLayer = TestToolkitLayer.pipe(
  Layer.provideMerge(ProcessManagerLayer),
  Layer.provideMerge(
    ServiceResolver.layerRequirements(
      Database.Service,
      GenericToolkit.GenericToolkitProvider,
      QueueService,
      AiService.AiService,
    ),
  ),
  Layer.provideMerge(
    AssistantTestLayer({
      types: [Organization.Organization],
      tracing: 'pretty',
      aiServicePreset: 'edge-remote',
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
        const manager = yield* Process.ManagerService;

        const handle = yield* manager.spawn(
          makeAgentExecutable({
            feed: Feed.make(),
          }),
        );

        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});

// while (inputQueue.length > 0) {
//   yield* handle.submitInput(inputQueue.join('\n'));
//   inputQueue.length = 0;

//   for (const jobId of activeJobs.keys()) {
//     const result = yield* activeJobs.get(jobId)!.poll;
//     if (Option.isSome(result)) {
//       inputQueue.push(`Job completed: ${jobId}`);
//       activeJobs.delete(jobId);
//     }
//   }
//   if (inputQueue.length === 0 && activeJobs.size > 0) {
//     const result = yield* Effect.raceAll(
//       activeJobs.entries().map(([jobId, fiber]) =>
//         fiber.await.pipe(
//           Effect.map(() => {
//             activeJobs.delete(jobId);
//             return `Job completed: ${jobId}`;
//           }),
//         ),
//       ),
//     );
//     inputQueue.push(result);
//   }
// }
