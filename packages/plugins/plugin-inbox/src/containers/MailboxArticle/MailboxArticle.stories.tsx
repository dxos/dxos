//
// Copyright 2025 DXOS.org
//

import { useAtomSet } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import React, { useEffect } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapability } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { AccessToken, Cursor } from '@dxos/link';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { Connection } from '@dxos/plugin-connector';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { SAMPLE_MESSAGES, StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { initializeMailbox } from '#testing';
import { InboxCapabilities, Mailbox } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { MailboxArticle } from './MailboxArticle';

// No-op handlers for layout operations invoked from article components; avoids pulling in DeckPlugin.
const MockDeckOperationsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.mockDeckOperations'),
    name: 'Mock Deck Ops',
  }),
).pipe(
  AppPlugin.addOperationHandlerModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            Operation.withHandler(LayoutOperation.Select, () => Effect.void),
            Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void),
          ),
        ),
      ),
  }),
  Plugin.make,
);

/** Real term repeated across several `SAMPLE_MESSAGES` entries; used by `SearchFilter`'s play test. */
const SEARCH_TERM = 'invoice';

/**
 * Term seeded ONLY inside a `text/html` block (never in plain/markdown text or the subject) — used by
 * `SearchFilter`'s play test to confirm a match found solely in raw HTML markup is excluded from the
 * mailbox's search results.
 */
const HTML_ONLY_TERM = 'htmlonlyterm';

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

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  return <MailboxArticle role='article' subject={mailbox} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-inbox/containers/MailboxArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager<StoryArgs>(({ args: { count = 0, threads = 10, seedSearchTerm = false, bound = false } }) => ({
      setupEvents: [AppActivationEvents.SetupSettings],
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
              const { personalSpace } = yield* initializeIdentity(client);
              if (seedSearchTerm) {
                // Seed the realistic shared corpus (not the lorem builder) so the `SearchFilter` play
                // test exercises full-text search over real, topic-coherent message bodies.
                const mailbox = personalSpace.db.add(Mailbox.make());
                const feed = yield* Effect.promise(() => mailbox.feed?.tryLoad());
                if (feed) {
                  // Synced mail always carries a `threadId` (the mappers default a threadless message to
                  // its own id via `ensureThreadId`); mirror that here so standalone messages seed as
                  // thread-of-one, matching production.
                  const messages = SAMPLE_MESSAGES.map(({ from, subject, body, threadId, daysAgo }) =>
                    Message.ensureThreadId(
                      Message.make({
                        created: subDays(new Date(), daysAgo ?? 0).toISOString(),
                        sender: { email: from.email, name: from.name },
                        blocks: [{ _tag: 'text', text: body }],
                        properties: { subject, snippet: body.slice(0, 120) },
                        ...(threadId ? { threadId } : {}),
                      }),
                    ),
                  );
                  // A message whose ONLY occurrence of `HTML_ONLY_TERM` is inside a `text/html` block —
                  // absent from the plain/markdown body and the subject — so a search for that term must
                  // yield no matching card (bugs 2 & 3: HTML-only matches must not surface or blank-render).
                  const htmlOnlyMessage = Message.ensureThreadId(
                    Message.make({
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
                    }),
                  );
                  yield* Feed.append(feed, [...messages, htmlOnlyMessage]).pipe(
                    Effect.provide(Database.layer(personalSpace.db)),
                  );
                }
              } else {
                const mailbox = yield* Effect.promise(() => initializeMailbox(personalSpace.db, count, threads));
                if (bound) {
                  const accessToken = personalSpace.db.add(
                    AccessToken.make({ source: 'imap.example.com', account: 'user@example.com', token: 'story-token' }),
                  );
                  const connection = personalSpace.db.add(
                    Connection.make({ name: 'Story Mail', accessToken: Ref.make(accessToken) }),
                  );
                  personalSpace.db.add(
                    Cursor.makeExternal({ source: connection.accessToken, target: Ref.make(mailbox) }),
                  );
                }
              }
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
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

// Both variants force the setting explicitly: the settings store persists across runs, so an
// omitted value would inherit whatever a prior session wrote rather than the product default.
export const Default: Story = {
  args: {
    count: 500,
  },
};

// TODO(wittjosiah): Remove? Conversation grouping is on by default now, so `Default` already covers
// it — this exists only to exercise the flat/ungrouped fallback (`conversations: false`).
export const Flat: Story = {
  args: {
    count: 500,
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
      () => {
        const matchedCount = getTileCount();
        expect(matchedCount).toBeGreaterThan(0);
        expect(matchedCount).toBeLessThan(initialCount);
      },
      { timeout: 5_000 },
    );
  },
};
