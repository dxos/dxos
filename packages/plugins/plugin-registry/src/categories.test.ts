//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Plugin } from '@dxos/app-framework';

import { getCategoryPredicate } from './categories';

const makePlugin = (key: string, tags?: string[]) =>
  Plugin.make(Plugin.define({ profile: { key, name: key, tags } }))();

const context = { core: [], enabled: [], remoteIds: new Set<string>() };

describe('getCategoryPredicate', () => {
  test('recommended selects the beta and alpha tiers', ({ expect }) => {
    const predicate = getCategoryPredicate('recommended', context);
    expect(predicate(makePlugin('beta-plugin', ['beta']))).toBe(true);
    expect(predicate(makePlugin('alpha-plugin', ['alpha']))).toBe(true);
    expect(predicate(makePlugin('labs-plugin', ['labs']))).toBe(false);
    // An untagged plugin makes no quality claim, so it must not be recommended.
    expect(predicate(makePlugin('untagged-plugin'))).toBe(false);
  });

  test('recommended matches a tier tag in any position', ({ expect }) => {
    const predicate = getCategoryPredicate('recommended', context);
    expect(predicate(makePlugin('alpha-integration', ['alpha', 'integration']))).toBe(true);
    expect(predicate(makePlugin('labs-integration', ['labs', 'integration']))).toBe(false);
  });

  test('recommended excludes core and remote plugins', ({ expect }) => {
    const key = 'org.dxos.plugin.example';
    const plugin = makePlugin(key, ['beta']);
    expect(getCategoryPredicate('recommended', { ...context, core: [key] })(plugin)).toBe(false);
    expect(getCategoryPredicate('recommended', { ...context, remoteIds: new Set([key]) })(plugin)).toBe(false);
  });

  test('labs selects the labs tier regardless of core membership', ({ expect }) => {
    const predicate = getCategoryPredicate('labs', context);
    expect(predicate(makePlugin('labs-plugin', ['labs']))).toBe(true);
    expect(predicate(makePlugin('alpha-plugin', ['alpha']))).toBe(false);
  });
});
