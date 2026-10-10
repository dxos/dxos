//
// Copyright 2026 DXOS.org
//

import type * as DecisionModel from 'effect/ai/DecisionModel';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { indexFixture, writeFixture } from '../mcp/fixture.ts';
import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import * as Cache from './Cache.ts';
import * as Design from './Design.ts';
import * as SystemOne from './SystemOne.ts';

const iri = (path: string) => Ontology.fileIri(path).value;

/** A model that runs a broken query and a working one on its first turn, then stops. */
const scriptedExplorer = (): { layer: Layer.Layer<LanguageModel.LanguageModel>; prompts: string[] } => {
  const prompts: string[] = [];
  let turn = 0;
  const layer = Layer.effect(
    LanguageModel.LanguageModel,
    LanguageModel.make({
      generateText: (options) =>
        Effect.sync(() => {
          prompts.push(JSON.stringify(options.prompt.content));
          turn++;
          return turn === 1
            ? [
                {
                  type: 'tool-call' as const,
                  id: 'call_1',
                  name: 'sparql',
                  params: {
                    purpose: 'files named a or b',
                    query:
                      "SELECT ?file WHERE { ?file deus:path ?path . FILTER(CONTAINS(?path, 'a') OR CONTAINS(?path, 'b')) }",
                  },
                  providerExecuted: false,
                },
                {
                  type: 'tool-call' as const,
                  id: 'call_2',
                  name: 'sparql',
                  params: {
                    purpose: 'the import chain',
                    query: 'SELECT ?file ?path WHERE { ?file deus:path ?path ; deus:imports ?other }',
                  },
                  providerExecuted: false,
                },
              ]
            : [{ type: 'text' as const, text: 'Covered.' }];
        }),
      streamText: () => Stream.empty,
    }),
  );
  return { layer, prompts };
};

/** Every file but `d.ts` belongs; relations and grouping get fixed answers. */
const judge = SystemOne.scripted(({ state, decisions }): Record<string, DecisionModel.ProviderAnswer> => {
  if ('grouping' in decisions) {
    return {
      grouping: {
        _tag: 'Classify',
        label: 'directory',
        probabilities: { package: 0.1, area: 0.1, directory: 0.7, kind: 0.1 },
      },
    };
  }
  const text = JSON.stringify(state);
  return {
    matters: {
      _tag: 'Probability',
      probability: text.includes('"relation"') || !text.includes('src/d.ts') ? 0.9 : 0.1,
    },
  };
});

describe('query pipeline', () => {
  let root: string;
  let dir: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-query-'));
    dir = join(root, 'node_modules', '.code-index');
    await writeFixture(root);
    await indexFixture(root, dir);
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test('queries are unioned with provenance, failures fed back, and the relevant chain selected', async () => {
    vi.stubEnv('TYPESAFE_API_KEY', 'scripted');
    try {
      const explorer = scriptedExplorer();
      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          const cache = yield* Cache.open(join(root, 'design-cache.jsonl'));
          return yield* Design.runSelected({
            prompt: 'how does a reach c?',
            model: SystemOne.MODEL.id.toString(),
            cache,
            budget: 10,
            threshold: 0.3,
          });
        }).pipe(Effect.provide(Layer.mergeAll(Store.layer(dir), explorer.layer, judge)), Effect.scoped),
      );

      const queries = result.queries ?? [];
      expect(queries.map((record) => [record.index, record.ok])).toEqual([
        [0, true],
        [1, false],
        [2, true],
      ]);
      expect(queries[1].error).toContain('||');
      // The failure went back to the model rather than ending the exploration.
      expect(explorer.prompts[1]).toContain('||');
      expect(queries[2].files).toEqual(expect.arrayContaining([iri('src/a.ts'), iri('src/b.ts')]));

      const byPath = new Map(result.candidates.nodes.map((node) => [node.path, node]));
      expect(byPath.get('src/a.ts')?.provenance).toContain('query 2');
      expect(result.candidates.edges).toContainEqual({ from: iri('src/a.ts'), to: iri('src/b.ts'), kind: 'imports' });

      const kept = result.scored.nodes.filter((node) => node.kept).map((node) => node.path);
      expect(kept).toEqual(expect.arrayContaining(['src/a.ts', 'src/b.ts']));
      expect(kept).not.toContain('src/d.ts');
      expect(result.scored.scorer).toBe('select/system-one');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
