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
import { RDF, generateSparql } from '@dxos/pipeline-rdf';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';
import { type Space } from '@dxos/react-client/echo';
import { formatBindings } from '@dxos/react-ui-rdf';

import {
  DEFAULT_SPARQL,
  QueryPanel,
  type QueryPanelPending,
  type QueryPanelProps,
  type QueryPanelResult,
} from '../components/index.ts';
import { useFactsStory } from './context.ts';

/**
 * LEFT: natural-language → SPARQL over Brain's per-space `FactStore`, run as written; the raw result shows under the
 * query, and what it binds scopes the facts and entities views.
 */
export const QueryModule = () => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }
  return <QueryModuleContainer space={space} />;
};

const QueryModuleContainer = ({ space }: { space: Space }) => {
  const registry = Hooks.useCapability(BrainCapabilities.FactStoreRegistry);
  const { setFacts, setScope } = useFactsStory();

  const [question, setQuestion] = useState('');
  const [query, setQuery] = useState(DEFAULT_SPARQL);
  const [pending, setPending] = useState<QueryPanelPending | undefined>(undefined);
  const [error, setError] = useState<QueryPanelProps['error']>(undefined);
  const [result, setResult] = useState<QueryPanelResult | undefined>(undefined);

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

  // Translate the question into SPARQL (LLM), grounded in the store's predicates; the user then runs it.
  const handleGenerate = useCallback(() => {
    guard('generate', async () => {
      const store = registry.forSpace(space.id);
      const predicates = await EffectEx.runPromise(store.predicates());
      const sparql = await EffectEx.runPromise(
        generateSparql(question, predicates).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote')))),
      );
      setQuery(sparql);
    });
  }, [guard, registry, space.id, question]);

  // Run the SPARQL as written: its solutions scope the views, and a query binding `?g` shows its graphs as TriG.
  const handleRun = useCallback(() => {
    guard('run', async () => {
      const store = registry.forSpace(space.id);
      const rows = await EffectEx.runPromise(store.rows(query));
      const terms = new Set(rows.flatMap((row) => Object.values(row).map((term) => term.value)));
      const bindsGraphs = rows.some((row) => row.g?.termType === 'NamedNode');
      setScope({ terms, bindsGraphs });
      if (bindsGraphs) {
        const facts = await EffectEx.runPromise(store.select(query));
        setResult({
          kind: 'graphs',
          count: new Set(facts.map(RDF.Mapping.graphOf)).size,
          text: RDF.Graph.toTriG(facts),
        });
      } else {
        setResult({ kind: 'rows', count: rows.length, text: formatBindings(rows) });
      }
    });
  }, [guard, registry, space.id, query, setScope]);

  // Reset the field, drop the result's scope and re-read all facts.
  const handleReset = useCallback(() => {
    guard('reset', async () => {
      setQuery(DEFAULT_SPARQL);
      setScope(undefined);
      setResult(undefined);
      const results = await EffectEx.runPromise(registry.forSpace(space.id).query({}));
      setFacts(results);
    });
  }, [guard, registry, space.id, setFacts, setScope]);

  return (
    <QueryPanel
      question={question}
      query={query}
      pending={pending}
      error={error}
      result={result}
      onQuestionChange={setQuestion}
      onQueryChange={setQuery}
      onGenerate={handleGenerate}
      onRun={handleRun}
      onReset={handleReset}
      onDismissError={() => setError(undefined)}
    />
  );
};
