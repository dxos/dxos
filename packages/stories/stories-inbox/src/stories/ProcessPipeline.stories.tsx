//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapabilities } from '@dxos/app-framework/ui';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { seedDemoMessages } from '../testing';

/** Adds a Mailbox with the shared demo messages on its feed. */
const seed = async (space: Space) => {
  const mailbox = space.db.add(Mailbox.make({ name: 'Inbox' }));
  await space.db.flush();
  const feed = await mailbox.feed.load();
  await EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
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
  const cursors = useQuery(space?.db, Filter.type(Cursor.Cursor));
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);
  const [runs, setRuns] = useState(0);
  const [last, setLast] = useState<unknown>();

  const handleRun = async () => {
    if (!space?.db || !invoker || !mailbox) {
      return;
    }

    const result = await invoker
      .invokePromise(InboxOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) }, { spaceId: space.id })
      .catch((err) => {
        log.warn('process mailbox failed', { err });
        return undefined;
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
        return undefined;
      });
    setLast(result);
    setRuns((count) => count + 1);
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
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content data-testid='counts' classNames='dx-container overflow-auto p-2 text-sm'>
        <JsonHighlighter
          data={{
            runs,
            mailbox: mailbox ? 1 : 0,
            cursors: cursors.length,
            cursorMax: Cursor.parseKey(cursors[0]?.max),
            last,
          }}
        />
      </Panel.Content>
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
      ],
    }),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The cursored log-title pipeline over a fixture mailbox: the first run processes every demo
 * message and creates the tagged feed cursor; a rerun processes nothing (strictly-greater skip);
 * reset clears the cursor (reusing the object) so the next run re-processes the whole feed.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const waitFor = async (
      predicate: (text: string) => boolean,
      { timeout = 15_000, interval = 100 }: { timeout?: number; interval?: number } = {},
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

    // Wait for the seeded mailbox to load.
    await waitFor((text) => /"mailbox":\s*1\b/.test(text));

    // First pass: every demo message is processed and the tagged cursor is created + advanced.
    await userEvent.click(canvas.getByTestId('process'));
    const afterFirst = await waitFor((text) => /"runs":\s*1\b/.test(text));
    void expect(afterFirst).toMatch(/"processed":\s*3\b/);
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
    void expect(afterRerun).toMatch(/"processed":\s*3\b/);
    void expect(afterRerun).toMatch(/"cursors":\s*1\b/);
  },
};
