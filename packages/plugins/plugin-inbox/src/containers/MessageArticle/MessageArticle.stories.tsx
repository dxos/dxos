//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { Feed, Filter, Obj } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType, Person } from '@dxos/types';

import { InboxPlugin } from '../../InboxPlugin';
import { type MessageExtractor } from '../../capabilities';
import { translations } from '../../translations';
import { InboxCapabilities, InboxOperation, Mailbox } from '../../types';

import { MessageArticle } from './MessageArticle';

// No-op handlers for layout operations that MessageArticle calls (e.g. Open on companion mode).
// Mirrors the pattern in MailboxArticle.stories.tsx so the story doesn't need DeckPlugin.
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

// Story-local stand-in for plugin-trip's TripMessageExtractor. plugin-inbox cannot import
// plugin-trip (would create a reverse dep), so we register a fake that mirrors the trip
// extractor's match shape — body containing a flight line. The `operation` field is required
// by the interface but unused by the dispatcher (which calls `extract` directly).
const FakeTripExtractor: MessageExtractor.MessageExtractor = {
  id: 'story.extractor.fake-trip',
  description: 'Story: extract travel itinerary',
  kinds: ['flight'],
  match: (message) => {
    const text = message.blocks
      .filter((block): block is { _tag: 'text'; text: string } => block._tag === 'text')
      .map((block) => block.text)
      .join('\n');
    return /Flight:\s*[A-Z]{1,3}-?\d/.test(text) ? { matched: true, confidence: 0.8 } : { matched: false };
  },
  operation: InboxOperation.ExtractContactFromMessage,
  extract: () => Effect.succeed({ created: [], updated: [], relations: [] }),
};

const StoryTripExtractorPlugin = Plugin.define({
  id: 'story.story-trip-extractor',
  name: 'Story Trip Extractor',
}).pipe(
  Plugin.addModule({
    id: 'extractor',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(InboxCapabilities.MessageExtractor, FakeTripExtractor)),
  }),
  Plugin.make,
);

/**
 * Seeds a personal space with a Mailbox containing one message that matches BOTH the
 * registered ContactMessageExtractor (sender has email) and the FakeTripExtractor (body
 * contains a flight line). Returns nothing — the story queries for the message at render
 * time so React picks it up after the seed lands.
 */
const seedMessage = (space: Space) => {
  // Body deliberately contains a flight line so the fake trip extractor matches.
  const body = [
    'Hi there,',
    '',
    'Your flight is confirmed!',
    '',
    'Flight: UA-100',
    'From: SFO',
    'To: LHR',
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
  title: 'plugins/plugin-inbox/containers/MessageArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Mailbox.Mailbox, MessageType.Message, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                const mailbox = personalSpace.db.add(Mailbox.make());
                seedMessage(personalSpace);
                await personalSpace.db.flush({ indexes: true });
                return mailbox;
              });
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        PreviewPlugin(),
        MockDeckOperationsPlugin(),
        StoryTripExtractorPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Renders MessageArticle for a single United-style flight-confirmation message. The toolbar
 * should show two `Extract…` actions (one per matching extractor) plus a `Run all (2)` entry
 * at the top — clicking each invokes ExtractMessage and the dispatcher persists Person /
 * Booking / Segment objects into the space. The avatar in the header invokes the
 * actor-targeted ExtractContact operation for comparison.
 */
export const Default: Story = {};
