//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { useCapability } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { EffectEx } from '@dxos/effect';
import { buildSparql, generateQuery, parseSparqlToQuery } from '@dxos/pipeline-rdf';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';
import { type Space } from '@dxos/react-client/echo';

import { DEFAULT_SPARQL, QueryPanel } from '../components';
import { useFactsStory } from './context';

/** LEFT (middle): natural-language → SPARQL over Brain's per-space `FactStore`; results are the view. */
export const QueryModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <QueryModuleContainer space={space} />;
};

const QueryModuleContainer = ({ space }: { space: Space }) => {
  const registry = useCapability(BrainCapabilities.FactStoreRegistry);
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
      const results = await EffectEx.runPromise(registry.forSpace(space.id).query(parseSparqlToQuery(query)));
      setFacts(results);
    });
  }, [guard, registry, space.id, query, setFacts]);

  // Reset the field and re-read all facts.
  const handleReset = useCallback(() => {
    guard(async () => {
      setQuery(DEFAULT_SPARQL);
      const results = await EffectEx.runPromise(registry.forSpace(space.id).query({}));
      setFacts(results);
    });
  }, [guard, registry, space.id, setFacts]);

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
