//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ConsolePrinter } from '@dxos/ai';
import { MemoizedAiService } from '@dxos/ai/testing';
import { AiConversation, GenerationObserver } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Database, Obj, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionDefinition, QueueService, Trigger } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';
import * as Initiative from './Initiative';
import { agent } from './functions';
import { invariant } from '@dxos/invariant';
import * as Layer from 'effect/Layer';
import { InvocationTracer, TriggerDispatcher, TriggerStateStore } from '@dxos/functions-runtime';
import { Message } from '@dxos/types';
import { log } from '@dxos/log';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = Layer.mergeAll(
  TriggerDispatcher.layer({ timeControl: 'manual', startingTime: new Date('2025-09-05T15:01:00.000Z') }),
).pipe(
  Layer.provideMerge(Layer.mergeAll(InvocationTracer.layerTest, TriggerStateStore.layerMemory)),
  Layer.provideMerge(
    AssistantTestLayer({
      aiServicePreset: 'edge-remote',
      functions: [...Initiative.functions],
      types: [Initiative.Initiative, Blueprint.Blueprint, Trigger.Trigger],
    }),
  ),
);

const SYSTEM = trim`
  If you do not have tools to complete the task, inform the user. DO NOT PRETEND TO DO SOMETHING YOU CAN'T DO.
`;

describe('Initiative', () => {
  it.scoped(
    'shopping list',
    Effect.fnUntraced(
      function* (_) {
        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());
        const initiative = yield* Database.Service.add(
          yield* Initiative.make({
            name: 'Shopping list',
            spec: 'Keep a shopping list of items to buy.',
          }),
        );
        invariant(initiative.chat?.target, 'Initiative chat queue not found.');
        yield* Database.Service.flush({ indexes: true });
        const conversation = yield* acquireReleaseResource(
          () => new AiConversation({ queue: initiative.chat?.target as any }),
        );
        yield* Effect.promise(() => conversation.context.open());

        yield* conversation.createRequest({
          system: SYSTEM,
          prompt: `List ingredients for a scrambled eggs on a toast breakfast.`,
          observer,
        });

        console.log(yield* Effect.promise(() => dumpInitiative(initiative)));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );

  // TODO(dmaretskyi): Broken in non-only mode since Clone is not deep and does not cover template in initiative blueprint.
  it.scoped(
    'expense tracking list',
    Effect.fnUntraced(
      function* (_) {
        const initiative = yield* Database.Service.add(
          yield* Initiative.make({
            name: 'Expense tracking',
            spec: trim`
              Keep a list of expenses in a markdown document (create artifact "Expenses").
              Process incoming emails, add the relevant ones to the list.

              Format:

              ## Expences

              - Flight to London (2026-02-01): £100
              - Hotel in London (2026-02-01): £100
            `,
          }),
        );
        yield* Database.Service.flush({ indexes: true });
        log.info('initiative', { queue: yield* Effect.promise(() => initiative.chat!.target!.queryObjects()) });

        const inboxQueue = yield* QueueService.createQueue();
        yield* Database.Service.add(
          Trigger.make({
            enabled: true,
            spec: {
              kind: 'queue',
              queue: inboxQueue.dxn.toString(),
            },
            function: Ref.make(FunctionDefinition.serialize(agent)),
            input: {
              initiative: Ref.make(initiative),
              event: '{{event}}',
            },
          }),
        );

        yield* QueueService.append(
          inboxQueue,
          TEST_MESSAGES.map((message) => Obj.clone(message)),
        );

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.invokeScheduledTriggers({ kinds: ['queue'] });

        console.log(yield* Effect.promise(() => dumpInitiative(initiative)));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});

const dumpInitiative = async (initiative: Initiative.Initiative) => {
  let text = '';
  text += `# Initiative: ${initiative.name}\n\n`;
  for (const artifact of initiative.artifacts) {
    const data = await artifact.data.load();
    text += `## ${artifact.name} (${Obj.getTypename(data)}):\n`;
    if (Obj.instanceOf(Text.Text, data)) {
      text += `    ${data.content}\n`;
    } else {
      text += `    ${JSON.stringify(data, null, 2)}\n`;
    }
    text += '\n';
  }
  return text;
};

const TEST_MESSAGES = [
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { email: 'receipts@britishairways.com' },
    blocks: [
      {
        _tag: 'text',
        text: trim`
          From: receipts@britishairways.com
          Subject: Your British Airways booking confirmation - BA287

          Dear Mr. Smith,

          Thank you for booking with British Airways. Your flight reservation is confirmed.

          BOOKING REFERENCE: XK7M2P

          FLIGHT DETAILS
          ─────────────────────────────────────
          Flight: BA287
          Date: 15 February 2026
          Route: San Francisco (SFO) → London Heathrow (LHR)
          Departure: 17:45 PST
          Arrival: 12:15 GMT (+1 day)
          Class: Economy

          PASSENGER
          ─────────────────────────────────────
          John Smith

          PAYMENT SUMMARY
          ─────────────────────────────────────
          Base fare:              £485.00
          Taxes and fees:         £127.50
          ─────────────────────────────────────
          TOTAL PAID:             £612.50

          Payment method: Visa ending in 4521
          Transaction date: 28 January 2026

          Please keep this email for your records.

          Kind regards,
          British Airways
        `,
      },
    ],
  }),
];
