//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { Feed, Filter, Obj } from '@dxos/echo';
import { ExtractedFrom, InboxCapabilities, InboxOperation, Mailbox, MessageExtractor } from '@dxos/plugin-inbox';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { MessageArticle } from '@dxos/plugin-inbox/containers';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Booking, Segment, Trip } from '@dxos/plugin-trip';
import { TripPlugin } from '@dxos/plugin-trip/testing';
import { type Space, useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType, Person } from '@dxos/types';

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
 * Seeds a personal space with a Mailbox and one message that matches THREE extractors:
 *  - `ContactMessageExtractor` (plugin-inbox) — any sender with an email.
 *  - `TripMessageExtractor` (plugin-trip) — body contains a United-style flight block;
 *    creates Trip + Booking + Segment AND tags the message `travel`.
 *  - `ImportantMessageExtractor` (story-local, defined above) — always matches; tags
 *    the message `important` and produces no objects.
 *
 * Clicking the toolbar `Extract` items produces real Person / Trip / Booking / Segment
 * objects in the space; tags land in `mailbox.tags`. `Run all` fans out across all three.
 */
const seedMessage = (space: Space) => {
  const body = [
    'Hi there,',
    '',
    'Your flight is confirmed!',
    '',
    'Flight: UA-100',
    'From: SFO (San Francisco)',
    'To: LHR (London Heathrow)',
    'Depart: 2026-06-01 15:30',
    'Arrive: 2026-06-02 09:30',
    'Confirmation: ABC123',
    '',
    'Have a great trip.',
  ].join('\n');
  const message = Obj.make(MessageType.Message, {
    created: new Date().toISOString(),
    sender: { name: 'United Airlines', email: 'noreply@united.com' },
    blocks: [{ _tag: 'text', text: body }],
    properties: { subject: 'Your flight confirmation — UA-100' },
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
 * Renders MessageArticle for a single United-style flight-confirmation message. The toolbar's
 * `Extract` dropdown should list `Run all (2)`, the contact extractor (plugin-inbox), and the
 * trip extractor (plugin-trip). Clicking each invokes ExtractMessage; the dispatcher persists
 * Trip / Person / Booking / Segment objects with `ExtractedFrom` relations back to the message,
 * which surface as clickable tags in the MessageHeader.
 */
export const Default: Story = {};

/**
 * End-to-end play function: opens the toolbar `Extract` dropdown, runs the trip extractor,
 * and asserts that a Trip tag shows up in the MessageHeader. Hovering the tag opens a preview
 * card whose drag-handle is disabled.
 *
 * The flow exercises: dispatcher invocation → per-extractor operation → db.add(Trip) +
 * ExtractedFrom relation → `useExtractedObjects` reactive query → ExtractedTag render.
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

    // Click the `Run all` entry so all three matching extractors fire (contact + trip + the
    // story-local "important"). Each extractor's `tags` lands in `mailbox.tags`; the trip
    // extractor additionally persists Trip + Booking + Segment + ExtractedFrom.
    const runAllItem = await waitFor(() => body.queryByText(/run all/i));
    await userEvent.click(runAllItem as HTMLElement);

    // Trip object chip — sourced from `ExtractedFrom` relation (task #16). Label includes
    // the SFO/LHR route from `tripNameFor(candidate)`.
    const tripRow = await waitFor(() => canvas.queryByText(/SFO/i));
    expect(tripRow).toBeInTheDocument();
    const tripButton = await waitFor(() => canvas.queryByRole('button', { name: /SFO/i }));
    expect(tripButton).not.toBeDisabled();

    // Trip extractor's `tags: [{ label: 'travel' }]` — applied to the source message via
    // `Mailbox.applyTag` and rendered as a disabled chip in the header.
    const travelTag = await waitFor(() => canvas.queryByRole('button', { name: /^travel$/i }));
    expect(travelTag).toBeInTheDocument();

    // Story-local `ImportantMessageExtractor`'s `tags: [{ label: 'important' }]` — exercises
    // the tag-only path through the dispatcher (no created objects, just a tag).
    const importantTag = await waitFor(() => canvas.queryByRole('button', { name: /^important$/i }));
    expect(importantTag).toBeInTheDocument();
  },
};
