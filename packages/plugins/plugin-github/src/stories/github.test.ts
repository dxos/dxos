//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { parsePullRequestUrl } from './github.ts';

describe('parsePullRequestUrl', () => {
  test('reads owner, repository and number', () => {
    expect(parsePullRequestUrl('https://github.com/dxos/dxos/pull/13082')).to.deep.eq({
      owner: 'dxos',
      repo: 'dxos',
      number: 13082,
    });
  });

  test('tolerates www, a trailing path and surrounding space', () => {
    expect(parsePullRequestUrl('  https://www.github.com/dxos/dxos/pull/13082/files  ')).to.deep.eq({
      owner: 'dxos',
      repo: 'dxos',
      number: 13082,
    });
  });

  test('keeps a query string out of the number', () => {
    expect(parsePullRequestUrl('https://github.com/dxos/dxos/pull/13082?w=1#issuecomment-1')).to.deep.eq({
      owner: 'dxos',
      repo: 'dxos',
      number: 13082,
    });
  });

  test('rejects a query string standing in for the repository', () => {
    expect(parsePullRequestUrl('https://github.com/dxos/dxos?x=/pull/9')).to.eq(undefined);
  });

  test('rejects a number the path continues through', () => {
    expect(parsePullRequestUrl('https://github.com/dxos/dxos/pull/13082x')).to.eq(undefined);
    expect(parsePullRequestUrl('https://github.com/dxos/dxos/pull/13082-old')).to.eq(undefined);
  });

  test('reads a URL copied out of prose, with its punctuation attached', () => {
    for (const trailing of ['.', ',', ')', ']', '>']) {
      expect(parsePullRequestUrl(`https://github.com/dxos/dxos/pull/13082${trailing}`)).to.deep.eq({
        owner: 'dxos',
        repo: 'dxos',
        number: 13082,
      });
    }
  });

  test('ignores the case of the host', () => {
    expect(parsePullRequestUrl('https://GitHub.com/dxos/dxos/pull/13082')).to.deep.eq({
      owner: 'dxos',
      repo: 'dxos',
      number: 13082,
    });
  });

  test('rejects anything that is not a pull request URL', () => {
    expect(parsePullRequestUrl('https://github.com/dxos/dxos/issues/13082')).to.eq(undefined);
    expect(parsePullRequestUrl('not a url')).to.eq(undefined);
  });
});
