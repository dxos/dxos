//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { DXN } from '@dxos/keys';
import { stubParse } from '@dxos/nlp';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { pos } from '@dxos/ui-editor';

import { translations } from '#translations';

import { TranscriptionPlugin } from '../TranscriptionPlugin';
import { DefaultStory, SAMPLE_CONTENT, StoryGraphPlugin } from './markdown-transcription-harness';

/**
 * Story-only plugin contributing the part-of-speech decoration extension to every Markdown editor,
 * the same channel TranscriptionPlugin uses for its pending-text extension. Reactive mode parses
 * committed document text (including transcript text confirmed into the doc) and colours each word
 * by its Universal POS tag. Uses the offline `stubParse` tagger so the story needs no AI key.
 */
const PosExtensionPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.transcription.story.pos'),
    name: 'POS Decoration',
  }),
).pipe(
  Plugin.addModule({
    id: 'pos-markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(MarkdownCapabilities.ExtensionProvider, [() => pos({ parse: stubParse })]);
    }),
  }),
  Plugin.make,
);

const meta = {
  title: 'plugins/plugin-transcription/stories/PosTranscription',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              personalSpace.db.add(Markdown.make({ name: 'Transcription', content: SAMPLE_CONTENT }));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        MarkdownPlugin(),
        StoryGraphPlugin(),
        TranscriptionPlugin(),
        PosExtensionPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The transcription document with live part-of-speech decoration: each word in the committed
 * markdown is coloured by its UPOS tag, and text confirmed from a recording is decorated as it
 * lands.
 */
export const Default: Story = {};

/**
 * Seeds finalized transcript text (no microphone). The greyed pending text is not yet committed, so
 * POS decoration applies to the surrounding committed document; confirming the pending block colours
 * the newly-inserted words.
 */
export const Recording: Story = {
  args: {
    seed: {
      final: 'The quick brown fox jumps over the lazy dog.',
      interim: ' And the in-flight words still being transcribed',
    },
  },
};
