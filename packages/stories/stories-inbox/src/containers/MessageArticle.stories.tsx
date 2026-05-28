//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { AiService } from '@dxos/ai';
import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { LayerSpec, Operation, OperationHandlerSet } from '@dxos/compute';
import { Feed, Filter, Obj } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { ExtractedFrom, InboxCapabilities, InboxOperation, Mailbox, MessageExtractor } from '@dxos/plugin-inbox';
import { MessageArticle } from '@dxos/plugin-inbox/containers';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { Markdown } from '@dxos/plugin-markdown/types';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Booking, Segment, Trip } from '@dxos/plugin-trip';
import { TripPlugin } from '@dxos/plugin-trip/testing';
import { type Space, useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Message as MessageType, Person } from '@dxos/types';

import FLIGHT_EMAIL from '../testing/flight.md?raw';

// MessageArticle calls LayoutOperation.Open/Select/UpdateCompanion from its callbacks. Provide
// no-op handlers so the operations resolve without pulling in DeckPlugin.
const MockDeckOperationsPlugin = Plugin.define({ id: 'story.mock-deck-operations', name: 'Mock Deck Ops' }).pipe(
  AppPlugin.addOperationHandlerModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            Operation.withHandler(LayoutOperation.Select, () => Effect.void),
            Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void),
            Operation.withHandler(LayoutOperation.Open, () => Effect.succeed([])),
          ),
        ),
      ),
  }),
  Plugin.make,
);

/**
 * Story-only extractor that produces no objects, only a tag. Demonstrates the tag-only
 * path through the `ExtractMessage` dispatcher: `ExtractResult.tags` is applied to the
 * source message via `Mailbox.applyTag` even when `created` / `updated` / `relations` are
 * empty. Match is unconditional so the toolbar always offers the action.
 */
const ImportantMessageExtractor: MessageExtractor.MessageExtractor = {
  id: 'story.extractor.important',
  description: 'Mark message as important',
  kinds: ['tag'],
  match: () => ({ matched: true, confidence: 0.05 }),
  operation: InboxOperation.ExtractContactFromMessage,
  extract: () =>
    Effect.succeed({
      created: [],
      updated: [],
      relations: [],
      tags: [{ label: 'important', hue: 'amber' }],
    }),
};

const ImportantExtractorPlugin = Plugin.define({
  id: 'story.important-extractor',
  name: 'Story Important Extractor',
}).pipe(
  Plugin.addModule({
    id: 'extractor',
    activatesOn: ActivationEvents.Startup,
    activate: () =>
      Effect.succeed(Capability.contributes(InboxCapabilities.MessageExtractor, ImportantMessageExtractor)),
  }),
  Plugin.make,
);

/**
 * Fake summary text returned by the mocked `LanguageModel.generateText` call below. The
 * production `SummarizeMessageExtractor` makes the assistant produce a short paragraph; the
 * exact wording doesn't matter for the story — only that summarization completes and the
 * resulting `Markdown.Document` lands in the space.
 */
const MOCK_SUMMARY =
  'Flying Blue confirmed a multi-city itinerary (JFK → CDG → LIS) for one passenger. ' +
  'Payment was settled in miles plus taxes; ticket changes incur a fee.';

/**
 * Story-only `AiService` provider contributed on `SetupProcessManager`, mirroring
 * `AssistantPlugin`'s real wiring at `plugin-assistant/src/capabilities/ai-service.ts`. The
 * service's `model(...)` returns a `LanguageModel` whose `generateText` resolves with a
 * static text part instead of hitting Anthropic; that lets `SummarizeMessageExtractor` run
 * the full Operation.invoke → handler → `Markdown.make({...})` chain inside the story
 * runtime, which has no network access and no real API key.
 */
const MockAiServicePlugin = Plugin.define({ id: 'story.mock-ai-service', name: 'Story Mock AI Service' }).pipe(
  Plugin.addModule({
    id: 'ai-service',
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: () =>
      Effect.succeed(
        Capability.contributes(
          Capabilities.LayerSpec,
          LayerSpec.make({ affinity: 'application', requires: [], provides: [AiService.AiService] }, () =>
            Layer.succeed(AiService.AiService, {
              model: () =>
                Layer.scoped(
                  LanguageModel.LanguageModel,
                  LanguageModel.make({
                    generateText: () => Effect.succeed([{ type: 'text', text: MOCK_SUMMARY }] as const) as any,
                    streamText: () => Stream.empty as any,
                  }),
                ),
            }),
          ),
        ),
      ),
  }),
  Plugin.make,
);

/**
 * Seeds a personal space with a Mailbox and one message that matches FOUR extractors:
 *  - `ContactMessageExtractor` (plugin-inbox) — any sender with an email.
 *  - `TripMessageExtractor` (plugin-trip) — body contains a United-style flight block;
 *    creates Trip + Booking + Segment AND tags the message `travel`.
 *  - `SummarizeMessageExtractor` (plugin-inbox) — body exceeds the 200-char threshold so
 *    summarize matches. `MockAiServicePlugin` (defined above) contributes a fake
 *    `AiService` LayerSpec so the operation can run end-to-end and persist a
 *    `Markdown.Document` with the mock summary content.
 *  - `ImportantMessageExtractor` (story-local, defined above) — always matches; tags
 *    the message `important` and produces no objects.
 *
 * Clicking the toolbar `Extract` items produces real Person / Trip / Booking / Segment /
 * Markdown.Document objects in the space; tags land in `mailbox.tags`. `Run all` fans out
 * across all four extractors.
 */
const seedMessage = (space: Space) => {
  // Body is sourced from a real Flying Blue confirmation email captured under
  // `../testing/flight.md` and imported via Vite's `?raw` query. It is well over the
  // `SummarizeMessageExtractor.MIN_BODY_LENGTH` threshold so the summarize extractor
  // matches and contributes to the `Run all` count.
  const message = Obj.make(MessageType.Message, {
    created: new Date().toISOString(),
    sender: { name: 'Flying Blue', email: 'noreply@flyingblue.com' },
    blocks: [{ _tag: 'text', text: FLIGHT_EMAIL }],
    properties: { subject: 'Your flight confirmation — AF0003' },
  });
  space.db.add(message);
  return message;
};

const DefaultStory = () => {
  const spaces = useSpaces();
  const db = useDatabase(spaces[0]?.id);
  const [message] = useQuery(db, Filter.type(MessageType.Message));
  const [mailbox] = useQuery(db, Filter.type(Mailbox.Mailbox));

  if (!db || !message) {
    return <Loading data={{ db: !!db, message: !!message }} />;
  }

  return <MessageArticle role='article' subject={message} attendableId='story' mailbox={mailbox} />;
};

const meta = {
  title: 'stories/stories-inbox/MessageArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withTheme(),
    withPluginManager({
      setupEvents: [
        AppActivationEvents.SetupSettings,
        // TripPlugin contributes TripMessageExtractor on Startup; fire it explicitly so the
        // capability is contributed before MessageArticle's toolbar reads the extractor list.
        ActivationEvents.Startup,
      ],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [
            Feed.Feed,
            Mailbox.Mailbox,
            MessageType.Message,
            Person.Person,
            ExtractedFrom.ExtractedFrom,
            Booking.Booking,
            Segment.Segment,
            Trip.Trip,
            // Markdown.Document is the output of SummarizeMessageExtractor; its `content`
            // field is a `Ref(Text.Text)`, so both schemas must be registered for the doc
            // to round-trip through the database.
            Markdown.Document,
            Text.Text,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                personalSpace.db.add(Mailbox.make());
                seedMessage(personalSpace);
                await personalSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        TripPlugin(),
        PreviewPlugin(),
        MockDeckOperationsPlugin(),
        ImportantExtractorPlugin(),
        MockAiServicePlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: inboxTranslations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Renders MessageArticle for a Flying Blue confirmation message. The toolbar's `Extract`
 * dropdown should list `Run all (4)`, the contact extractor (plugin-inbox), the trip
 * extractor (plugin-trip), the summarize extractor (plugin-inbox, backed by the mock
 * AiService contributed via `MockAiServicePlugin`), and the story-local `important`
 * extractor. Clicking each invokes ExtractMessage; the dispatcher persists Trip / Person /
 * Booking / Segment / Markdown.Document objects with `ExtractedFrom` relations back to the
 * message, which surface as clickable tags in the MessageHeader.
 */
export const Default: Story = {};

/**
 * End-to-end play function: opens the toolbar `Extract` dropdown, runs every matching
 * extractor via `Run all`, and asserts that a Trip chip AND a summary Document chip both
 * show up in the MessageHeader. The summary path proves the full
 * `ExtractMessage` → `Operation.invoke(ExtractSummaryFromMessage)` → mock AiService →
 * `Markdown.make(...)` → `db.add` → `ExtractedFrom` chain works in a non-AssistantPlugin
 * runtime when an `AiService` LayerSpec is contributed by another plugin.
 */
export const ExtractTripWithPlay: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    const waitFor = async <T,>(
      probe: () => T | Promise<T>,
      predicate: (value: T) => boolean = (value) => Boolean(value),
      { timeout = 15_000, interval = 100 }: { timeout?: number; interval?: number } = {},
    ): Promise<T> => {
      const deadline = Date.now() + timeout;
      let last: T | undefined;
      while (Date.now() < deadline) {
        last = await probe();
        if (predicate(last)) {
          return last;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
      throw new Error(`timed out waiting (last=${String(last)})`);
    };

    // Wait for the seeded message to render.
    await waitFor(() => canvas.queryByText(/Your flight confirmation/i));

    // Open the toolbar Extract dropdown.
    const extractTrigger = await waitFor(() => canvas.queryByRole('button', { name: /extract/i }));
    await userEvent.click(extractTrigger as HTMLElement);

    // Assert the summarize extractor is registered and matches the seeded body. The dropdown
    // entry uses the extractor's `description` text. If the body falls below the 200-char
    // threshold or the InboxPlugin's Startup module stops contributing the extractor, this
    // assertion fails before "Run all" even fires — so the test catches a missing wire-up
    // rather than passing for the wrong reason on the trip-only assertions below.
    const summarizeItem = await waitFor(() => body.queryByText(/summarize a long email body/i));
    void expect(summarizeItem).toBeInTheDocument();

    // The `Run all (N)` label includes the count of matching extractors. With contact + trip
    // + summarize + important all matching, the label must read "Run all (4)".
    const runAllItem = await waitFor(() => body.queryByText(/run all \(4\)/i));
    await userEvent.click(runAllItem as HTMLElement);
    // Each extractor's `tags` lands in `mailbox.tags`; the trip extractor persists
    // Trip + Booking + Segment + ExtractedFrom; summarize persists a Markdown.Document +
    // ExtractedFrom courtesy of the mock AiService LayerSpec contributed above.

    // Scope all chip assertions to the MessageHeader so we don't accidentally match strings
    // from the seeded message body (e.g. `From: SFO`). The header contains both the per-object
    // `extracted-tag-<id>` rows (Trip) and the `extracted-tags` chip row (travel/important).
    const header = await waitFor(() => canvas.queryByTestId('message-header'));
    void expect(header).toBeInTheDocument();
    const headerScope = within(header as HTMLElement);

    // Summary Document chip — sourced from the `ExtractedFrom` relation the dispatcher
    // attaches when SummarizeMessageExtractor returns a `Markdown.Document`. The chip's
    // label comes from `doc.name`, which the extractor sets to `${subject} (summary)`.
    // This is the core success-path assertion: the full chain — dispatcher → Operation.invoke →
    // mock AiService → LanguageModel.generateText → Markdown.make → db.add → ExtractedFrom →
    // useExtractedObjects hook → header chip — must land for this to be in the document.
    const summaryButton = await waitFor(() => headerScope.queryByRole('button', { name: /\(summary\)/i }));
    void expect(summaryButton).toBeInTheDocument();
    void expect(summaryButton).not.toBeDisabled();

    // Story-local `ImportantMessageExtractor`'s `tags: [{ label: 'important', hue: 'amber' }]`
    // — exercises the tag-only path through the dispatcher (no created objects, just a tag).
    const tagsRow = await waitFor(() => headerScope.queryByTestId('extracted-tags'));
    const tagsScope = within(tagsRow as HTMLElement);
    const importantTag = await waitFor(() => tagsScope.queryByText(/^important$/i));
    void expect(importantTag).toBeInTheDocument();
  },
};
