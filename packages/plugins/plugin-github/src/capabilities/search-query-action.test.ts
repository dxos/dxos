//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { meta } from '#meta';

import { matchPullRequestQuery } from './search-query-action.ts';

describe('matchPullRequestQuery', () => {
  test('labels a pull request URL with its coordinates', ({ expect }) => {
    expect(matchPullRequestQuery('https://github.com/dxos/dxos/pull/1234/files')).toEqual({
      label: ['import-pull-request-query.label', { ns: meta.profile.key, reference: 'dxos/dxos#1234' }],
      icon: 'ph--git-pull-request--regular',
    });
  });

  test('accepts the owner/repo#number shorthand and surrounding whitespace', ({ expect }) => {
    expect(matchPullRequestQuery('  dxos/edge#42 ')?.label[1].reference).toBe('dxos/edge#42');
  });

  test('declines text that names no pull request', ({ expect }) => {
    expect(matchPullRequestQuery('dxos')).toBeUndefined();
    expect(matchPullRequestQuery('https://github.com/dxos/dxos')).toBeUndefined();
    expect(matchPullRequestQuery('https://example.com/dxos/dxos/pull/1')).toBeUndefined();
  });
});
