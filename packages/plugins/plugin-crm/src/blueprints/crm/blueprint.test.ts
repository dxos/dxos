//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/assistant';
import { DatabaseBlueprint, DatabaseHandlers, ResearchBlueprint, WebSearchBlueprint } from '@dxos/assistant-toolkit';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/compute';
import { Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { Message, Organization, Person } from '@dxos/types';

import { ProfileOf } from '#types';

import { EMAIL_FIXTURES, makeEmailMessage } from '../../testing';
import CrmBlueprint from './blueprint';

ObjectId.dangerouslyDisableRandomness();

/**
 * Tuning playground for the CRM blueprint. Runs each reference email fixture
 * through the full agent loop. Skipped by default; regenerate memoized LLM
 * fixtures with `ALLOW_LLM_GENERATION=1`.
 *
 * Once the behaviour is stable, these tests graduate to
 * `packages/core/assistant-e2e/src/testing/crm/` with tight assertions.
 */
const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: DatabaseHandlers,
  types: [
    Blueprint.Blueprint,
    Feed.Feed,
    Markdown.Document,
    Message.Message,
    Organization.Organization,
    Person.Person,
    ProfileOf.ProfileOf,
  ],
  blueprints: [CrmBlueprint.make(), DatabaseBlueprint.make(), ResearchBlueprint.make(), WebSearchBlueprint.make()],
  tracing: 'pretty',
});

describe('CRM Blueprint', () => {
  for (const fixture of EMAIL_FIXTURES) {
    it.effect.skip(
      `researches a contact from an email — ${fixture.label}`,
      Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({
            blueprints: [
              CrmBlueprint.make(),
              DatabaseBlueprint.make(),
              ResearchBlueprint.make(),
              WebSearchBlueprint.make(),
            ],
          });
          const msg = makeEmailMessage(fixture);
          yield* agent.submitPrompt(
            `Research the contact from this email and produce a Profile document. Message DXN: ${Obj.getDXN(msg).toString()}`,
          );
          yield* agent.waitForCompletion();
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 120_000 },
    );
  }

  // Bare-email-prompt research mode: exercises the same path as
  // `dx chat --blueprint org.dxos.blueprint.crm --prompt "research <email>"`,
  // i.e. the agent must find-or-create a Person from the email before
  // proceeding with the research flow described in the CRM blueprint
  // instructions. Skipped by default — regenerate the memoized fixture with
  // `ALLOW_LLM_GENERATION=1`.
  it.effect.skip(
    'researches a contact from a bare email address (find-or-create Person)',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          blueprints: [
            CrmBlueprint.make(),
            DatabaseBlueprint.make(),
            ResearchBlueprint.make(),
            WebSearchBlueprint.make(),
          ],
        });
        yield* agent.submitPrompt('research priya.adebayo@ventura-advisors.example');
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
