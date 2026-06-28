//
// Copyright 2025 DXOS.org
//

/**
 * Keyword-spotting demo on the browser's Web Speech API (no DXOS transcriber), driven by the real
 * `Mic` button so the mic UX matches the rest of the suite.
 *
 * - `Default` lists the keywords and checks each as it is heard.
 * - The toolbar `Mic` toggles the shared `RecordingSession`; the story observes it (`useRecordingSession`)
 *   to start/stop `window.SpeechRecognition` (continuous + interim results). The editor driver stays
 *   idle (no editor view for this session).
 * - Matching normalizes punctuation/whitespace; matched rows show a check via `react-ui-list` `Listbox`.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Panel, Toolbar } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { useSpeechRecognition } from '@dxos/react-ui-transcription';

import { Mic } from '#components';
import { translations } from '#translations';

import { createStoryDecorators, useRecordingSession } from './testing';

// Stable session key for the Mic button; any non-editor id works (the editor driver ignores it).
const DOC_ID = 'keyword-detection';

type StoryArgs = {
  keywords: string[];
};

const DefaultStory = ({ keywords }: StoryArgs) => {
  const [matched, setMatched] = useState<string | undefined>(undefined);
  const handleTranscript = (transcript: string) => {
    const match = keywords.find((keyword) => transcript.includes(keyword));
    setMatched(match ?? undefined);
  };

  const recording = useRecordingSession(DOC_ID);
  useSpeechRecognition({ active: recording, onTranscript: handleTranscript });

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Mic docId={DOC_ID} />
        </Toolbar.Root>
      </Panel.Toolbar>

      <Panel.Content>
        <Listbox.Root value={matched}>
          <Listbox.Viewport thin padding>
            <Listbox.Content aria-label='Keywords'>
              {keywords.map((keyword) => (
                <Listbox.Item key={keyword} id={keyword}>
                  <Listbox.ItemLabel>{keyword}</Listbox.ItemLabel>
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Viewport>
        </Listbox.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/KeywordDetection',
  render: DefaultStory,
  decorators: createStoryDecorators(),
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    keywords: ['hello', 'hey kai', 'kai', 'computer', 'dxos', 'composer'].sort(),
  },
};
