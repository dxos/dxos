//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Model from './Model';
import * as Provider from './Provider';

describe('Model catalog', () => {
  test('every edge model names the service serving it', () => {
    // The edge provider fronts several upstreams, and each resolver claims models by `service`.
    // An entry without one would be claimed by no resolver — or, worse, by the wrong one.
    const unmarked = Model.forProvider(Provider.edge.id).filter((model) => model.service === undefined);
    expect(unmarked).toEqual([]);
  });

  test('anthropic and deepseek edge models are disjoint and non-empty', () => {
    const edgeModels = Model.forProvider(Provider.edge.id);
    const anthropic = edgeModels.filter((model) => model.service === 'anthropic');
    const deepseek = edgeModels.filter((model) => model.service === 'deepseek');

    expect(anthropic.length).toBeGreaterThan(0);
    expect(deepseek.length).toBeGreaterThan(0);
    expect(anthropic.length + deepseek.length).toBe(edgeModels.length);
  });

  test('deepseek entries use the V4 back-end names', () => {
    // `deepseek-chat` / `deepseek-reasoner` were discontinued on 2026-07-24; the back-end name is
    // sent verbatim as `model`, so a stale one fails at the provider rather than at build time.
    const backends = Model.forProvider(Provider.edge.id)
      .filter((model) => model.service === 'deepseek')
      .map((model) => model.backend);

    expect(backends).not.toContain('deepseek-chat');
    expect(backends).not.toContain('deepseek-reasoner');
    for (const backend of backends) {
      expect(backend).toMatch(/^deepseek-v[0-9]/);
    }
  });

  test('a provider serves each model id at most once', () => {
    const seen = new Set<string>();
    for (const model of Model.all) {
      const key = `${model.provider}::${model.id}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  test('the default edge model is in the catalog', () => {
    expect(Model.get(Provider.edge.id, Model.DEFAULT_EDGE)).toBeDefined();
  });
});
