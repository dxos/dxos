//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { AiService } from '@dxos/ai';
import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapabilities } from '@dxos/app-framework/ui';
import { LayerSpec } from '@dxos/compute';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { ExtractedFrom, InboxOperation, Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { Markdown } from '@dxos/plugin-markdown/types';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Booking, Segment, Trip } from '@dxos/plugin-trip';
import { TripPlugin } from '@dxos/plugin-trip/testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Message, Person } from '@dxos/types';

import { TRIP_LEGS, TRIP_MESSAGES } from '../testing';

/**
 * Story `AiService` whose `generateObject` returns a per-message flight payload and `generateText`
 * returns a static summary, so the template-driven TripMessageExtractor runs end-to-end without a
 * real provider.
 */
const MockAiServicePlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('story.inbox.mockAiService'),
    name: 'Story Mock AI Service',
  }),
).pipe(
  Plugin.addModule({
    id: 'ai-service',
    provides: [Capabilities.LayerSpec],
    activate: () =>
      Effect.succeed([
        Capability.provide(
          Capabilities.LayerSpec,
          LayerSpec.make({ affinity: 'application', requires: [], provides: [AiService.AiService] }, () =>
            Layer.succeed(AiService.AiService, {
              model: () =>
                Layer.succeed(LanguageModel.LanguageModel, {
                  generateText: () => Effect.succeed({ text: 'Mock summary.', content: [] }),
                  generateObject: (options: any) =>
                    Effect.succeed({ value: resolvePayload(String(options?.prompt ?? '')), content: [] }),
                  streamText: () => Stream.empty,
                } as any),
            }),
          ),
        ),
      ]),
  }),
  Plugin.make,
);

/** Resolve the canned structured output for the trip extractor from the prompt (contains the body). */
const resolvePayload = (prompt: string): unknown => {
  if (prompt.includes('AF0001')) {
    return TRIP_LEGS[0];
  }
  if (prompt.includes('AF0002')) {
    return TRIP_LEGS[1];
  }

  return {};
};

/** Adds a Mailbox and appends the feed messages to its backing Queue. */
const seedFeed = async (space: Space) => {
  const mailbox = space.db.add(Mailbox.make());
  await space.db.flush();
  const feed = await mailbox.feed.load();
  await space.db.appendToFeed(
    feed,
    TRIP_MESSAGES.map((message) =>
      Obj.make(Message.Message, {
        created: new Date('2026-05-25T00:00:00.000Z').toISOString(),
        sender: { email: message.from },
        properties: { subject: message.subject },
        blocks: [{ _tag: 'text', text: message.body }],
      }),
    ),
  );
  await space.db.flush({ indexes: true });
};

/**
 * Harness: lists the Mailbox feed's messages, runs `ExtractMessage` over each via the
 * OperationInvoker (the same path the toolbar uses), and reports live counts of Trips / Segments /
 * relations so the play function can assert the outcome from the DOM.
 */
const DefaultStory = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const feed = mailbox?.feed?.target;
  const messages = useQuery(
    space?.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const trips = useQuery(space?.db, Filter.type(Trip.Trip));
  const segments = useQuery(space?.db, Filter.type(Segment.Segment));
  const relations = useQuery(space?.db, Filter.type(ExtractedFrom.ExtractedFrom));
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);
  const [runs, setRuns] = useState(0);

  // Messages with a recorded Message → extracted-object (Trip) association on the Mailbox.
  const linked = mailbox
    ? messages.filter((message) => Mailbox.getExtractedObjectIds(mailbox, message.id).length > 0).length
    : 0;

  const handleExtract = async () => {
    if (!space?.db || !invoker) {
      return;
    }

    for (const message of messages) {
      await invoker
        .invokePromise(InboxOperation.ExtractMessage, { source: message }, { spaceId: space.id })
        .catch((err) => log.warn('extract failed', { err, messageId: message.id }));
    }
    setRuns((count) => count + 1);
  };

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button
            data-testid='extract'
            disabled={!invoker || messages.length === 0}
            onClick={() => void handleExtract()}
          >
            Run
          </Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content data-testid='counts' className='dx-container grid grid-cols-2 gap-2 p-2 text-sm'>
        <div className='overflow-auto'>
          <JsonHighlighter
            data={{
              runs,
              messages: messages.length,
              trips: trips.length,
              segments: segments.length,
              relations: relations.length,
              linked,
            }}
          />
        </div>
        <div className='overflow-auto'>
          <JsonHighlighter
            data={{
              TRIP_MESSAGES,
              TRIP_LEGS,
            }}
          />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'stories/stories-inbox/ExtractMessageList',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      setupEvents: [ActivationEvents.Startup],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [
            Feed.Feed,
            Mailbox.Mailbox,
            Message.Message,
            Person.Person,
            ExtractedFrom.ExtractedFrom,
            Booking.Booking,
            Segment.Segment,
            Trip.Trip,
            Markdown.Document,
            Text.Text,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => seedFeed(personalSpace));
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        MarkdownPlugin(),
        TripPlugin(),
        MockAiServicePlugin(),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Reproduces the real composer path: messages live in a Mailbox feed (immutable Queue items) and
 * are extracted via the `ExtractMessage` operation. Asserts the two same-PNR legs collapse into a
 * single Trip with two Segments (not two Trips).
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

    // Wait for the three feed messages to load.
    await waitFor((text) => /"messages":\s*3\b/.test(text));

    // First pass: both same-PNR legs collapse into ONE Trip with TWO Segments.
    await userEvent.click(canvas.getByTestId('extract'));
    const afterFirst = await waitFor((text) => /"runs":\s*1\b/.test(text));
    void expect(afterFirst).toMatch(/"trips":\s*1\b/);
    void expect(afterFirst).toMatch(/"segments":\s*2\b/);
    // Both travel messages have a visible Message → Trip association on the Mailbox (feed messages
    // can't be ECHO relation endpoints, so the association is recorded on the Mailbox).
    void expect(afterFirst).toMatch(/"linked":\s*2\b/);

    // Second pass over the same messages must be idempotent — still ONE Trip, TWO Segments
    // (segments updated in place, not duplicated). This is the "extract twice" case.
    await userEvent.click(canvas.getByTestId('extract'));
    const afterSecond = await waitFor((text) => /"runs":\s*2\b/.test(text));
    void expect(afterSecond).toMatch(/"trips":\s*1\b/);
    void expect(afterSecond).toMatch(/"segments":\s*2\b/);
  },
};
