//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { type AiService } from '@dxos/ai';
import { ScriptedLanguageModel, SERVICES_CONFIG } from '@dxos/ai/testing';
import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import { withPluginManager } from '@dxos/app-framework/testing';
import { TrajectoryStore } from '@dxos/assistant';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import * as AssistantChat from '@dxos/assistant/Chat';
import { Database, Feed, Filter, Ref, type Registry } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { Config } from '@dxos/react-client';
import { useRegistry, useSpaces } from '@dxos/react-client/echo';
import { Dnd } from '@dxos/react-ui-dnd';
import { MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Panel from '@dxos/react-ui/Panel';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Task } from '@dxos/types';
import { arrayMove, trim } from '@dxos/util';

import { useChatModel, useChatServices, usePresets } from '#hooks';
import * as AssistantPlugin from '#meta';
import { translations } from '#translations';
import { type Assistant, AssistantCapabilities } from '#types';

import { Chat } from '../Chat/index.ts';
import * as ChatPlane from './ChatPlane.tsx';

type StoryArgs = {
  /** Answers from a scripted model rather than the hosted service, so the story runs offline. */
  fake?: boolean;
  /** One exchange per thread to start with; without it the story starts with one empty thread. */
  seed?: readonly { prompt: string; reply: string }[];
  /** Position of the thread selected at the start. */
  selected?: number;
};

/** Replies long enough to read like a real answer. Each paragraph is one line, since the renderer keeps line breaks. */
const FAKE_REPLIES = [
  trim`
    Here is how I would approach this, starting with what we know and then what is still open.

    ## What we know

    The request touches three areas, and each one can change on its own:

    - **Data:** what is stored, and who is allowed to change it.
    - **Behavior:** the rules that run when the data changes.
    - **Presentation:** how the result reads on screen.

    Keeping these apart means a change in one rarely forces a change in the others.

    ## What to do next

    Start with the smallest change that shows the idea working from end to end. A narrow version exposes the awkward cases early, while they are still cheap to fix. Once it holds up, widen it one case at a time and test as you go.

    ## What could go wrong

    The main risk is two writers changing the same thing at once. Decide up front which one wins, and record that decision, so that nobody has to work it out again later.
  `,
  trim`
    There are a few ways to do this. They differ mostly in where the work happens.

    ## Option one: do it up front

    Compute the result once and store it. Reads are fast and simple, but every write costs more, and the stored copy can go stale if something changes underneath it.

    ## Option two: do it on demand

    Compute the result each time it is needed:

    \`\`\`ts
    const total = items.reduce((sum, item) => sum + item.value, 0);
    \`\`\`

    This is always correct and needs no extra storage, but it gets slower as the data grows.

    ## Which to choose

    For a small collection, compute on demand. It is less code, and nothing can go stale. Move to a stored result only when a measurement shows that reads are too slow, and keep the on-demand version as the check that the stored copy is right.

    Either way, write the test first, because it stays valid when the implementation changes.
  `,
  trim`
    I looked through this, and the short version is that it mostly works, with one real problem and a couple of smaller ones.

    ## The real problem

    The result depends on the order things arrive in. When they arrive in the expected order everything looks fine, so the fault is easy to miss, and it shows up only under load. Making the step independent of order fixes it at the source, which is better than retrying around it.

    ## Smaller points

    1. Two of the names say the same thing in different words. Pick one and use it everywhere.
    2. An error is caught and then dropped, so a failure looks like an empty result. It should reach the caller.
    3. One value is computed twice on the same path. This does no harm, but it is easy to remove.

    ## How to check it

    Run the same input in several different orders and compare the results. If they all match, the problem is gone. Keep that as a regression test, since nothing else would catch this if it came back.
  `,
];

/**
 * Replaces the AI service with a model that answers every turn, however many are sent.
 *
 * The model is built once: `languageModel()` runs per request, and a model built there would restart its script.
 */
const fakeAiServiceMiddleware = () => {
  const model = Effect.runSync(
    ScriptedLanguageModel.makeScriptedLanguageModel((_request, index) => ({
      parts: [ScriptedLanguageModel.text(`**Fake reply ${index + 1}.** ${FAKE_REPLIES[index % FAKE_REPLIES.length]}`)],
      delay: '1 second',
    })),
  );
  const layer = Layer.succeed(LanguageModel.LanguageModel, model);
  return (upstream: AiService.Service): AiService.Service => ({ ...upstream, languageModel: () => layer });
};

// The prompt floats over the thread, whose last lines must still scroll clear of it.
const PROMPT_CLEARANCE_LINES = 6;

type ThreadColumnProps = {
  chat: AssistantChat.Chat;
  current: boolean;
  db: Database.Database;
  runtime?: Capabilities.ProcessManagerRuntime;
  registry: Registry.Registry;
  settings: Assistant.Settings;
  /** The thread's place in the strip, which decides what its menu offers. */
  index: number;
  count: number;
  onMove: (id: string, index: number) => void;
  onDelete: (chat: AssistantChat.Chat) => void;
};

/** One thread with its own chat model, so a turn keeps running after the reader moves to another thread. */
const ThreadColumn = ({
  chat,
  current,
  db,
  runtime,
  registry,
  settings,
  index,
  count,
  onMove,
  onDelete,
}: ThreadColumnProps) => {
  const { preset, ...chatProps } = usePresets(settings, chat);
  const chatModel = useChatModel({ db, chat, preset, runtime, registry, settings });
  // Sending before the new chat reaches the database would leave the agent unable to resolve it.
  const handleSubmit = useCallback(() => db.flush(), [db]);
  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: 'Thread' })
        .action(
          'move-left',
          {
            label: 'Move left',
            icon: 'ph--arrow-left--regular',
            disabled: index === 0,
            testId: 'chat-plane.move-left',
          },
          () => onMove(chat.id, index - 1),
        )
        .action(
          'move-right',
          {
            label: 'Move right',
            icon: 'ph--arrow-right--regular',
            disabled: index === count - 1,
            testId: 'chat-plane.move-right',
          },
          () => onMove(chat.id, index + 1),
        )
        .action(
          'delete',
          { label: 'Delete', icon: 'ph--trash--regular', disabled: count === 1, testId: 'chat-plane.delete' },
          () => onDelete(chat),
        )
        .build(),
    [chat, index, count, onMove, onDelete],
  );

  return (
    <Chat.Root chat={chat} db={db} chatModel={chatModel} onSubmit={handleSubmit}>
      <ChatPlane.Column value={chat.id}>
        <ChatPlane.Cell menu={menu}>
          <Panel.Body asChild>
            <Chat.Content>
              <Chat.Thread tailLines={PROMPT_CLEARANCE_LINES} />
            </Chat.Content>
          </Panel.Body>
        </ChatPlane.Cell>
        <ChatPlane.Prompt>
          <Chat.Activity />
          <Chat.Prompt {...chatProps} outline autoFocus={current} preset={preset?.id} />
        </ChatPlane.Prompt>
      </ChatPlane.Column>
    </Chat.Root>
  );
};

const DefaultStory = ({ selected = 0 }: StoryArgs) => {
  const [space] = useSpaces();
  const db = space?.db;
  const chats = useQuery(db, Filter.type(AssistantChat.Chat));
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const registry = useRegistry();
  const runtime = useChatServices({ id: db?.spaceId });

  // Ids are time-ordered, so a thread lands at the end of the strip unless it was added on the left or dragged.
  const [order, setOrder] = useState<readonly string[]>([]);
  const threads = useMemo(() => {
    const sorted = chats.toSorted((a, b) => a.id.localeCompare(b.id));
    const position = ({ id }: AssistantChat.Chat) => {
      const index = order.indexOf(id);
      return index === -1 ? order.length : index;
    };
    return sorted.toSorted((a, b) => position(a) - position(b));
  }, [chats, order]);
  const [currentId, setCurrentId] = useState<string>();
  // A thread just created is not in the query yet, so an unknown id holds the position until it arrives.
  const lastIndexRef = useRef(selected);
  const found = threads.findIndex(({ id }) => id === currentId);
  const index = found === -1 ? Math.max(Math.min(lastIndexRef.current, threads.length - 1), 0) : found;
  // Only a thread that was found moves the position: threads arrive in stages, and clamping to the first of them
  // would lose the one selected at the start.
  if (found !== -1) {
    lastIndexRef.current = found;
  }
  const current = threads[index];

  const handleNew = useCallback(
    (side: 'start' | 'end' = 'end') => {
      if (db) {
        const feed = db.add(Feed.make());
        const chat = db.add(AssistantChat.make({ name: `Thread ${threads.length + 1}`, feed: Ref.make(feed) }));
        if (side === 'start') {
          setOrder([chat.id, ...threads.map(({ id }) => id)]);
        }
        setCurrentId(chat.id);
      }
    },
    [db, threads],
  );

  const handleMove = useCallback(
    (id: string, index: number) => {
      const next = threads.map((thread) => thread.id);
      setOrder(arrayMove(next, next.indexOf(id), index));
    },
    [threads],
  );

  const handleDelete = useCallback((chat: AssistantChat.Chat) => db?.remove(chat), [db]);

  if (!db || !current) {
    return <Loading />;
  }

  return (
    <Dnd.Root>
      <ChatPlane.Root value={current.id} onValueChange={setCurrentId} onAdd={handleNew} onMove={handleMove}>
        <ChatPlane.Viewport>
          <ChatPlane.Add side='start' />
          <ChatPlane.Columns items={threads}>
            {(id) => {
              const position = threads.findIndex((thread) => thread.id === id);
              const chat = threads[position];
              return (
                chat && (
                  <ThreadColumn
                    chat={chat}
                    index={position}
                    count={threads.length}
                    onMove={handleMove}
                    onDelete={handleDelete}
                    current={id === current.id}
                    db={db}
                    runtime={runtime}
                    registry={registry}
                    settings={settings}
                  />
                )
              );
            }}
          </ChatPlane.Columns>
          <ChatPlane.Add side='end' />
        </ChatPlane.Viewport>
      </ChatPlane.Root>
    </Dnd.Root>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatPlane',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(({ args: { fake, seed } }) => ({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [AssistantChat.Chat, Feed.Feed, Message.Message, Task.Task],
          config: new Config({ runtime: { services: SERVICES_CONFIG.REMOTE } }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              const exchanges = seed ?? [undefined];
              for (const [index, exchange] of exchanges.entries()) {
                const feed = space.db.add(Feed.make());
                space.db.add(AssistantChat.make({ name: `Thread ${index + 1}`, feed: Ref.make(feed) }));
                if (exchange) {
                  yield* TrajectoryStore.appendExchange(feed, exchange).pipe(Effect.provide(Database.layer(space.db)));
                }
              }
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        AssistantPlugin.make({ aiServiceMiddleware: fake ? fakeAiServiceMiddleware() : undefined }),
        RoutinePlugin.make(),
        // Provides the space services a turn runs with; without it every request fails on `Registry.Service`.
        SpacePlugin.make({}),
        StorybookPlugin.make({}),
      ],
      capabilities,
    })),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

/** Talks to the hosted AI service. */
export const RealModel: Story = {
  args: {},
};

/** Talks to a scripted model: offline, and every reply is predictable. */
export const FakeModel: Story = {
  args: { fake: true },
};

/** Long enough to overflow a column, so its scrolling and the prompt floating over it both show. */
const FOUR_THREADS: StoryArgs['seed'] = [
  {
    prompt: 'What is the capital of Australia?',
    reply: trim`
      The capital of Australia is **Canberra**, in the Australian Capital Territory. It is often mistaken for Sydney or Melbourne, which are much larger, and that confusion has a history behind it.

      ## Why Canberra

      When the Australian colonies federated in 1901, Sydney and Melbourne both claimed to be the natural capital. The constitution settled the rivalry with a compromise:

      - The capital would be a new city, in New South Wales.
      - It would sit at least 100 miles from Sydney.
      - Melbourne would host Parliament until the new city was ready.

      ## How it was built

      The site was chosen in 1908, and an international design competition followed. Walter Burley Griffin and Marion Mahony Griffin won it in 1912 with a plan built around geometric avenues and a central lake.

      Building was slow, interrupted by two world wars and the Depression. Parliament moved from Melbourne in 1927, but Lake Burley Griffin was not filled until the 1960s.

      ## Today

      Canberra is home to Parliament House, the High Court, the National Gallery and the Australian War Memorial. Its economy leans heavily on government, along with universities and research.
    `,
  },
  {
    prompt: 'What is 17 × 23?',
    reply: trim`
      The answer is **391**. There are several ways to get there without a calculator.

      ## Split one factor

      Break 23 into 20 and 3, then multiply each part by 17:

      - 17 × 20 gives 340.
      - 17 × 3 gives 51.
      - 340 + 51 gives 391.

      ## Use a difference of squares

      The factors sit either side of 20, three below and three above, so they fit the pattern \`(a - b)(a + b) = a² - b²\`:

      - Here a is 20 and b is 3.
      - 20² is 400 and 3² is 9.
      - 400 - 9 gives 391.

      This is usually the fastest route when two factors are equally far from a round number.

      ## Check the result

      Casting out nines is a quick test. The digits of 17 add up to 8, and the digits of 23 add up to 5, so the product should match 8 × 5 = 40, which reduces to 4. The digits of 391 add up to 13, which also reduces to 4.

      The test can miss some mistakes, such as swapped digits, but it catches most slips in arithmetic.
    `,
  },
  {
    prompt: 'Name a prime number above 100.',
    reply: trim`
      For example, **101** is prime, and it is the smallest prime above 100.

      ## Why it is prime

      To test a number, you only need to try dividing by primes up to its square root. The square root of 101 is just over 10, so the candidates are 2, 3, 5 and 7:

      - It is odd, so 2 does not divide it.
      - Its digits add up to 2, so 3 does not divide it.
      - It does not end in 0 or 5, so 5 does not divide it.
      - Dividing by 7 leaves a remainder of 3.

      No candidate divides it, so 101 is prime.

      ## Nearby primes

      The next few are 103, 107, 109 and 113. Between 113 and 127 there is a gap of 14, the first gap that large.

      ## Twin primes

      Pairs that differ by 2 are called twin primes. 101 and 103 form one such pair, as do 107 and 109. Whether there are infinitely many of these pairs remains an open question in number theory.
    `,
  },
  {
    prompt: 'How many sides does a hexagon have?',
    reply: trim`
      A hexagon has **six** sides, along with six corners. The name comes from the Greek for "six" and "angle".

      ## Angles

      The interior angles of any simple hexagon add up to 720 degrees. In a regular hexagon, where every side and angle is equal, each interior angle is 120 degrees.

      ## Tiling

      Only three regular polygons can cover a flat surface with no gaps: triangles, squares and hexagons. Of those three, hexagons enclose a given area with the least perimeter, which makes them an efficient way to divide up a plane.

      ## Where they appear

      - **Honeycomb:** the cells use little wax for the space they hold.
      - **Chemistry:** the benzene molecule is drawn as a ring of six carbon atoms.
      - **Geology:** cooling lava can crack into hexagonal columns, as at the Giant's Causeway.
      - **Board games:** hex grids make every neighbouring cell the same distance away.

      ## Construction

      With a compass, draw a circle, then step its radius around the edge. Six steps return to the start, and joining the marks gives a regular hexagon.
    `,
  },
];

/** Starts on the second of four threads that already hold a conversation; replies come from the scripted model. */
export const FourThreads: Story = {
  args: {
    fake: true,
    selected: 1,
    seed: FOUR_THREADS,
  },
};
