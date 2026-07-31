//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { DatabaseHandlers, DatabaseSkill, WebSearchSkill } from '@dxos/assistant-toolkit';
import { Skill } from '@dxos/compute';
import { Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { Message, Organization, Person } from '@dxos/types';

import { ProfileOf } from '#types';

import { EMAIL_FIXTURES, makeEmailMessage } from '../../testing';
import CrmSkill from './skill';

EntityId.dangerouslyDisableRandomness();

/**
 * Tuning playground for the CRM skill. Runs each reference email fixture
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
    Skill.Skill,
    Feed.Feed,
    Markdown.Document,
    Message.Message,
    Organization.Organization,
    Person.Person,
    ProfileOf.ProfileOf,
  ],
  skills: [CrmSkill.make(), DatabaseSkill.make(), WebSearchSkill.make()],
  tracing: 'pretty',
});

describe('CRM Skill', () => {
  for (const fixture of EMAIL_FIXTURES) {
    it.effect.skip(
      `researches a contact from an email — ${fixture.label}`,
      Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({
            skills: [CrmSkill.make(), DatabaseSkill.make(), WebSearchSkill.make()],
          });
          const msg = makeEmailMessage(fixture);
          yield* agent.submitPrompt(
            `Research the contact from this email and produce a Profile document. Message DXN: ${Obj.getURI(msg)}`,
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
  // `dx chat --skill org.dxos.skill.crm --prompt "research <email>"`,
  // i.e. the agent must find-or-create a Person from the email before
  // proceeding with the research flow described in the CRM skill
  // instructions. Skipped by default — regenerate the memoized fixture with
  // `ALLOW_LLM_GENERATION=1`.
  it.effect.skip(
    'researches a contact from a bare email address (find-or-create Person)',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [CrmSkill.make(), DatabaseSkill.make(), WebSearchSkill.make()],
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
