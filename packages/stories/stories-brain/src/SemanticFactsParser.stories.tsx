//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useRef, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { Button, Panel, Tag, Toolbar } from '@dxos/react-ui';
import { Editor, type EditorController } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Type } from '@dxos/semantic-index';
import { extractFacts } from '@dxos/semantic-index';

import { SemanticFactsViewer } from './SemanticFactsViewer';
import { SAMPLE_FACTS_TEXT } from './testing';

type StoryArgs = { initialText?: string };

const DefaultStory = ({ initialText = SAMPLE_FACTS_TEXT }: StoryArgs) => {
  const editorRef = useRef<EditorController>(null);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    const text = editorRef.current?.getText() ?? '';
    setLoading(true);
    setError(null);
    try {
      const result = await onParse(text);
      setFacts(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='dx-container grid grid-cols-2 gap-2 p-2'>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root classNames='justify-between'>
            <Button variant='primary' disabled={loading} onClick={handleParse}>
              {loading ? 'Parsing…' : 'Parse'}
            </Button>
            {error && <Tag hue='red'>{error}</Tag>}
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <Editor.Root ref={editorRef}>
            <Editor.View classNames='p-1' value={initialText} />
          </Editor.Root>
        </Panel.Content>
      </Panel.Root>
      <SemanticFactsViewer facts={facts} />
    </div>
  );
};

const onParse = (text: string) =>
  EffectEx.runPromise(
    extractFacts([{ text, source: 'editor:input', date: new Date().toISOString() }]).pipe(
      Effect.provide(AiServiceTestingPreset('edge-remote')),
    ),
  );

const meta = {
  title: 'stories/stories-brain/SemanticFactsParser',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialText: SAMPLE_FACTS_TEXT,
  },
};
