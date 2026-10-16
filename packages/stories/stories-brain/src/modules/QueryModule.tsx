//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as EffectEx from '@dxos/effect/EffectEx';
import { buildSparql, generateQuery, parseSparqlToQuery } from '@dxos/pipeline-rdf';

import { DEFAULT_SPARQL, QueryPanel } from '../components/index.ts';
import { StoryBrain } from '../testing/index.ts';
import { useFactsStory } from './context.ts';

/**
 * LEFT (middle): natural-language → SPARQL over the story agent's brain; results are the view. The SPARQL
 * is parsed into a structured query, which the brain answers (`BrainService.query`) without raw SPARQL.
 */
export const QueryModule = () => {
  const { store } = Hooks.useCapability(StoryBrain);
  const { setFacts } = useFactsStory();

  const [question, setQuestion] = useState('');
  const [query, setQuery] = useState(DEFAULT_SPARQL);
  const [busy, setBusy] = useState(false);

  const guard = useCallback((task: () => Promise<void>) => {
    setBusy(true);
    void task().finally(() => setBusy(false));
  }, []);

  // Translate the question into SPARQL (LLM) and write it into the field; the user then runs it.
  const handleGenerate = useCallback(() => {
    guard(async () => {
      const structured = await EffectEx.runPromise(
        generateQuery(question).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote')))),
      );
      setQuery(buildSparql(structured));
    });
  }, [guard, question]);

  // Parse the SPARQL and run it over the store; the result set becomes the displayed view.
  const handleRun = useCallback(() => {
    guard(async () => {
      const results = await EffectEx.runPromise(store.query(parseSparqlToQuery(query)));
      setFacts(results);
    });
  }, [guard, store, query, setFacts]);

  // Reset the field and re-read all facts.
  const handleReset = useCallback(() => {
    guard(async () => {
      setQuery(DEFAULT_SPARQL);
      const results = await EffectEx.runPromise(store.query({}));
      setFacts(results);
    });
  }, [guard, store, setFacts]);

  return (
    <QueryPanel
      question={question}
      query={query}
      busy={busy}
      onQuestionChange={setQuestion}
      onQueryChange={setQuery}
      onGenerate={handleGenerate}
      onRun={handleRun}
      onReset={handleReset}
    />
  );
};
