//
// Copyright 2026 DXOS.org
//

/**
 * MarkdownTranscription plus a part-of-speech decoration extension: each word is coloured by its UPOS tag.
 *
 * - `Default` renders the seeded doc with the live record button and reactive POS colouring of committed text.
 * - `Recording` seeds finalized + interim pending text (no mic); confirming the block colours the inserted words.
 * - `PosExtensionPlugin` contributes `pos({ parse: stubParse })` via `MarkdownCapabilities.ExtensionProvider`.
 * - Uses the offline `stubParse` tagger, so the story needs no AI key.
 * - Wires the same full plugin manager + shared `DefaultStory`/`SAMPLE_CONTENT`/`StoryGraphPlugin` harness as MarkdownTranscription.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { stubParse } from '@dxos/nlp';
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';
import { pos } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { DefaultStory, createMarkdownStoryDecorators } from './testing';

export const SAMPLE_CONTENT = trim`
  # Transcription

  Place the cursor here, then click the microphone in the toolbar to start recording.

`;

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
  title: 'stories/stories-brain/PosTranscription',
  render: DefaultStory,
  decorators: createMarkdownStoryDecorators({
    extraPlugins: [PosExtensionPlugin()],
    seed: ({ personalSpace }) =>
      Effect.gen(function* () {
        personalSpace.db.add(Markdown.make({ name: 'Transcription', content: SAMPLE_CONTENT }));
        yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
      }),
  }),
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
