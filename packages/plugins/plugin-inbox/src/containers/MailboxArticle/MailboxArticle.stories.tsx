//
// Copyright 2025 DXOS.org
//

import { useAtomSet } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapability } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Feed, Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { SAMPLE_MESSAGES, StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Loading, TestGrid, withLayout } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { initializeMailbox } from '#testing';

import { InboxPlugin } from '../../InboxPlugin';
import * as InboxCapabilities from '../../types/InboxCapabilities';
import * as Mailbox from '../../types/Mailbox';
import { MailboxArticle } from './MailboxArticle';

// No-op handler for the one layout operation the article invokes that belongs to DeckPlugin, which
// this story does not install. `Select` is deliberately NOT stubbed: it belongs to AttentionPlugin
// (already in `corePlugins`), and a no-op here would swallow the selection the article publishes —
// leaving `useSelection` empty and every selection-driven surface dead.
const MockDeckOperations = Capability.inlineModule(
  'operation-handler',
  { provides: [Capabilities.OperationHandler] },
  () =>
    Effect.succeed([
      Capability.contribute(
        Capabilities.OperationHandler,
        OperationHandlerSet.make(Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void)),
      ),
    ]),
);

const MockDeckOperationsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.mockDeckOperations'),
    name: 'Mock Deck Ops',
  }),
).pipe(Plugin.addModule(MockDeckOperations), Plugin.make);

/** Real term repeated across several `SAMPLE_MESSAGES` entries; used by `SearchFilter`'s play test. */
const SEARCH_TERM = 'invoice';

/**
 * Term seeded ONLY inside a `text/html` block (never in plain/markdown text or the subject) — used by
 * `SearchFilter`'s play test to confirm a match found solely in raw HTML markup is excluded from the
 * mailbox's search results.
 */
const HTML_ONLY_TERM = 'htmlonlyterm';

const ATTENDABLE_ID = 'story';

/** Plain projection of the selected message — the live proxy carries internals that add noise. */
const messageJson = (message: Message.Message, summary?: string) => ({
  id: message.id,
  created: message.created,
  threadId: message.threadId,
  sender: message.sender,
  properties: message.properties,
  blocks: message.blocks.map((block) =>
    block._tag === 'text'
      ? { _tag: block._tag, disposition: block.disposition, length: block.text.length }
      : { _tag: block._tag },
  ),
  summary,
});

type StoryArgs = {
  /** Number of messages to seed. */
  count?: number;
  /** Size of the thread-id pool messages are randomly assigned to (fewer → larger conversations). */
  threads?: number;
  /** Force conversation grouping on/off; when omitted, the persisted/product-default value applies. */
  conversations?: boolean;
  /** Seed the realistic `SAMPLE_MESSAGES` corpus instead of the lorem builder, for the `SearchFilter` play test. */
  seedSearchTerm?: boolean;
  /** Seeds a sync binding (AccessToken → Connection → Cursor) so `InitializeMailbox` shows "Mailbox empty" instead of "No connections configured". */
  bound?: boolean;
};

const DefaultStory = ({ conversations }: StoryArgs) => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));

  // Force the conversation-grouping setting per-variant, independent of any persisted value.
  const settingsAtom = useCapability(InboxCapabilities.Settings);
  const setSettings = useAtomSet(settingsAtom);
  useEffect(() => {
    if (conversations !== undefined) {
      setSettings((settings) => ({ ...settings, conversations }));
    }
  }, [conversations, setSettings]);

  // Clicking a row dispatches `LayoutOperation.Select` against the article's `attendableId`, so
  // reading the same id here follows the list's selection without the story owning any state.
  const selectedId = useSelection(ATTENDABLE_ID, 'single');
  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(
    space?.db,
    feed
      ? Query.select(Filter.type(Message.Message)).from([Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))])
      : Query.select(Filter.nothing()),
  );
  const selected = messages.find((message) => message.id === selectedId);

  // Summaries live on the mailbox's annotation feed keyed by `parentMessage`, so the JSON shows
  // everything known about the message rather than just the message object.
  const annotationsFeed = useResolveRef(mailbox?.annotations);
  const annotations = useQuery(
    space?.db,
    annotationsFeed
      ? Query.select(Filter.type(Message.Message)).from([
          Scope.feed(Obj.getURI(annotationsFeed, { prefer: 'absolute' })),
        ])
      : Query.select(Filter.nothing()),
  );
  const summaries = useMemo(() => Mailbox.summaryIndex(annotations), [annotations]);

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  return (
    <TestGrid.Stack>
      <TestGrid.Panel>
        <MailboxArticle role='article' subject={mailbox} attendableId={ATTENDABLE_ID} />
      </TestGrid.Panel>
      <TestGrid.Panel>
        <Panel.Root role='article'>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Toolbar.Text>{selected ? 'Selected message' : 'No selection'}</Toolbar.Text>
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content data-testid='message-json' classNames='dx-container overflow-auto p-2 text-sm'>
            {selected && <JsonHighlighter data={messageJson(selected, summaries.get(selected.id))} />}
          </Panel.Content>
        </Panel.Root>
      </TestGrid.Panel>
    </TestGrid.Stack>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/containers/MailboxArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(({ args: { count = 0, threads = 10, seedSearchTerm = false, bound = false } }) => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [
            Feed.Feed,
            Mailbox.Mailbox,
            Message.Message,
            Person.Person,
            AccessToken.AccessToken,
            Connection.Connection,
            Cursor.Cursor,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              if (seedSearchTerm) {
                // Seed the realistic shared corpus (not the lorem builder) so the `SearchFilter` play
                // test exercises full-text search over real, topic-coherent message bodies.
                const mailbox = defaultSpace.db.add(Mailbox.make());
                const feed = yield* Effect.promise(() => mailbox.feed?.tryLoad());
                if (feed) {
                  // Synced JMAP mail always carries a `threadId` (server-set, RFC 8621); mirror that here
                  // by giving standalone samples a unique thread so they seed realistically.
                  const messages = SAMPLE_MESSAGES.map(({ from, subject, body, threadId, daysAgo }, index) =>
                    Message.make({
                      created: subDays(new Date(), daysAgo ?? 0).toISOString(),
                      sender: { email: from.email, name: from.name },
                      blocks: [{ _tag: 'text', text: body }],
                      properties: { subject, snippet: body.slice(0, 120) },
                      threadId: threadId ?? `thread-of-one-${index}`,
                    }),
                  );
                  // A message whose ONLY occurrence of `HTML_ONLY_TERM` is inside a `text/html` block —
                  // absent from the plain/markdown body and the subject — so a search for that term must
                  // yield no matching card (bugs 2 & 3: HTML-only matches must not surface or blank-render).
                  const htmlOnlyMessage = Message.make({
                    created: new Date().toISOString(),
                    sender: { email: 'notifications@example.com', name: 'Notifications' },
                    blocks: [
                      { _tag: 'text', text: `<div><span>${HTML_ONLY_TERM}</span></div>`, mimeType: 'text/html' },
                      {
                        _tag: 'text',
                        text: 'This is a routine notification with no special terms.',
                        mimeType: 'text/plain',
                      },
                    ],
                    properties: {
                      subject: 'Routine notification',
                      snippet: 'This is a routine notification with no special terms.',
                    },
                    threadId: 'notification-thread',
                  });
                  yield* Feed.append(feed, [...messages, htmlOnlyMessage]).pipe(
                    Effect.provide(Database.layer(defaultSpace.db)),
                  );
                }
              } else {
                const mailbox = yield* Effect.promise(() => initializeMailbox(defaultSpace.db, count, threads));
                if (bound) {
                  const accessToken = defaultSpace.db.add(
                    AccessToken.make({ source: 'imap.example.com', account: 'user@example.com', token: 'story-token' }),
                  );
                  const connection = defaultSpace.db.add(
                    Connection.make({ name: 'Story Mail', accessToken: Ref.make(accessToken) }),
                  );
                  defaultSpace.db.add(
                    Cursor.makeExternal({ source: connection.accessToken, target: Ref.make(mailbox) }),
                  );
                }
              }
              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
            }),
        }),

        StorybookPlugin({}),
        InboxPlugin(),
        PreviewPlugin(),
        MockDeckOperationsPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    count: 50,
  },
};

export const Flat: Story = {
  args: {
    count: 50,
    conversations: false,
  },
};

export const NoConnection: Story = {
  args: {
    count: 0,
  },
};

export const Empty: Story = {
  args: {
    count: 0,
    bound: true,
  },
};

// Integration test only: proves the search box is wired to the message query so that typing narrows
// the list. The query behaviors themselves are covered headlessly — the whole-thread semi-join and
// thread-of-one retention in `mailbox-search.test.ts`, and the HTML-only exclusion (bugs 2 & 3) by the
// `messageMatchesQuery` tests in `util.test.ts` — so this story does not re-assert those variants.
export const SearchFilter: Story = {
  args: {
    conversations: true,
    seedSearchTerm: true,
  },
  play: async ({ canvasElement }) => {
    // Each rendered message/conversation tile carries `data-object-id` (set by the shared `Mosaic.Tile`
    // shell in `Tile.Root`) — the stack is virtualized and untagged with an ARIA list-item role, so this
    // attribute is the only reliable way to count rendered tiles.
    const getTileCount = () => canvasElement.querySelectorAll('[data-object-id]').length;

    // Wait for the seeded corpus to render (conversation-grouped) before recording the baseline count.
    await waitFor(() => expect(getTileCount()).toBeGreaterThan(0), { timeout: 12_000 });
    const initialCount = getTileCount();

    // The search box is a CodeMirror `QueryEditor`, not an <input>/<textarea> — it's the only editor
    // instance in the mailbox toolbar, so the first `.cm-content` on the canvas is unambiguous.
    const editor = canvasElement.querySelector('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
    if (!editor) {
      throw new Error('Mailbox search editor not found.');
    }
    await userEvent.click(editor);
    await userEvent.type(editor, SEARCH_TERM);

    // Typing the term routes through the query and narrows the list to a smaller, non-empty subset —
    // that wiring is all this story verifies.
    await waitFor(
      async () => {
        const matchedCount = getTileCount();
        await expect(matchedCount).toBeGreaterThan(0);
        await expect(matchedCount).toBeLessThan(initialCount);
      },
      { timeout: 5_000 },
    );
  },
};
