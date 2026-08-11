//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Provider } from '@dxos/ai';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapabilities, useOptionalCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ProgressMeter, useProgressMonitors } from '@dxos/app-toolkit/ui';
import { Database, Feed, Filter, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';
import { BrainPlugin } from '@dxos/plugin-brain/plugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { ProgressPlugin } from '@dxos/plugin-progress/plugin';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { StoryAiPlugin, importMessages, seedDemoMessages } from '../testing';

/** Local Ollama model driving the `AnalyzeMailbox` fact variant; Ollama needs `strict: false`. */
const OLLAMA_MODEL = 'com.alibaba.model.qwen-2-5-7b.instruct';

/**
 * Adds a Mailbox seeded from the pulled `@dxos/fixtures` mailbox corpus (served by the storybook
 * dev server at `/fixtures/<name>.json` — see `.storybook/main.mts`), falling back to the shared
 * demo messages when no corpus has been pulled (CI, fresh checkout). The dev server SPA-fallbacks
 * unknown paths with HTML, so gate on the content type rather than the status alone.
 */
const seed = async (space: Space) => {
  const mailbox = space.db.add(Mailbox.make({ name: 'Inbox' }));
  await space.db.flush();
  const response = await fetch('/fixtures/mailbox.json').catch(() => undefined);
  if (response?.ok && response.headers.get('content-type')?.includes('application/json')) {
    const archived: unknown[] = await response.json();
    await importMessages(mailbox, archived, space.db);
  } else {
    const feed = await mailbox.feed.load();
    await EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
  }
  await space.db.flush({ indexes: true });
};

/**
 * Harness: seeds the shared demo mailbox fixture and drives the cursored `ProcessMailbox`
 * pipeline + `ResetProcessCursor` via the OperationInvoker (the same operations the mailbox
 * toolbar's Process/Reset actions run), reporting live counts so the play function can assert
 * cursor semantics from the DOM.
 */
const DefaultStory = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const feed = mailbox?.feed?.target;
  const messages = useQuery(
    space?.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const cursors = useQuery(space?.db, Filter.type(Cursor.Cursor));
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);
  const [factStores] = useCapabilities(BrainCapabilities.FactStoreRegistry);
  const [runs, setRuns] = useState(0);
  const [last, setLast] = useState<unknown>();
  const [facts, setFacts] = useState(0);

  // Every invoker run is a process emitting `status.update` trace events; the progress sink projects
  // them into the registry, so the meters below mirror the app's statusbar (incl. cancel).
  const monitors = useProgressMonitors();
  const progressRegistry = useOptionalCapability(AppCapabilities.ProgressRegistry);

  // The in-memory FactStore is not ECHO-reactive, so refreshes are explicit (after each run).
  const refreshFacts = async () => {
    if (!space || !factStores) {
      return;
    }
    const stored = await EffectEx.runPromise(
      factStores
        .forSpace(space.id)
        .query({})
        .pipe(Effect.orElseSucceed(() => [])),
    );
    setFacts(stored.length);
  };

  const handleRun = async () => {
    if (!space?.db || !invoker || !mailbox) {
      return;
    }

    // A failure is rendered as a terminal error state (never swallowed to undefined): the play test
    // asserts on the result payload, so an error can never satisfy a success assertion.
    const result = await invoker
      .invokePromise(InboxOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) }, { spaceId: space.id })
      .catch((err) => {
        log.warn('process mailbox failed', { err });
        return { error: String(err) };
      });
    setLast(result);
    setRuns((count) => count + 1);
  };

  const handleReset = async () => {
    if (!space?.db || !invoker || !mailbox) {
      return;
    }

    const result = await invoker
      .invokePromise(InboxOperation.ResetProcessCursor, { mailbox: Ref.make(mailbox) }, { spaceId: space.id })
      .catch((err) => {
        log.warn('reset process cursor failed', { err });
        return { error: String(err) };
      });
    setLast(result);
    setRuns((count) => count + 1);
  };

  // Fact-pipeline variant: `AnalyzeMailbox` over the same feed (own `#analyze` cursor + monitor),
  // extracting against a local Ollama model — start it with `OLLAMA_ORIGINS="*" ollama serve`.
  const handleAnalyze = async () => {
    if (!space?.db || !invoker || !mailbox) {
      return;
    }

    const result = await invoker
      .invokePromise(
        InboxOperation.AnalyzeMailbox,
        { mailbox: Ref.make(mailbox), model: OLLAMA_MODEL, provider: Provider.ollama.id, strict: false, pageSize: 1 },
        { spaceId: space.id },
      )
      .catch((err) => {
        log.warn('analyze mailbox failed', { err });
        return { error: String(err) };
      });
    setLast(result);
    setRuns((count) => count + 1);
    await refreshFacts();
  };

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button data-testid='process' disabled={!invoker || !mailbox} onClick={() => void handleRun()}>
            Run
          </Toolbar.Button>
          <Toolbar.Button data-testid='reset' disabled={!invoker || !mailbox} onClick={() => void handleReset()}>
            Reset
          </Toolbar.Button>
          <Toolbar.Button data-testid='analyze' disabled={!invoker || !mailbox} onClick={() => void handleAnalyze()}>
            Analyze
          </Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content data-testid='counts' classNames='dx-container overflow-auto p-2 text-sm'>
        <JsonHighlighter
          data={{
            runs,
            mailbox: mailbox ? 1 : 0,
            messages: messages.length,
            cursors: cursors.length,
            cursorMax: Cursor.parseKey(cursors[0]?.max),
            facts,
            last,
          }}
        />
      </Panel.Content>
      {monitors.length > 0 && (
        <Panel.Statusbar classNames='flex flex-col'>
          {monitors.map((monitor) => (
            <ProgressMeter
              key={monitor.name}
              state={monitor}
              classNames='border-t border-separator'
              onCancel={progressRegistry ? () => progressRegistry.cancel(monitor.name) : undefined}
            />
          ))}
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};

const meta = {
  title: 'stories/stories-inbox/ProcessPipeline',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      setupEvents: [ActivationEvents.Startup],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Mailbox.Mailbox, TagIndex.TagIndex, Message.Message, Cursor.Cursor],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => seed(defaultSpace));
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        BrainPlugin(),
        ProgressPlugin(),
        StoryAiPlugin(),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The cursored log-title pipeline over a seeded mailbox — the `@dxos/fixtures` corpus when pulled,
 * the demo messages otherwise, so the assertions are count-agnostic: the first run processes every
 * seeded message and creates the tagged feed cursor; a rerun processes nothing (strictly-greater
 * skip); reset clears the cursor (reusing the object) so the next run re-processes the whole feed.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const waitFor = async (
      predicate: (text: string) => boolean,
      { timeout = 30_000, interval = 100 }: { timeout?: number; interval?: number } = {},
    ): Promise<string> => {
      const deadline = Date.now() + timeout;
      let text = canvas.queryByTestId('counts')?.textContent ?? '';
      while (Date.now() < deadline) {
        if (predicate(text)) {
          return text;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
        text = canvas.queryByTestId('counts')?.textContent ?? '';
      }
      return text;
    };

    // Wait for the seeded messages to finish loading — the query streams results in, so capturing
    // on first sight of a nonzero count reads a partial corpus (e.g. 100 of 391). Require the count
    // to hold steady across several consecutive polls (the stream can pause between batches for
    // longer than one interval) before trusting it.
    const countOf = (text: string): number => Number(/"messages":\s*(\d+)/.exec(text)?.[1] ?? 0);
    let messageCount = 0;
    let stablePolls = 0;
    await waitFor(
      (text) => {
        const count = countOf(text);
        stablePolls = count > 0 && count === messageCount ? stablePolls + 1 : 0;
        messageCount = count;
        return stablePolls >= 3;
      },
      { interval: 500 },
    );
    void expect(messageCount).toBeGreaterThan(0);

    // First pass: every seeded message is processed and the tagged cursor is created + advanced.
    await userEvent.click(canvas.getByTestId('process'));
    const afterFirst = await waitFor((text) => /"runs":\s*1\b/.test(text));
    void expect(afterFirst).toMatch(new RegExp(`"processed":\\s*${messageCount}\\b`));
    void expect(afterFirst).toMatch(/"cursors":\s*1\b/);
    void expect(afterFirst).not.toMatch(/"cursorMax":\s*0\b/);

    // Second pass: strictly-greater skip — nothing new to process.
    await userEvent.click(canvas.getByTestId('process'));
    const afterSecond = await waitFor((text) => /"runs":\s*2\b/.test(text));
    void expect(afterSecond).toMatch(/"processed":\s*0\b/);

    // Reset clears the cursor (object reused), so the next run re-processes the whole feed.
    await userEvent.click(canvas.getByTestId('reset'));
    const afterReset = await waitFor((text) => /"runs":\s*3\b/.test(text));
    void expect(afterReset).toMatch(/"reset":\s*true\b/);
    void expect(afterReset).toMatch(/"cursorMax":\s*0\b/);
    await userEvent.click(canvas.getByTestId('process'));
    const afterRerun = await waitFor((text) => /"runs":\s*4\b/.test(text));
    void expect(afterRerun).toMatch(new RegExp(`"processed":\\s*${messageCount}\\b`));
    void expect(afterRerun).toMatch(/"cursors":\s*1\b/);
  },
};
