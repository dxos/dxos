//
// Copyright 2026 DXOS.org
//

/**
 * Inline transcription into a real plugin-markdown editor: TranscriptionPlugin contributes the record
 * toolbar action + the pending-text CodeMirror decoration, streaming transcription into the document.
 *
 * - `Default` renders the seeded Markdown doc with the live record button (requires a microphone).
 * - `Recording` seeds finalized + interim pending text (no mic) to show the inline confirm/cancel preview.
 * - `RecordingIndicator` seeds an empty pending block to show the "Recording…" placeholder.
 * - Wires a full plugin manager (`withPluginManager`): core + Client + Space + Markdown + Transcription + StoryGraph.
 * - Uses the shared `DefaultStory`/`SAMPLE_CONTENT`/`StoryGraphPlugin` harness from `testing`.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { Markdown } from '@dxos/plugin-markdown';

import { translations } from '#translations';

import { DefaultStory, SAMPLE_CONTENT, createMarkdownStoryDecorators } from './testing';

const meta = {
  title: 'plugins/plugin-transcription/stories/MarkdownTranscription',
  render: DefaultStory,
  decorators: createMarkdownStoryDecorators({
    seed: ({ personalSpace }) =>
      Effect.gen(function* () {
        personalSpace.db.add(Markdown.make({ name: 'Transcription', content: SAMPLE_CONTENT }));
        yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
      }),
  }),
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Shows the recording-state decoration at the end of the document: finalized text on the comment
 * surface, the volatile interim tail distinguished, and the inline confirm/cancel affordances —
 * seeded without a microphone.
 */
export const Recording: Story = {
  args: {
    seed: {
      final: 'The quick brown fox jumps over the lazy dog.',
      interim: ' And the in-flight words still being transcribed',
    },
  },
};

/**
 * Shows the "Recording…" placeholder shown at the end of the document the moment recording starts,
 * before any text has been transcribed.
 */
export const RecordingIndicator: Story = {
  args: {
    seed: {},
  },
};
