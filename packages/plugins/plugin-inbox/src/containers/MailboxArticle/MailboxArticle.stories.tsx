//
// Copyright 2025 DXOS.org
//

import { useAtomSet } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import React, { useEffect } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { useCapability, useOptionalCapability } from '@dxos/app-framework/Hooks';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as ProgressPlugin from '@dxos/plugin-progress/ProgressPlugin';
import { SAMPLE_MESSAGES, corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { InboxPlugin } from '#plugin';
import { initializeMailbox, seedSummaries } from '#testing';
import { InboxCapabilities, Mailbox } from '#types';

import * as InboxOperation from '../../types/InboxOperation.ts';
import { MailboxArticle } from './MailboxArticle.tsx';

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
        OperationHandlerSet.make(Operation.withHandler(LayoutOperation.Open, () => Effect.succeed([]))),
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

type StoryArgs = {
  /** Number of messages to seed. */
  count?: number;
  /** Size of the thread-id pool messages are randomly assigned to (fewer → larger conversations). */
  threads?: number;
  /** Force conversation grouping on/off; when omitted, the persisted/product-default value applies. */
  conversations?: boolean;
  /** Seed the realistic `SAMPLE_MESSAGES` corpus instead of the lorem builder, for the `SearchFilter` play test. */
  seedSearchTerm?: boolean;
  /** Seeds a sync binding (AccessToken → Connection → Cursor) so `InitializeMailbox` shows "No messages" instead of "No connections configured". */
  bound?: boolean;
  /** Registers a running `#analyze` monitor so the statusbar progress meter renders (see `ProgressProbe`). */
  progress?: boolean;
};

/**
 * Registers a running monitor under the mailbox's `#analyze` progress key, exactly as the analyze
 * cascade's trace status does — so the article's statusbar meter is exercised WITHOUT an LLM or a
 * scheduled process. The producer/consumer key derivation is the thing under test: both sides call
 * `createAnalyzeProgressKey` on their own copy of the mailbox.
 */
const ProgressProbe = ({ mailbox }: { mailbox: Mailbox.Mailbox }) => {
  const registry = useOptionalCapability(AppCapabilities.ProgressRegistry);
  useEffect(() => {
    if (!registry) {
      return;
    }
    const handle = registry.register(InboxOperation.createAnalyzeProgressKey(mailbox), { label: 'Analyzing' });
    handle.total(10);
    handle.set(3);
    return () => handle.remove();
  }, [registry, mailbox]);
  return null;
};

/**
 * The mailbox article alone; the multi-panel views (selected-message JSON, the message and attachment
 * planks) live in `@dxos/stories-inbox`'s `MailboxArticle` stories.
 */
const DefaultStory = ({ conversations, progress }: StoryArgs) => {
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

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  // Attendable so the article's selection and keyboard navigation are live.
  return (
    <AttendableContainer id={ATTENDABLE_ID} classNames='dx-expand overflow-hidden'>
      {progress && <ProgressProbe mailbox={mailbox} />}
      <MailboxArticle role='article' subject={mailbox} attendableId={ATTENDABLE_ID} />
    </AttendableContainer>
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
        ClientPlugin.make({
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
                  // Half the messages carry a derived summary, so the annotation merge is exercised
                  // against a realistic mix rather than an all-or-nothing one.
                  yield* Effect.promise(() => seedSummaries(defaultSpace.db, mailbox));
                }
              } else {
                const mailbox = yield* Effect.promise(() => initializeMailbox(defaultSpace.db, count, threads));
                yield* Effect.promise(() => seedSummaries(defaultSpace.db, mailbox));
                if (bound) {
                  const accessToken = defaultSpace.db.add(
                    AccessToken.make({
                      source: 'imap.example.com',
                      account: 'user@example.com',
                      token: 'story-token',
                    }),
                  );
                  const connection = defaultSpace.db.add(
                    Connection.make({ name: 'Story Mail', accessToken: Ref.make(accessToken) }),
                  );
                  defaultSpace.db.add(
                    Cursor.makeExternal({ source: connection.accessToken, target: Ref.make(mailbox) }),
                  );
                }
              }
              // The search story matches the full-text index, which lags the indexing pass until a flush drains it.
              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true, secondaryIndexes: true }));
            }),
        }),

        StorybookPlugin.make({}),
        ProgressPlugin.make(),
        InboxPlugin(),
        PreviewPlugin.make(),
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
    conversations: true,
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

// The statusbar progress meter, which the analyze cascade and mail sync drive through the
// progress registry. Both sides key the monitor by the mailbox URI, derived independently — the bug
// this guards is a key that differs between producer and consumer, which leaves the run invisible.
export const Progress: Story = {
  args: {
    count: 10,
    progress: true,
  },
  play: async ({ canvasElement }) => {
    const meter = await waitFor(
      () => {
        const found = canvasElement.querySelector('[role="progressbar"]');
        if (!found) {
          throw new Error('Progress meter not rendered.');
        }
        return found;
      },
      { timeout: 12_000 },
    );
    await expect(meter).toBeInTheDocument();
  },
};

// Regression guard for "the mailbox only ever shows one page": the list is a windowed
// `usePagination` query (10 items) and the virtualizer must request the next page as its loaded edge
// nears the viewport.
export const Paging: Story = {
  args: {
    count: 50,
    conversations: false,
  },
  play: async ({ canvasElement }) => {
    const getTileCount = () => canvasElement.querySelectorAll('[data-object-id]').length;
    await waitFor(() => expect(getTileCount()).toBeGreaterThan(0), { timeout: 12_000 });
    const firstPage = getTileCount();

    // The list's scroll container is the `ScrollArea.Viewport` — the tallest scrollable element on
    // the canvas (it is not a Radix viewport, so there is no data attribute to match).
    const viewport = [...canvasElement.querySelectorAll<HTMLElement>('*')]
      .filter((element) => element.scrollHeight > element.clientHeight + 8 && element.clientHeight > 200)
      .at(0);
    if (!viewport) {
      throw new Error('Mailbox scroll viewport not found.');
    }

    // Scroll to the loaded end, which is what arms the virtualizer's next-page trigger.
    for (let attempt = 0; attempt < 8; attempt++) {
      viewport.scrollTop = viewport.scrollHeight;
      viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (getTileCount() > firstPage) {
        break;
      }
    }

    await expect(getTileCount()).toBeGreaterThan(firstPage);
  },
};

// KNOWN GAP — renders an EMPTY list, deliberately: `threads: 0` seeds messages with no `threadId`
// (as drafts, transcriptions and assistant-authored messages are), and `buildThreadSemiJoin`'s
// `threadId IN (SELECT threadId FROM <matches>)` can never match a message that has none, so they
// never reach the list in either mode. The conversation grouping downstream is already fixed (its
// key falls back to the message id, giving each its own row); this story turns green — 20 rows — the
// moment the semi-join also admits directly-matching threadless messages.
export const GroupedWithoutThreads: Story = {
  args: {
    count: 20,
    conversations: true,
    threads: 0,
  },
};

export const PagingGrouped: Story = {
  args: {
    count: 50,
    conversations: true,
    threads: 12,
  },
  play: async ({ canvasElement }) => {
    const getTileCount = () => canvasElement.querySelectorAll('[data-object-id]').length;
    await waitFor(() => expect(getTileCount()).toBeGreaterThan(0), { timeout: 12_000 });
    const firstPage = getTileCount();

    // The list's scroll container is the `ScrollArea.Viewport` — the tallest scrollable element on
    // the canvas (it is not a Radix viewport, so there is no data attribute to match).
    const viewport = [...canvasElement.querySelectorAll<HTMLElement>('*')]
      .filter((element) => element.scrollHeight > element.clientHeight + 8 && element.clientHeight > 200)
      .at(0);
    if (!viewport) {
      throw new Error('Mailbox scroll viewport not found.');
    }

    // Scroll to the loaded end, which is what arms the virtualizer's next-page trigger.
    for (let attempt = 0; attempt < 8; attempt++) {
      viewport.scrollTop = viewport.scrollHeight;
      viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (getTileCount() > firstPage) {
        break;
      }
    }

    await expect(getTileCount()).toBeGreaterThan(firstPage);
  },
};
