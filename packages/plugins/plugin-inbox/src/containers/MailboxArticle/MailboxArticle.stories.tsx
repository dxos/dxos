//
// Copyright 2025 DXOS.org
//

import { useAtomSet } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapability, useOptionalCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Blob, Database, Feed, Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as ProgressPlugin from '@dxos/plugin-progress/ProgressPlugin';
import { SAMPLE_MESSAGES, corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes, useSelection } from '@dxos/react-ui-attention';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Loading, TestGrid, withLayout } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { InboxPlugin } from '#plugin';
import { initializeMailbox, seedSummaries } from '#testing';
import { InboxCapabilities, Mailbox } from '#types';

import * as InboxOperation from '../../types/InboxOperation';
import AttachmentArticle from '../AttachmentArticle';
import MessageArticle from '../MessageArticle';
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

/**
 * Every content block that belongs to a message — its own, plus the blocks of the annotations
 * derived from it. Summaries are `Text` blocks with `disposition: 'summary'` living on a second
 * feed, so a view that reads only `message.blocks` never shows them.
 */
const blocksJson = (message: Message.Message, annotations: readonly Message.Message[]) => [
  ...message.blocks.map((block) => ({ ...block })),
  ...annotations
    .filter((annotation) => annotation.parentMessage === message.id)
    .flatMap((annotation) => annotation.blocks.map((block) => ({ ...block, model: annotation.properties?.model }))),
];

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
  /** Attaches a real PDF blob to the first message, for the three-column `Attachments` story. */
  attachments?: boolean;
};

// A minimal but structurally valid PDF, so the third column exercises the browser's real viewer
// rather than the unsupported fallback.
const MINIMAL_PDF =
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n' +
  'trailer<</Root 1 0 R>>';

/** Attaches a PDF blob to the mailbox's first feed message. */
const seedAttachment = async (db: Database.Database, mailbox: Mailbox.Mailbox) => {
  const feed = await mailbox.feed.tryLoad();
  if (!feed) {
    return;
  }
  const [message] = await db
    .query(Query.select(Filter.type(Message.Message)).from([Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))]))
    .run();
  if (!message) {
    return;
  }
  const bytes = new TextEncoder().encode(MINIMAL_PDF);
  const blob = db.add(Blob.make({ type: 'application/pdf', size: bytes.byteLength, data: Blob.inlineData(bytes) }));
  // Feed messages are immutable, so the attachment is recorded on the space-side object the query
  // returned; that is the same instance the article renders.
  Obj.update(message, (message) => {
    message.attachments = [{ name: 'invoice.pdf', ref: Ref.make(blob) }];
  });
  await db.flush({ indexes: true });
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

  // Clicking a row dispatches `LayoutOperation.Select` against the article's `attendableId`, so
  // reading the same id here follows the list's selection without the story owning any state.
  const selectedId = useSelection(ATTENDABLE_ID, 'single');
  // Marks the article's cell as the attended surface, so its selection and keyboard navigation are live.
  const attentionAttributes = useAttentionAttributes(ATTENDABLE_ID);
  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(
    space?.db,
    feed
      ? Query.select(Filter.type(Message.Message)).from([Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))])
      : Query.select(Filter.nothing()),
  );
  const selected = messages.find((message) => message.id === selectedId);

  // Summaries are immutable annotations on a second feed, keyed by `parentMessage` — shown here
  // because they are not on the message and would otherwise be invisible in this story.
  // TODO(wittjosiah): This additional hook call shouldn't be necessary, useResolveRef should handle this case.
  useObject(mailbox, 'annotations');
  const annotationsFeed = useResolveRef(mailbox?.annotations);
  const annotations = useQuery(
    space?.db,
    annotationsFeed
      ? Query.select(Filter.type(Message.Message)).from([
          Scope.feed(Obj.getURI(annotationsFeed, { prefer: 'absolute' })),
        ])
      : Query.select(Filter.nothing()),
  );
  const summary = useMemo(
    () => (selected ? Mailbox.summaryIndex(annotations).get(selected.id) : undefined),
    [annotations, selected],
  );

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  return (
    <TestGrid.Root>
      <TestGrid.Stack>
        <TestGrid.Panel {...attentionAttributes}>
          {progress && <ProgressProbe mailbox={mailbox} />}
          <MailboxArticle role='article' subject={mailbox} attendableId={ATTENDABLE_ID} />
        </TestGrid.Panel>
        {selected && (
          <TestGrid.Stack orientation='vertical'>
            <TestGrid.Panel className='overflow-auto'>
              {summary && (
                <div className='p-2 text-sm text-description' data-testid='message-summary'>
                  {summary}
                </div>
              )}
              <JsonHighlighter data={selected} />
            </TestGrid.Panel>
            <TestGrid.Panel className='overflow-auto p-2 text-sm'>
              <JsonHighlighter data={blocksJson(selected, annotations)} />
            </TestGrid.Panel>
          </TestGrid.Stack>
        )}
      </TestGrid.Stack>
    </TestGrid.Root>
  );
};

/**
 * Mailbox → Message → Attachment, the three planks the deck shows when a reader drills from the list
 * into a message and then into one of its attachments. Selecting a row drives column two; clicking an
 * attachment chip in that message drives column three.
 */
const ThreeColumnStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const mailbox = useQuery(space?.db, Filter.type(Mailbox.Mailbox))[0];
  const selectedId = useSelection(ATTENDABLE_ID, 'single');
  const attentionAttributes = useAttentionAttributes(ATTENDABLE_ID);
  const [attachment, setAttachment] = useState<{ message: Message.Message; index: number }>();

  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(
    space?.db,
    feed
      ? Query.select(Filter.type(Message.Message)).from([Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))])
      : Query.select(Filter.nothing()),
  ) as Message.Message[];
  const selected = messages.find((message) => message.id === selectedId);

  const handleOpenAttachment = useCallback(
    (message: Mailbox.MessageLike, index: number) => setAttachment({ message: message as Message.Message, index }),
    [],
  );

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  return (
    <TestGrid.Root>
      <TestGrid.Stack>
        <TestGrid.Panel {...attentionAttributes}>
          <MailboxArticle role='article' subject={mailbox} attendableId={ATTENDABLE_ID} />
        </TestGrid.Panel>
        {selected && (
          <TestGrid.Panel>
            <MessageArticle
              role='article'
              subject={selected}
              mailbox={mailbox}
              attendableId={`${ATTENDABLE_ID}/message`}
              onOpenAttachment={handleOpenAttachment}
            />
          </TestGrid.Panel>
        )}
        {attachment && (
          <TestGrid.Panel>
            <AttachmentArticle
              role='article'
              subject={attachment.message}
              attachmentIndex={attachment.index}
              attendableId={`${ATTENDABLE_ID}/attachment`}
            />
          </TestGrid.Panel>
        )}
      </TestGrid.Stack>
    </TestGrid.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/containers/MailboxArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(
      ({ args: { count = 0, threads = 10, seedSearchTerm = false, bound = false, attachments = false } }) => ({
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
                  if (attachments) {
                    yield* Effect.promise(() => seedAttachment(defaultSpace.db, mailbox));
                  }
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
                yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
              }),
          }),

          StorybookPlugin.make({}),
          ProgressPlugin.make(),
          InboxPlugin(),
          PreviewPlugin.make(),
          MockDeckOperationsPlugin(),
        ],
      }),
    ),
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

/**
 * The deck's three planks side by side: pick a row to fill the message column, then click that
 * message's attachment chip to fill the attachment column. Seeded with a real PDF blob, so the third
 * column exercises the browser's viewer rather than the unsupported fallback.
 */
export const Attachments: StoryObj<typeof ThreeColumnStory> = {
  render: ThreeColumnStory,
  args: { count: 10, conversations: false, attachments: true },
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
