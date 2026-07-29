//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useMemo } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { type Parser, parseText } from '@dxos/nlp';
import { stubParse } from '@dxos/nlp/testing';
import { useThemeContext } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  pos,
} from '@dxos/ui-editor';
import { trim } from '@dxos/util';

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

// LLM-backed parser: tags via `parseText` against the edge AI service (needs edge credentials).
// `Layer.fresh` scopes one client per parse call.
const llmParse: Parser = (text) =>
  parseText(text).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote'))), Effect.runPromise);

type StoryProps = {
  /** Tag with the LLM parser (edge AI, needs credentials); false uses the offline stub tagger. */
  ai?: boolean;
};

/**
 * Renders a plain `react-ui-editor` over the sample text with the `pos` decoration extension: each
 * word is coloured by its Universal POS tag. `Mock` uses the offline stub tagger (no key needed);
 * `LLM` tags via the edge AI service. No plugin manager / ECHO space — just the editor + extension.
 */
const DefaultStory = ({ ai }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineWrapping: true }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      pos({ parse: ai ? llmParse : stubParse }),
    ],
    [ai, themeMode],
  );

  return (
    <Editor.Root extensions={extensions}>
      <Editor.View initialValue={SAMPLE_CONTENT} autoFocus />
    </Editor.Root>
  );
};

const meta = {
  title: 'stories/stories-brain/POS',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Mock: Story = {};

export const LLM: Story = {
  args: {
    ai: true,
  },
};
