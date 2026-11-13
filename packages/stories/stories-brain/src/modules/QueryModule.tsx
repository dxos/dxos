//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as EffectEx from '@dxos/effect/EffectEx';
import { buildSparql, generateQuery, parseSparqlToQuery } from '@dxos/pipeline-rdf';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';
import { type Space } from '@dxos/react-client/echo';

import { DEFAULT_SPARQL, QueryPanel, type QueryPanelPending, type QueryPanelProps } from '../components/index.ts';
import { useFactsStory } from './context.ts';

/** LEFT (middle): natural-language → SPARQL over Brain's per-space `FactStore`; results are the view. */
export const QueryModule = () => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }
  return <QueryModuleContainer space={space} />;
};

const QueryModuleContainer = ({ space }: { space: Space }) => {
  const registry = Hooks.useCapability(BrainCapabilities.FactStoreRegistry);
  const { setFacts } = useFactsStory();

  const [question, setQuestion] = useState('');
  const [query, setQuery] = useState(DEFAULT_SPARQL);
  const [pending, setPending] = useState<QueryPanelPending | undefined>(undefined);
  const [error, setError] = useState<QueryPanelProps['error']>(undefined);

  // One action at a time; its failure is shown in the panel rather than lost in an unhandled rejection.
  const guard = useCallback((action: QueryPanelPending, task: () => Promise<void>) => {
    setPending(action);
    setError(undefined);
    void task()
      .catch((failure: unknown) =>
        setError({ action, message: failure instanceof Error ? failure.message : String(failure) }),
      )
      .finally(() => setPending(undefined));
  }, []);

  // Translate the question into SPARQL (LLM) and write it into the field; the user then runs it.
  const handleGenerate = useCallback(() => {
    guard('generate', async () => {
      const structured = await EffectEx.runPromise(
        generateQuery(question).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote')))),
      );
      setQuery(buildSparql(structured));
    });
  }, [guard, question]);

  // Parse the SPARQL and run it over the store; the result set becomes the displayed view.
  const handleRun = useCallback(() => {
    guard('run', async () => {
      const results = await EffectEx.runPromise(registry.forSpace(space.id).query(parseSparqlToQuery(query)));
      setFacts(results);
    });
  }, [guard, registry, space.id, query, setFacts]);

  // Reset the field and re-read all facts.
  const handleReset = useCallback(() => {
    guard('reset', async () => {
      setQuery(DEFAULT_SPARQL);
      const results = await EffectEx.runPromise(registry.forSpace(space.id).query({}));
      setFacts(results);
    });
  }, [guard, registry, space.id, setFacts]);

  return (
    <QueryPanel
      question={question}
      query={query}
      pending={pending}
      error={error}
      onQuestionChange={setQuestion}
      onQueryChange={setQuery}
      onGenerate={handleGenerate}
      onRun={handleRun}
      onReset={handleReset}
      onDismissError={() => setError(undefined)}
    />
  );
};
