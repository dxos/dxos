//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { AssistantTestLayerWithTriggers, runMemoizedTests } from '@dxos/agent-runtime/testing';
import { MemoizedAiService, MemoizedLanguageModel } from '@dxos/ai/testing';
import { AiSession } from '@dxos/assistant';
import { SpaceProperties } from '@dxos/client-protocol';
import { Instructions, Operation, OperationHandlerSet, Routine, Skill, Trigger } from '@dxos/compute';
import { TriggerDispatcher } from '@dxos/compute-runtime';
import { Collection, Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { MarkdownSkill } from '@dxos/plugin-markdown';
import { Markdown } from '@dxos/plugin-markdown';
import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/plugin';
import { WithProperties } from '@dxos/plugin-markdown/testing';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { Agent, AgentChat, Chat, Plan } from '../../types';
import { AgentWizardHandlers, AgentWizardOperations } from '../agent-wizard';
import { PlanningHandlers, PlanningSkill } from '../planning';
import { AgentSkillHandlers } from './operations';
import { Relay } from './operations/definitions';
import AgentSkillDef from './skill';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayerWithTriggers({
  aiServicePreset: 'edge-remote',
  operationHandlers: OperationHandlerSet.merge(
    AgentSkillHandlers,
    AgentWizardHandlers,
    MarkdownOperationHandlerSet,
    PlanningHandlers,
  ),
  types: [
    Agent.Agent,
    Plan.Plan,
    Chat.CompanionTo,
    Chat.Chat,
    SpaceProperties,
    Skill.Skill,
    Trigger.Trigger,
    Routine.Routine,
    Instructions.Instructions,
    Text.Text,
    Markdown.Document,
    Collection.Collection,
  ],
  tracing: 'pretty',
  // EntityIds are deterministic (via dangerouslyDisableRandomness) but their values shift when
  // internal ECHO object creation changes. Canonicalize them so recordings match structurally
  // regardless of which specific IDs the current code generates.
  dynamicValuePatterns: [MemoizedLanguageModel.SPACE_ID_PATTERN, MemoizedLanguageModel.ENTITY_ID_PATTERN],
});

const SYSTEM = trim`
  You are a helpful assistant that can help with tasks in the outside world.
  Be transparent about what you are doing and what you are not doing.
  If you do not have tools to complete the task, inform the user.
  DO NOT PRETEND TO DO SOMETHING YOU CAN'T DO.
`;

describe.skipIf(!runMemoizedTests())('Agent', () => {
  const skill = AgentSkillDef.make();

  it.scoped(
    'shopping list',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentChat.makeInitialized(
          {
            name: 'Shopping list',
            instructions: 'Keep a shopping list of items to buy.',
            skills: [Ref.make(MarkdownSkill.make())],
          },
          skill,
        );
        yield* Database.flush();
        const chat = yield* AgentChat.loadChat(agent);
        const chatFeed = chat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');
        const runtime = yield* Effect.runtime<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(
          () => new AiSession.Session({ feed: chatFeed, runtime }),
        );
        yield* Effect.promise(() => session.context.open());

        yield* session
          .createRequest({
            system: SYSTEM,
            prompt: `List ingredients for a scrambled eggs on a toast breakfast.`,
          })
          .pipe(Effect.provide(session.makeToolExecutionServices()));

        console.log(yield* Effect.promise(() => dumpAgent(agent, chat)));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );

  it.scoped(
    'expense tracking list',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentChat.makeInitialized(
          {
            name: 'Expense tracking',
            instructions: trim`
              Keep a list of expenses in a markdown document (create artifact "Expenses").
              Process incoming emails, add the relevant ones to the list.

              Format:

              ## Expenses
              - Flight to London (2026-02-01): £100
              - Hotel in London (2026-02-01): £100
            `,
            skills: [Ref.make(MarkdownSkill.make())],
          },
          skill,
        );
        yield* Database.flush();

        const agentChat = yield* AgentChat.loadChat(agent);
        invariant(agentChat, 'Agent chat not found.');
        const inboxFeed = yield* Database.add(Feed.make());
        yield* Database.add(
          Trigger.make({
            enabled: true,
            spec: Trigger.specFeed(inboxFeed),
            runnable: Ref.make(Operation.serialize(Relay)),
            input: {
              chat: Ref.make(agentChat),
              event: '{{event}}',
            },
            // Serialized: parallel invocations race on the memoized-conversations file during
            // ALLOW_LLM_GENERATION recording (a truncated concurrent read fails the invocation).
            concurrency: 1,
          }),
        );

        yield* Feed.append(
          inboxFeed,
          TEST_MESSAGES.map((message) => Obj.clone(message)),
        );

        const dispatcher = yield* TriggerDispatcher;
        const invocations = yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'], untilExhausted: true });
        expect(invocations.every((invocation) => Exit.isSuccess(invocation.result))).toBe(true);

        console.log(yield* Effect.promise(() => dumpAgent(agent, agentChat)));
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );

  it.scoped(
    'cron field creates a timer routine that relays into the agent session',
    Effect.fnUntraced(
      function* ({ expect }) {
        const cron = '*/5 * * * *';
        const agent = yield* AgentChat.makeInitialized(
          {
            name: 'Scheduled agent',
            instructions: 'A scheduled agent that runs on a timer.',
            skills: [Ref.make(MarkdownSkill.make())],
          },
          skill,
        );
        yield* Database.flush();

        yield* Operation.invoke(AgentWizardOperations.SyncAutomation, { agent: Ref.make(agent), cron });

        const triggers = yield* Database.query(
          Query.select(Filter.type(Trigger.Trigger)).debugLabel('assistant-toolkit.skill.test.timer'),
        ).run;
        const timerTriggers = triggers.filter(
          (trigger) => trigger.spec?.kind === 'timer' && trigger.spec.cron === cron,
        );
        expect(timerTriggers).toHaveLength(1);

        const timerTrigger = timerTriggers[0];
        invariant(timerTrigger.spec?.kind === 'timer');
        expect(timerTrigger.spec.cron).toBe(cron);
        expect(timerTrigger.enabled).toBe(true);

        // The timer routine relays a synthetic wake prompt into the agent's durable session.
        invariant(timerTrigger.runnable);
        const operation = yield* Database.load(timerTrigger.runnable);
        invariant(Obj.instanceOf(Operation.PersistentOperation, operation));
        expect(Obj.getMeta(operation).key).toBe(Relay.meta.key);

        // The trigger is wrapped in a user-facing Routine aggregate.
        const routines = yield* Database.query(
          Query.select(Filter.type(Routine.Routine)).debugLabel('assistant-toolkit.skill.test.timer-routine'),
        ).run;
        expect(routines).toHaveLength(1);
        expect(routines[0].triggers.map((ref) => ref.uri)).toContain(Ref.make(timerTrigger).uri);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  // Replay-unstable: the recorded conversation includes nondeterministic tool-error recovery
  // (the model mis-targets markdown update refs and retries differently each generation), so the
  // memoized transcript cannot converge. The scenario is covered live by the scored
  // `planning.eval.ts` in @dxos/assistant-evals.
  it.scoped.skip(
    'planning',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentChat.makeInitialized(
          {
            name: 'Egg making',
            instructions: trim`
              I'm testing how planning (task management) works.
              Create tasks to make scrambled eggs.

              Then simulate this plan execution in a markdown document.
              The document should reflect the state of all objects involved in the cooking process.
              The document should also have the log of actions taken.

              Important: simualte actions one by one, in the order they are listed.
              Simlate by updating the local document.

              <example>
                # State

                - 2 raw eggs
                - 1 frying pan
                
                # Action log
                
                - Taken 2 raw eggs out of the fridge.
              </example>
            `,
            skills: [Ref.make(MarkdownSkill.make()), Ref.make(Obj.clone(PlanningSkill.make()))],
          },
          skill,
        );
        yield* Database.flush();

        yield* Database.flush();
        const chat = yield* AgentChat.loadChat(agent);
        const chatFeed = chat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');
        const runtime = yield* Effect.runtime<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(
          () => new AiSession.Session({ feed: chatFeed, runtime }),
        );
        yield* Effect.promise(() => session.context.open());

        yield* session
          .createRequest({
            system: SYSTEM,
            prompt: `Go`,
          })
          .pipe(Effect.provide(session.makeToolExecutionServices()));

        console.log(yield* Effect.promise(() => dumpAgent(agent, chat)));
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );

  it.scoped(
    'sync-triggers sets trigger enabled from agent.enabled',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* AgentChat.makeInitialized(
          {
            name: 'Toggle agent',
            instructions: 'Test enabled propagation.',
            skills: [Ref.make(MarkdownSkill.make())],
            enabled: false,
          },
          skill,
        );
        yield* Database.flush();

        yield* Operation.invoke(AgentWizardOperations.SyncAutomation, { agent: Ref.make(agent), cron: '0 9 * * *' });

        const triggers = yield* Database.query(
          Query.select(Filter.type(Trigger.Trigger)).debugLabel('assistant-toolkit.skill.test.toggle-enabled'),
        ).run;
        expect(triggers.every((trigger) => trigger.enabled === false)).toBe(true);

        Obj.update(agent, (agent) => {
          agent.enabled = true;
        });
        yield* Database.flush();
        yield* Operation.invoke(AgentWizardOperations.SyncAutomation, { agent: Ref.make(agent), cron: '0 9 * * *' });

        const triggersAfter = yield* Database.query(
          Query.select(Filter.type(Trigger.Trigger)).debugLabel('assistant-toolkit.skill.test.after'),
        ).run;
        expect(triggersAfter).toHaveLength(triggers.length);
        expect(triggersAfter.every((trigger) => trigger.enabled === true)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

const dumpAgent = async (agent: Agent.Agent, chat: Chat.Chat | undefined) => {
  let text = '';
  text += `============== Agent: ${agent.name} ==============\n\n`;
  text += `============== Instructions ==============\n\n`;
  text += `${await agent.instructions.load().then((instructions) => instructions.text.load().then((doc) => doc.content))}\n`;
  text += `============== Plan ==============\n\n`;
  if (chat?.plan) {
    text += `${await chat.plan.load().then((plan) => Plan.formatPlan(plan))}\n`;
  } else {
    text += 'No plan found.\n';
  }
  return text;
};

const TEST_MESSAGES = [
  // Expense-related emails
  Obj.make(Message.Message, {
    created: new Date('2026-01-28T10:15:00Z').toISOString(),
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
  Obj.make(Message.Message, {
    created: new Date('2026-01-29T14:30:00Z').toISOString(),
    sender: { email: 'noreply@booking.com' },
    blocks: [
      {
        _tag: 'text',
        text: trim`
          From: noreply@booking.com
          Subject: Booking Confirmation - The Savoy London

          Booking Confirmation

          Dear John Smith,

          Your booking is confirmed!

          Hotel: The Savoy London
          Address: Strand, London WC2R 0EU, United Kingdom
          Check-in: 15 February 2026, 15:00
          Check-out: 18 February 2026, 11:00
          Guests: 1 adult
          Room: Deluxe King Room

          Total amount: £450.00
          Payment: Paid via credit card ending in 4521
          Booking reference: BK-789456123

          We look forward to welcoming you!

          Best regards,
          Booking.com
        `,
      },
    ],
  }),
  Obj.make(Message.Message, {
    created: new Date('2026-02-15T19:45:00Z').toISOString(),
    sender: { email: 'receipt@uber.com' },
    blocks: [
      {
        _tag: 'text',
        text: trim`
          From: receipt@uber.com
          Subject: Your trip receipt

          Trip Receipt

          Trip Date: February 15, 2026 at 7:30 PM
          Trip ID: 1A2B3C4D5E

          Route: London Heathrow Airport → The Savoy London
          Distance: 18.2 miles
          Duration: 45 minutes

          Fare breakdown:
          Base fare:                    £12.50
          Distance:                     £18.20
          Time:                         £11.25
          Booking fee:                  £2.50
          ─────────────────────────────────────
          Subtotal:                     £44.45
          VAT (20%):                    £8.89
          ─────────────────────────────────────
          Total:                        £53.34

          Payment method: Visa •••• 4521

          Thank you for riding with Uber!
        `,
      },
    ],
  }),
  Obj.make(Message.Message, {
    created: new Date('2026-02-16T20:15:00Z').toISOString(),
    sender: { email: 'receipts@opentable.com' },
    blocks: [
      {
        _tag: 'text',
        text: trim`
          From: receipts@opentable.com
          Subject: Your receipt from The Ivy

          Receipt

          Restaurant: The Ivy
          Address: 1-5 West Street, London WC2H 9NQ
          Date: February 16, 2026
          Time: 8:00 PM
          Table: 12
          Guests: 2

          Order Summary:
          ─────────────────────────────────────
          Starter - Scallops                  £18.00
          Main - Ribeye Steak                 £32.00
          Main - Sea Bass                     £28.00
          Side - Truffle Fries                £8.50
          Wine - Chardonnay (bottle)          £45.00
          Dessert - Chocolate Soufflé         £12.00
          ─────────────────────────────────────
          Subtotal:                           £143.50
          Service charge (12.5%):             £17.94
          ─────────────────────────────────────
          Total:                              £161.44

          Payment: Card ending in 4521
          Reservation ID: OT-987654321

          Thank you for dining with us!
        `,
      },
    ],
  }),
  Obj.make(Message.Message, {
    created: new Date('2026-02-17T09:00:00Z').toISOString(),
    sender: { email: 'receipts@amazon.co.uk' },
    blocks: [
      {
        _tag: 'text',
        text: trim`
          From: receipts@amazon.co.uk
          Subject: Your Amazon.co.uk order #123-4567890-1234567

          Order Confirmation

          Hello John Smith,

          We've received your order and will send a confirmation when it ships.

          Order #123-4567890-1234567
          Order Date: February 17, 2026

          Items Ordered:
          ─────────────────────────────────────
          1x  London Travel Guide 2026        £12.99
          1x  Universal Travel Adapter        £8.50
          ─────────────────────────────────────
          Items:                               £21.49
          Shipping & Handling:                 £4.99
          ─────────────────────────────────────
          Order Total:                         £26.48

          Payment method: Visa ending in 4521
          Shipping to: The Savoy London, Strand, London WC2R 0EU

          Estimated delivery: February 18, 2026

          Thank you for your order!
        `,
      },
    ],
  }),
  // Unrelated emails
  Obj.make(Message.Message, {
    created: new Date('2026-01-30T08:00:00Z').toISOString(),
    sender: { email: 'newsletter@techcrunch.com' },
    blocks: [
      {
        _tag: 'text',
        text: trim`
          From: newsletter@techcrunch.com
          Subject: Weekly Tech Roundup - AI Breakthroughs & Startup News

          TechCrunch Weekly Newsletter

          This week in tech:

          • OpenAI announces GPT-5 with enhanced reasoning capabilities
          • New quantum computing milestone achieved by IBM
          • 5 startups that raised over $100M this week
          • The future of autonomous vehicles: what's next?

          Read the full stories: https://techcrunch.com/weekly

          Unsubscribe | Manage preferences
        `,
      },
    ],
  }),
  Obj.make(Message.Message, {
    created: new Date('2026-02-01T12:00:00Z').toISOString(),
    sender: { email: 'sarah.johnson@gmail.com' },
    blocks: [
      {
        _tag: 'text',
        text: trim`
          From: sarah.johnson@gmail.com
          Subject: Re: Coffee next week?

          Hey John,

          Sounds great! How about Tuesday at 2pm? The usual place?

          Let me know if that works for you.

          Cheers,
          Sarah
        `,
      },
    ],
  }),
  Obj.make(Message.Message, {
    created: new Date('2026-02-10T10:30:00Z').toISOString(),
    sender: { email: 'promotions@nike.com' },
    blocks: [
      {
        _tag: 'text',
        text: trim`
          From: promotions@nike.com
          Subject: 🏃‍♂️ 30% Off Running Shoes - Limited Time!

          Don't miss out!

          Get 30% off all running shoes this week only. Use code RUN30 at checkout.

          Shop now: https://nike.com/sale

          Valid until February 17, 2026.

          Unsubscribe | View in browser
        `,
      },
    ],
  }),
  Obj.make(Message.Message, {
    created: new Date('2026-02-14T16:20:00Z').toISOString(),
    sender: { email: 'notifications@github.com' },
    blocks: [
      {
        _tag: 'text',
        text: trim`
          From: notifications@github.com
          Subject: [dxos/dxos] New pull request: feat: add expense tracking

          johnsmith opened a pull request in dxos/dxos

          Title: feat: add expense tracking
          Branch: feature/expense-tracking → main

          This PR adds a new expense tracking feature to the assistant toolkit.

          Review it here: https://github.com/dxos/dxos/pull/1234

          You're receiving this because you're watching this repository.
        `,
      },
    ],
  }),
  Obj.make(Message.Message, {
    created: new Date('2026-02-18T11:00:00Z').toISOString(),
    sender: { email: 'receipts@britishairways.com' },
    blocks: [
      {
        _tag: 'text',
        text: trim`
          From: receipts@britishairways.com
          Subject: Your British Airways booking confirmation - BA288

          Dear Mr. Smith,

          Thank you for booking with British Airways. Your return flight reservation is confirmed.

          BOOKING REFERENCE: YK8N3Q

          FLIGHT DETAILS
          ─────────────────────────────────────
          Flight: BA288
          Date: 20 February 2026
          Route: London Heathrow (LHR) → San Francisco (SFO)
          Departure: 10:30 GMT
          Arrival: 13:15 PST
          Class: Economy

          PASSENGER
          ─────────────────────────────────────
          John Smith

          PAYMENT SUMMARY
          ─────────────────────────────────────
          Base fare:              £520.00
          Taxes and fees:         £135.00
          ─────────────────────────────────────
          TOTAL PAID:             £655.00

          Payment method: Visa ending in 4521
          Transaction date: 18 February 2026

          Please keep this email for your records.

          Kind regards,
          British Airways
        `,
      },
    ],
  }),
];
