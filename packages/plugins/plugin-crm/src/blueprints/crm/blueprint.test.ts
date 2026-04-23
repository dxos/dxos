//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/assistant';
import { DatabaseBlueprint, DatabaseHandlers, ResearchBlueprint, WebSearchBlueprint } from '@dxos/assistant-toolkit';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { ContentBlock, Message, Organization, Person } from '@dxos/types';

import { ProfileOf } from '#types';

import CrmBlueprint from './blueprint';

ObjectId.dangerouslyDisableRandomness();

/**
 * Tuning playground for the CRM blueprint. Runs each of the three reference
 * email fixtures through the full agent loop. Skipped by default; regenerate
 * memoized LLM fixtures with `ALLOW_LLM_GENERATION=1`.
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

const makeEmailMessage = ({
  senderName,
  senderEmail,
  body,
  subject,
}: {
  senderName: string;
  senderEmail: string;
  body: string;
  subject?: string;
}) =>
  Message.make({
    sender: { name: senderName, email: senderEmail },
    blocks: [{ _tag: 'text', text: body } satisfies ContentBlock.Text],
    properties: subject ? { subject } : undefined,
  });

describe('CRM Blueprint', () => {
  it.effect.skip(
    'researches a contact from an email — Madeline Ahern (corporate)',
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
        const msg = makeEmailMessage({
          senderName: 'Madeline Ahern',
          senderEmail: 'mahern@kirkconsult.com',
          subject: 'EOR update',
          body: [
            'Hi Rich,',
            'As an fyi - the switch to EOR for Mykola is still in process.  Deel is waiting on some visa questions from Mykola.',
            '',
            'Thanks,',
            'Madeline',
            '',
            'Madeline Ahern',
            'mahern@kirkconsult.com',
            '(510) 393-7703',
          ].join('\n'),
        });
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

  it.effect.skip(
    'researches a contact from an email — David Joerg (free-mail)',
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
        const msg = makeEmailMessage({
          senderName: 'David Joerg',
          senderEmail: 'dsjoerg@gmail.com',
          body: [
            "Rich!  So nice to hear from you.  I'd love to get together.",
            "I'm no longer affiliated with Two Sigma or Two Sigma Ventures,",
            'and no longer doing angel investing,',
            "and out of the loop on what's really happening in AI land,",
            "but it'd be great to get together.",
            '',
            'I recently moved to the Upper East Side (boo)',
            'but to a great place, great for a hang.',
            '',
            'Where are you these days?',
          ].join('\n'),
        });
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

  it.effect.skip(
    'researches a contact from an email — Michael Ng (rich signature)',
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
        const msg = makeEmailMessage({
          senderName: 'Michael Ng',
          senderEmail: 'Michael.Ng@kobrekim.com',
          body: [
            'Francesco,',
            '',
            "I was just talking to Rich about his dispute and wonder if the three of us can put our heads together tomorrow.  Would 9:30am work?  I'll send a calendar invite but just let me know if you need to move it.",
            '',
            'Mike',
            '',
            'Michael Ng',
            '+1 415 582 4803',
            '',
            'www.kobrekim.com',
            '',
            'Americas (New York, Buenos Aires, Chicago, Delaware, Miami, San Francisco, São Paulo, Washington DC)',
            'Asia-Pacific (Hong Kong, Seoul, Shanghai), EMEA (London, Tel Aviv), Offshore (BVI, Cayman Islands)',
          ].join('\n'),
        });
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
});
