//
// Copyright 2023 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { ActivationEvents } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { type MessageExtractor } from '#capabilities';
import { InboxOperationHandlerSet } from '#operations';
import { ContactMessageExtractor } from '#operations';
import { translations } from '#translations';
import { InboxCapabilities, InboxOperation, Settings } from '#types';

import EMAIL from '../../testing/data/flight.md?raw';
import { Message } from './Message';

type DefaultStoryProps = {
  text?: string;
};

const DefaultStory = ({ text }: DefaultStoryProps) => {
  const message = useMemo(
    () =>
      MessageType.make({
        sender: {
          name: random.person.fullName(),
          email: random.internet.email(),
        },
        blocks: [{ _tag: 'text', text: text ?? random.lorem.paragraph(2) }],
      }),
    [text],
  );

  return (
    <Message.Root message={message} sender={undefined}>
      <Message.Toolbar />
      <Message.Viewport>
        <Message.Header />
        <Message.Body />
      </Message.Viewport>
    </Message.Root>
  );
};

// Plugin that contributes the inbox Settings capability with remote-image loading enabled
// so the editor's image extension actually renders <img> tags (otherwise the markdown is
// left as plain text and we can't observe the tracking-pixel collapse).
const RemoteImagesEnabledPlugin = Plugin.define({
  id: 'story.inbox-settings',
  name: 'Story Inbox Settings',
}).pipe(
  Plugin.addModule({
    id: 'settings',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: () =>
      Effect.succeed(
        Capability.contributes(InboxCapabilities.Settings, Atom.make<Settings.Settings>({ loadRemoteImages: true })),
      ),
  }),
  Plugin.make,
);

const meta = {
  title: 'plugins/plugin-inbox/components/Message',
  component: DefaultStory,
  decorators: [
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [RemoteImagesEnabledPlugin()],
    }),
    withTheme(),
    withLayout({ layout: 'column' }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Email: Story = {
  args: {
    text: EMAIL,
  },
};

// Verifies images outside the initial parse range still render as widgets when scrolled into
// view (without requiring the user to focus the editor). The image is placed after a long
// stretch of filler text so it falls outside the initial viewport.
export const ImageBelowFold: Story = {
  args: {
    text: [
      'Top of the message.',
      ...Array.from({ length: 80 }, (_, i) => `\nParagraph ${i + 1}: ${random.lorem.paragraph(1)}`),
      '',
      '![](https://picsum.photos/seed/scroll/400/200)',
      '',
      'Bottom of the message.',
    ].join('\n'),
  },
};

// Verifies that 1×1 tracking pixels and the surrounding paragraph-break blank lines collapse
// to nothing. Without the fix you'd see 3 blank lines where the image source lives.
export const TrackingPixel: Story = {
  args: {
    text: [
      'Hello,',
      '',
      'This is the visible body of the email.',
      '',
      '![](https://www.google-analytics.com/__utm.gif)',
      '',
      'Cheers.',
    ].join('\n'),
  },
};

// Fake "travel" extractor scoped to the story so we can demonstrate the multi-matcher case
// (and the `Run all` action) without taking a reverse dependency on plugin-trip. Matches any
// message whose body mentions a flight number, mirroring TripMessageExtractor's heuristic.
// The `operation` field is required by the interface for first-class registry, but the
// dispatcher uses `extract` directly so pointing it at any real definition is fine here.
const FakeTripExtractor: MessageExtractor.MessageExtractor = {
  id: 'story.extractor.fake-trip',
  title: 'Trip',
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

// Wires the extractor toolbar end-to-end: contributes ContactMessageExtractor (always matches)
// and a story-local FakeTripExtractor (matches flight-confirmation bodies) so MessageArticle's
// toolbar shows multiple "Extract…" actions plus the synthetic "Run all" entry. Also registers
// the InboxOperationHandlerSet so clicks resolve through a real OperationInvoker (provided by
// ProcessManagerPlugin in corePlugins).
const ExtractorsPlugin = Plugin.define({ id: 'story.extractors', name: 'Story Extractors' }).pipe(
  Plugin.addModule({
    id: 'contact-extractor',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(InboxCapabilities.MessageExtractor, ContactMessageExtractor)),
  }),
  Plugin.addModule({
    id: 'fake-trip-extractor',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(InboxCapabilities.MessageExtractor, FakeTripExtractor)),
  }),
  Plugin.addModule({
    id: 'operation-handlers',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(Capabilities.OperationHandler, InboxOperationHandlerSet)),
  }),
  Plugin.make,
);

// Demonstrates the extractor pipeline: a message that matches BOTH the contact extractor
// (sender has an email) and the travel extractor (body contains a flight line). The toolbar
// should show "Run all (2)" followed by the per-extractor entries. Each click invokes
// ExtractMessage through the OperationInvoker.
export const Extractors: Story = {
  args: {
    text: [
      'Your flight is confirmed!',
      '',
      'Flight: UA-100',
      'From: SFO',
      'To: LHR',
      'Depart: 2026-06-01 15:30',
      'Arrive: 2026-06-02 09:30',
      'Confirmation: ABC123',
    ].join('\n'),
  },
  decorators: [
    withPluginManager({
      plugins: [...corePlugins(), RemoteImagesEnabledPlugin(), ExtractorsPlugin()],
    }),
  ],
};
