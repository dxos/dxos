//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import React, { type ChangeEvent, useEffect, useRef, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Button, Panel, Tag, Toolbar } from '@dxos/react-ui';
import { Editor, type EditorController } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { SemanticPipeline, SemanticStore, type Type, generateSparql } from '@dxos/semantic-index';

import { SemanticFactsViewer } from './SemanticFactsViewer';
import { SAMPLE_FACTS_TEXT, parseDiscordFixture } from './testing';

// One in-memory store (browser-friendly, no SQLite) + the edge LLM. Built lazily per story instance.
const makeRuntime = () =>
  ManagedRuntime.make(Layer.mergeAll(SemanticStore.layerMemory, AiServiceTestingPreset('edge-remote')));

type Action = 'parse' | 'fixture' | 'query';

type StoryArgs = { initialText?: string };

const DefaultStory = ({ initialText = SAMPLE_FACTS_TEXT }: StoryArgs) => {
  const editorRef = useRef<EditorController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [sparql, setSparql] = useState<string | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lazily create the runtime and recreate it if disposed, so it survives React StrictMode's
  // mount → unmount(dispose) → remount cycle (otherwise actions hit a disposed runtime).
  const runtimeRef = useRef<ReturnType<typeof makeRuntime> | null>(null);
  const getRuntime = () => (runtimeRef.current ??= makeRuntime());
  useEffect(
    () => () => {
      void runtimeRef.current?.dispose();
      runtimeRef.current = null;
    },
    [],
  );

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
      const extracted = await getRuntime().runPromise(
        SemanticPipeline.run([{ text, source: 'editor:input', date: new Date().toISOString() }]),
      );
      setFacts((prev) => [...prev, ...extracted]);
    });

  // Stream a picked discord fixture file (plugin-discord:generate-fixtures JSON) through the pipeline
  // one message at a time, appending facts as each completes.
  const handleFixtureFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // Allow re-picking the same file.
    if (!file) {
      return;
    }
    void run('fixture', async () => {
      const docs = parseDiscordFixture(JSON.parse(await file.text()));
      setFacts([]);
      for (const doc of docs) {
        const extracted = await getRuntime().runPromise(SemanticPipeline.run([doc]));
        setFacts((prev) => [...prev, ...extracted]);
      }
    });
  };

  // Turn the editor text into a SPARQL query (LLM), execute it over the store, and show the results.
  const handleQuery = () =>
    run('query', async () => {
      const question = editorRef.current?.getText() ?? '';
      const query = await getRuntime().runPromise(generateSparql(question));
      setSparql(query);
      // eslint-disable-next-line no-console
      console.log('[semantic-index] generated SPARQL\n' + query);
      const results = await getRuntime().runPromise(SemanticStore.pipe(Effect.flatMap((store) => store.select(query))));
      setFacts(results);
    });

  return (
    <div className='dx-container grid grid-cols-2 gap-2'>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root classNames='justify-between'>
            <div className='flex gap-2'>
              <Button variant='primary' disabled={!!busy} onClick={handleParse}>
                {busy === 'parse' ? 'Parsing…' : 'Parse'}
              </Button>
              <Button disabled={!!busy} onClick={() => fileInputRef.current?.click()}>
                {busy === 'fixture' ? 'Loading…' : 'Load fixture'}
              </Button>
              <input
                ref={fileInputRef}
                type='file'
                accept='application/json,.json'
                className='hidden'
                onChange={handleFixtureFile}
              />
              <Button disabled={!!busy} onClick={handleQuery}>
                {busy === 'query' ? 'Querying…' : 'Query'}
              </Button>
            </div>
            {error && <Tag hue='red'>{error}</Tag>}
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content classNames='dx-container grid grid-row-2'>
          <Editor.Root ref={editorRef}>
            <Editor.View value={initialText} />
          </Editor.Root>
          <div className='dx-expander'>
            {sparql && (
              <pre className='text-xs whitespace-pre-wrap bg-base-surface p-2 rounded border border-separator overflow-auto'>
                {sparql}
              </pre>
            )}
          </div>
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
