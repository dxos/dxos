//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Button, Panel, Tag, Toolbar } from '@dxos/react-ui';
import { Editor, type EditorController } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { SemanticPipeline, SemanticStore, type Type, generateSparql } from '@dxos/semantic-index';

import { SemanticFactsViewer } from './SemanticFactsViewer';
import { DISCORD_FIXTURE_DOCS, SAMPLE_FACTS_TEXT } from './testing';

type Action = 'parse' | 'fixture' | 'query';

type StoryArgs = { initialText?: string };

const DefaultStory = ({ initialText = SAMPLE_FACTS_TEXT }: StoryArgs) => {
  const editorRef = useRef<EditorController | null>(null);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [sparql, setSparql] = useState<string | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  // One in-memory store (browser-friendly, no SQLite) shared by all three actions plus the edge LLM.
  const runtime = useMemo(
    () => ManagedRuntime.make(Layer.mergeAll(SemanticStore.layerMemory, AiServiceTestingPreset('edge-remote'))),
    [],
  );
  useEffect(() => () => void runtime.dispose(), [runtime]);

  const run = async (action: Action, task: () => Promise<void>) => {
    setBusy(action);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  // Extract + persist facts from the editor text into the shared store.
  const handleParse = () =>
    run('parse', async () => {
      const text = editorRef.current?.getText() ?? '';
      const extracted = await runtime.runPromise(
        SemanticPipeline.run([{ text, source: 'editor:input', date: new Date().toISOString() }]),
      );
      setFacts((prev) => [...prev, ...extracted]);
    });

  // Stream the discord fixture through the pipeline one message at a time, appending facts as each completes.
  const handleLoadFixture = () =>
    run('fixture', async () => {
      setFacts([]);
      for (const doc of DISCORD_FIXTURE_DOCS) {
        const extracted = await runtime.runPromise(SemanticPipeline.run([doc]));
        setFacts((prev) => [...prev, ...extracted]);
      }
    });

  // Turn the editor text into a SPARQL query (LLM), execute it over the store, and show the results.
  const handleQuery = () =>
    run('query', async () => {
      const question = editorRef.current?.getText() ?? '';
      const query = await runtime.runPromise(generateSparql(question));
      setSparql(query);
      // eslint-disable-next-line no-console
      console.log('[semantic-index] generated SPARQL\n' + query);
      const results = await runtime.runPromise(SemanticStore.pipe(Effect.flatMap((store) => store.select(query))));
      setFacts(results);
    });

  return (
    <div className='dx-container grid grid-cols-2 gap-2 p-2'>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root classNames='justify-between'>
            <div className='flex gap-2'>
              <Button variant='primary' disabled={!!busy} onClick={handleParse}>
                {busy === 'parse' ? 'Parsing…' : 'Parse'}
              </Button>
              <Button disabled={!!busy} onClick={handleLoadFixture}>
                {busy === 'fixture' ? 'Loading…' : 'Load fixture'}
              </Button>
              <Button disabled={!!busy} onClick={handleQuery}>
                {busy === 'query' ? 'Querying…' : 'Query'}
              </Button>
            </div>
            {error && <Tag hue='red'>{error}</Tag>}
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content classNames='flex flex-col gap-2'>
          <Editor.Root ref={editorRef}>
            <Editor.View classNames='p-1' value={initialText} />
          </Editor.Root>
          {sparql && (
            <pre className='text-xs whitespace-pre-wrap bg-base-surface p-2 rounded border border-separator overflow-auto'>
              {sparql}
            </pre>
          )}
        </Panel.Content>
      </Panel.Root>
      <SemanticFactsViewer facts={facts} />
    </div>
  );
};

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
