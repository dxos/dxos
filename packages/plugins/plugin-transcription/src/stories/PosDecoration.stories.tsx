//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { stubParse } from '@dxos/nlp';
import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createBasicExtensions, createMarkdownExtensions, createThemeExtensions, pos } from '@dxos/ui-editor';

const SAMPLE = [
  '# Parts of speech',
  '',
  'The quick brown fox jumped over the lazy dog.',
  '',
  'Alice met Bob in Munich and they quickly discussed the new project.',
  '',
].join('\n');

// `stubParse` is a deterministic offline UPOS tagger requiring no API key. The live LLM parser
// `parseText` from `@dxos/nlp` is the production alternative, but it requires an `AiService` layer
// which is out of scope for this offline story.
const PosStory = () => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: SAMPLE,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions(),
        createThemeExtensions({ themeMode }),
        pos({ parse: stubParse, debounceMs: 400 }),
      ],
    }),
    [themeMode],
  );

  return <div ref={parentRef} className='flex grow overflow-hidden' />;
};

const meta = {
  title: 'plugins/plugin-transcription/PosDecoration',
  render: PosStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PosStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
