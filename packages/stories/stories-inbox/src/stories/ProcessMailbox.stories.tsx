//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapabilities } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { CrmPlugin } from '@dxos/plugin-crm/plugin';
import { CrmOperation, ProfileOf } from '@dxos/plugin-crm/types';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { Markdown } from '@dxos/plugin-markdown/types';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { TagIndex, Text } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

import { seedDemoMessages } from '../testing';

/**
 * Organizations for the demo senders' domains: the extraction gate is an allow-list, so a sender
 * earns a Person only when its domain matches a known Organization.
 */
const DEMO_ORGANIZATIONS = [
  { name: 'Sequoia Capital', website: 'https://sequoia.com' },
  { name: 'Globex Corporation', website: 'https://globex.com' },
  { name: 'Initech', website: 'https://initech.com' },
];

/** Adds a Mailbox with the shared demo messages on its feed, plus the gate Organizations. */
const seed = async (space: Space) => {
  const mailbox = space.db.add(Mailbox.make({ name: 'Inbox' }));
  await space.db.flush();
  const feed = await mailbox.feed.load();
  await EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
  DEMO_ORGANIZATIONS.forEach((organization) => space.db.add(Obj.make(Organization.Organization, organization)));
  await space.db.flush({ indexes: true });
};

/**
 * Harness: seeds the shared demo mailbox fixture, runs the deterministic `ProcessMailbox` CRM
 * pipeline via the OperationInvoker (the same path the mailbox toolbar's `Process CRM` action
 * uses), and reports live counts so the play function can assert the outcome from the DOM.
 */
const DefaultStory = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const feed = mailbox?.feed?.target;
  const messages = useQuery(
    space?.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const persons = useQuery(space?.db, Filter.type(Person.Person));
  const profiles = useQuery(space?.db, Filter.type(ProfileOf.ProfileOf));
  const cursors = useQuery(space?.db, Filter.type(Cursor.Cursor));
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);
  const [runs, setRuns] = useState(0);
  const [last, setLast] = useState<unknown>();

  // Messages with a recorded Message → extracted-object association on the Mailbox.
  const linked = mailbox
    ? messages.filter((message) => Mailbox.getExtractedObjectIds(mailbox, message.id).length > 0).length
    : 0;

  const handleRun = async () => {
    if (!space?.db || !invoker || !mailbox) {
      return;
    }

    const result = await invoker
      .invokePromise(CrmOperation.ProcessMailbox, { mailbox: Ref.make(mailbox), research: true }, { spaceId: space.id })
      .catch((err) => {
        log.warn('process mailbox failed', { err });
        return undefined;
      });
    setLast(result);
    setRuns((count) => count + 1);
  };

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button
            data-testid='process'
            disabled={!invoker || messages.length === 0}
            onClick={() => void handleRun()}
          >
            Run
          </Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content data-testid='counts' className='dx-container overflow-auto p-2 text-sm'>
        <JsonHighlighter
          data={{
            runs,
            messages: messages.length,
            persons: persons.length,
            profiles: profiles.length,
            cursors: cursors.length,
            linked,
            last,
          }}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'stories/stories-inbox/ProcessMailbox',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings, ActivationEvents.Startup],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [
            Feed.Feed,
            Mailbox.Mailbox,
            TagIndex.TagIndex,
            Message.Message,
            Person.Person,
            Organization.Organization,
            Cursor.Cursor,
            Markdown.Document,
            Text.Text,
            ProfileOf.ProfileOf,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => seed(personalSpace));
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        MarkdownPlugin(),
        CrmPlugin(),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The deterministic CRM pipeline over a fixture mailbox: every demo sender is at a known
 * Organization, so one run creates one Person (org-linked) and one Profile per sender, records
 * provenance on the Mailbox, and advances a durable feed cursor. A second run is an idempotent
 * catch-up that creates nothing.
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

    // Wait for the three demo messages to load.
    await waitFor((text) => /"messages":\s*3\b/.test(text));

    // First pass: one Person + one Profile per demo sender, all provenance recorded, cursor created.
    await userEvent.click(canvas.getByTestId('process'));
    const afterFirst = await waitFor((text) => /"runs":\s*1\b/.test(text));
    void expect(afterFirst).toMatch(/"persons":\s*3\b/);
    void expect(afterFirst).toMatch(/"profiles":\s*3\b/);
    void expect(afterFirst).toMatch(/"linked":\s*3\b/);
    void expect(afterFirst).toMatch(/"cursors":\s*1\b/);
    void expect(afterFirst).toMatch(/"contacts":\s*3\b/);

    // Second pass: idempotent catch-up — nothing new is created.
    await userEvent.click(canvas.getByTestId('process'));
    const afterSecond = await waitFor((text) => /"runs":\s*2\b/.test(text));
    void expect(afterSecond).toMatch(/"persons":\s*3\b/);
    void expect(afterSecond).toMatch(/"profiles":\s*3\b/);
    void expect(afterSecond).toMatch(/"contacts":\s*0\b/);
  },
};
