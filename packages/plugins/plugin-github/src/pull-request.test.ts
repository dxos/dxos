//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { toPullRequestProps } from './pull-request.ts';
import { type GitHubApi } from './services/index.ts';

const reference = { owner: 'dxos', repo: 'dxos', number: 13031 };

describe('toPullRequestProps', () => {
  test('a reference with no URL of its own gets the canonical one', () => {
    expect(toPullRequestProps(reference, pull()).url).toEqual('https://github.com/dxos/dxos/pull/13031');
    expect(
      toPullRequestProps(reference, pull({ html_url: 'https://github.com/dxos/dxos/pull/13031/files' })).url,
    ).toEqual('https://github.com/dxos/dxos/pull/13031/files');
  });

  test('the four state signals fold into one', () => {
    expect(toPullRequestProps(reference, pull()).state).toEqual('open');
    expect(toPullRequestProps(reference, pull({ draft: true })).state).toEqual('draft');
    expect(toPullRequestProps(reference, pull({ state: 'closed' })).state).toEqual('closed');
    // A merged pull request is closed too, and merged is the more specific answer.
    expect(toPullRequestProps(reference, pull({ state: 'closed', merged_at: '2026-09-01T00:00:00Z' })).state).toEqual(
      'merged',
    );
  });
});

const pull = (overrides: Partial<GitHubApi.GitHubPull> = {}): GitHubApi.GitHubPull => ({
  id: 1,
  number: reference.number,
  title: 'Walkthroughs',
  state: 'open',
  ...overrides,
});
