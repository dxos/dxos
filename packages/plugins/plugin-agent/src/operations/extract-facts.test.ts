//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { AgentOperation, FactFeed } from '#types';

EntityId.dangerouslyDisableRandomness();

const { text } = ScriptedLanguageModel;

const EXTRACTION_PROMPT = 'You extract atomic propositions';
const CHANNEL = 'https://discord.com/channels/100/200';

/** Facts the model "finds"; each is returned only when the transcript contains its quote. */
const FACTS = [
  { subject: 'Dima', predicate: 'owns', object: 'indexer', quote: 'I own the indexer.' },
  { subject: 'Josiah', predicate: 'reviews', object: 'fix', quote: 'I will review the fix.' },
];

const extractions = { count: 0 };

const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  if (!request.text.includes(EXTRACTION_PROMPT)) {
    return { parts: [text('Unexpected request.')] };
  }
  extractions.count++;
  const facts = FACTS.filter(({ quote }) => request.text.includes(quote)).map((fact) => ({
    ...fact,
    factuality: 'CT+',
    polarity: '+',
  }));
  return { parts: [text(JSON.stringify({ facts }))] };
};

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [Feed.Feed, Message.Message, FactFeed.FactItem, FactFeed.ExtractionPass],
  aiService: ScriptedLanguageModel.scriptedAiService(script),
});

/** A message as Discord sync stores it: the snowflake is the `discord.com` foreign key. */
const discordMessage = (snowflake: string, name: string, body: string, created: string) =>
  Obj.make(Message.Message, {
    [Obj.Meta]: { keys: [{ source: 'discord.com', id: snowflake }] },
    created,
    sender: { role: 'user', name },
    blocks: [{ _tag: 'text', text: body }],
  });

const MESSAGES = [
  discordMessage('1001', 'Dima', 'I own the indexer.', '2026-10-01T10:00:00.000Z'),
  discordMessage('1002', 'Josiah', 'I will review the fix.', '2026-10-02T10:00:00.000Z'),
];

describe('ExtractFacts', () => {
  it.effect(
    'appends facts citing each message, closes the pass, and skips what a pass already covered',
    Effect.fnUntraced(
      function* ({ expect }) {
        extractions.count = 0;
        const facts = yield* Database.add(Feed.make({ name: 'facts' }));

        const first = yield* Operation.invoke(AgentOperation.ExtractFacts, {
          items: MESSAGES,
          facts: Ref.make(facts),
          source: CHANNEL,
        });
        expect(first).toEqual({ facts: 2, read: 2, skipped: 0 });

        const items = yield* Feed.query(facts, Filter.type(FactFeed.FactItem)).run;
        const owns = items.find(({ fact }) => fact.assertion.predicate === 'owns');
        expect(owns?.fact.attribution).toMatchObject({
          agent: 'Dima',
          source: `${CHANNEL}/1001`,
          generatedAtTime: '2026-10-01T10:00:00.000Z',
        });
        const [pass] = yield* FactFeed.loadPasses(facts);
        expect(pass.coverage).toEqual([{ source: CHANNEL, first: '1001', last: '1002' }]);
        expect(owns?.fact.pass).toBe(pass.pass);

        // The same messages again — as after importing the feed elsewhere — reach no model.
        const again = yield* Operation.invoke(AgentOperation.ExtractFacts, {
          items: MESSAGES,
          facts: Ref.make(facts),
          source: CHANNEL,
        });
        expect(again).toEqual({ facts: 0, read: 0, skipped: 2 });
        expect(extractions.count).toBe(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reads only the messages inside since/until',
    Effect.fnUntraced(
      function* ({ expect }) {
        const facts = yield* Database.add(Feed.make({ name: 'facts' }));
        const result = yield* Operation.invoke(AgentOperation.ExtractFacts, {
          items: MESSAGES,
          facts: Ref.make(facts),
          source: CHANNEL,
          since: '2026-10-02T00:00:00.000Z',
        });
        expect(result).toEqual({ facts: 1, read: 1, skipped: 1 });
        const [pass] = yield* FactFeed.loadPasses(facts);
        expect(pass.coverage).toEqual([{ source: CHANNEL, first: '1002', last: '1002' }]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
