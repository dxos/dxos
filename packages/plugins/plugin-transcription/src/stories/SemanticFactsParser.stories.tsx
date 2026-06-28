//
// Copyright 2026 DXOS.org
//

/**
 * Interactive editor + Parse harness that runs live semantic-fact extraction over the typed text.
 *
 * - `Default` seeds sample text (Paris/Rome/Q3 board meeting); `Empty` starts blank.
 * - `onParse` calls `extractFacts` provided with the hosted `AiServiceTestingPreset('edge-remote')` — a real LLM runs on Parse.
 * - Renders the `SemanticFactsParser` component (editor + Parse button + `SemanticFactsViewer`).
 * - Minimal decorators (`withTheme` + `withLayout`) with i18n `translations`; no plugin manager.
 * - The same component works against any `AiService` layer (direct provider, local edge, ollama, or a stub).
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { extractFacts } from '@dxos/semantic-index';

import { translations } from '#translations';

import { SemanticFactsParser, type SemanticFactsParserProps } from './SemanticFactsParser';
import { SAMPLE_FACTS_TEXT_BLOCK } from './testing';

// Live extraction: `extractFacts` requires only an `AiService`, satisfied here by the hosted DXOS
// edge preset (a real LLM runs on Parse). The same component + `extractFacts` works against any
// `AiService` layer (direct provider, local edge, ollama, or a stub).
const onParse: SemanticFactsParserProps['onParse'] = (text) =>
  EffectEx.runPromise(
    extractFacts([{ text, source: 'editor:input', date: new Date().toISOString() }]).pipe(
      Effect.provide(AiServiceTestingPreset('edge-remote')),
    ),
  );

const DefaultStory = (props: SemanticFactsParserProps) => <SemanticFactsParser {...props} />;

const meta = {
  title: 'plugins/plugin-transcription/stories/SemanticFactsParser',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onParse,
    initialText: SAMPLE_FACTS_TEXT_BLOCK,
  },
};

export const Empty: Story = {
  args: {
    onParse,
    initialText: '',
  },
};
