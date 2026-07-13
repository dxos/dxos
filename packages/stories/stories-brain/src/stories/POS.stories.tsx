//
// Copyright 2026 DXOS.org
//

/**
 * MarkdownTranscription plus a part-of-speech decoration extension: each word is coloured by its UPOS tag.
 *
 * - `Mock` renders the seeded doc with the live record button and reactive POS colouring of committed text,
 *   tagged by the offline `stubParse` tagger (no AI key needed).
 * - `LLM` is the same story tagged by the LLM-based `parseText` over the edge AI service (needs edge credentials).
 * - `PosExtensionPlugin` contributes `pos({ parse })` via `MarkdownCapabilities.ExtensionProvider`; its `ai`
 *   option selects the parser per instantiation.
 * - Wires the same full plugin manager + shared `DefaultStory`/`SAMPLE_CONTENT`/`StoryGraphPlugin` harness as MarkdownTranscription.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Capability, Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { type Parser, parseText } from '@dxos/nlp';
import { stubParse } from '@dxos/nlp/testing';
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';
import { pos } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { DefaultStory, createMarkdownStoryDecorators } from '../testing';

const SAMPLE_CONTENT = trim`
  # RDF

  - The quick brown fox jumps over the lazy dog.

  - Socrates was a Greek philosopher.
  - Plato was his student.
  - Aristotle was his student.
  - Socrates is a man.
  - All men are mortal.

  - We've been tracking GOOGL, which just hit $500
`;

// LLM-backed Parser: tags via `parseText` against the edge AI service (same preset the sibling
// crawler story uses). `Layer.fresh` scopes one client per parse call.
const llmParse: Parser = (text) =>
  parseText(text).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote'))), Effect.runPromise);

type PosExtensionOptions = {
  /** Tag with the LLM parser (edge AI, needs credentials); false uses the offline stub tagger. */
  ai?: boolean;
};

/**
 * Story-only plugin contributing the part-of-speech decoration extension to every Markdown editor,
 * the same channel TranscriptionPlugin uses for its pending-text extension. Reactive mode parses
 * committed document text (including transcript text confirmed into the doc) and colours each word
 * by its Universal POS tag. The parser is selected per instantiation via {@link PosExtensionOptions}.
 */
const PosExtensionPlugin = Plugin.define<PosExtensionOptions>(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.transcription.story.pos'),
    name: 'POS Decoration',
  }),
).pipe(
  Plugin.addModule(({ ai }: PosExtensionOptions) => ({
    id: 'pos-markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(MarkdownCapabilities.ExtensionProvider, [
        () => pos({ parse: ai ? llmParse : stubParse }),
      ]);
    }),
  })),
  Plugin.make,
);

// Decorators are per-story (not on meta) so each variant mounts its own plugin manager with the
// plugin instantiated for its parser; meta+story decorators would nest two harnesses.
const createPosStoryDecorators = (options: PosExtensionOptions) =>
  createMarkdownStoryDecorators({
    extraPlugins: [PosExtensionPlugin(options)],
    seed: ({ personalSpace: space }) =>
      Effect.gen(function* () {
        space.db.add(Markdown.make({ name: 'Transcription', content: SAMPLE_CONTENT }));
        yield* Effect.promise(() => space.db.flush({ indexes: true }));
      }),
  });

const meta = {
  title: 'stories/stories-brain/POS',
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Mock: Story = {
  decorators: createPosStoryDecorators({ ai: false }),
};

export const LLM: Story = {
  decorators: createPosStoryDecorators({ ai: true }),
};
