//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Model from './Model.ts';
import * as Provider from './Provider.ts';

describe('Model catalog', () => {
  test('developer reads the authority off an id', () => {
    expect(Model.developer(DXN.make('com.deepseek.model.deepseek-v4-flash.default'))).toBe('com.deepseek');
    expect(Model.developer(DXN.make('com.anthropic.model.claude-opus-5.default'))).toBe('com.anthropic');
  });

  test('every edge model belongs to a developer a resolver claims', () => {
    // The edge provider fronts several upstreams and each resolver claims ids by developer, so an
    // entry under an unclaimed authority would resolve nowhere.
    const claimed = ['com.anthropic', 'com.deepseek'];
    const unclaimed = Model.forProvider(Provider.edge.id).filter(
      (model) => !claimed.includes(Model.developer(model.id)),
    );
    expect(unclaimed).toEqual([]);
  });

  test('anthropic and deepseek edge models are disjoint and non-empty', () => {
    const edgeModels = Model.forProvider(Provider.edge.id);
    const anthropic = edgeModels.filter((model) => Model.developer(model.id) === 'com.anthropic');
    const deepseek = edgeModels.filter((model) => Model.developer(model.id) === 'com.deepseek');

    expect(anthropic.length).toBeGreaterThan(0);
    expect(deepseek.length).toBeGreaterThan(0);
    expect(anthropic.length + deepseek.length).toBe(edgeModels.length);
  });

  test('deepseek entries use the V4 back-end names', () => {
    // `deepseek-chat` / `deepseek-reasoner` were discontinued on 2026-07-24; the back-end name is
    // sent verbatim as `model`, so a stale one fails at the provider rather than at build time.
    const backends = Model.forProvider(Provider.edge.id)
      .filter((model) => Model.developer(model.id) === 'com.deepseek')
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
