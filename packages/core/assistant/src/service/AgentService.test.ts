//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { Blueprint } from '@dxos/blueprints';

import { Feed } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Process } from '@dxos/functions-runtime';
import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import { AssistantTestLayer } from '../testing';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as AgentService from './AgentService';

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

const SYSTEM_PROMPT = trim`
  You are reacting to a continuous stream of organizations.
  Research each organization.
  Research takes a while to complete.
  Do not block on the research since there might be more organizations to research, and we want research to happen in parallel.
  Do not wait longer then 3 seconds to keep the conversation open for new events or user queries.
  Do internal reasoning, but only show the answers to the user.
`;

const TestLayer = AssistantTestLayer({
  types: [Organization.Organization, Feed.Feed, Blueprint.Blueprint],
  tracing: 'pretty',
  aiServicePreset: 'edge-remote',
  operationHandlers: [handlers],
  blueprints: [ResearchBlueprint],
  systemPrompt: SYSTEM_PROMPT,
});

describe('Agent Executable', () => {
  it.scoped(
    'runs AI agent with background tools via process manager',
    Effect.fnUntraced(
      function* (_) {
        const registry = yield* Registry.AtomRegistry;
        const monitor = yield* Process.ProcessMonitorService;
        registry.subscribe(monitor.processTreeAtom, (tree) => {
          console.log(`\n----- Process tree -----\n${Process.prettyProcessTree(tree)}\n-----------------\n`);
        });

        const agent = yield* AgentService.createSession({
          blueprints: [ResearchBlueprint],
        });

        for (const org of TEST_DATA.organizations) {
          yield* agent.submitPrompt(JSON.stringify(org));
        }
        yield* agent.submitPrompt('When all research is complete, print 1-sentence summary for each organization.');
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer),
      Effect.scoped,
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
