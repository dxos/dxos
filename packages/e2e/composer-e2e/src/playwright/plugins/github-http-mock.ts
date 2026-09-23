//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

/**
 * HTTP-level mock for the one GitHub REST endpoint a pull request import reads, so the real client
 * code runs with its network intercepted (`page.route`) rather than against github.com.
 *
 * Mocked by default rather than live for two reasons: an unauthenticated suite shares GitHub's 60
 * requests/hour with every other runner on the same egress address, and the Claude Code sandbox's
 * GitHub gateway answers `405` to the CORS preflight that `Accept: application/vnd.github+json`
 * triggers — so a live fetch fails there for a reason that has nothing to do with the code. Set
 * `DX_E2E_LIVE_GITHUB=true` to skip the interception and read the real pull request.
 */

/** dxos/dxos#1, trimmed to the fields `toPullRequestProps` reads. Closed and unchanging, so it stays true. */
export const PULL_REQUEST_FIXTURE = {
  id: 610446250,
  number: 1,
  title: 'chore: release 1.0.0',
  html_url: 'https://github.com/dxos/dxos/pull/1',
  state: 'closed',
  draft: false,
  merged: false,
  merged_at: null,
  additions: 74,
  deletions: 1,
  user: { id: 41898282, login: 'github-actions[bot]' },
  base: { ref: 'main', sha: '3fc2b23fed0ac15fa5cb79d545e5a508a1c20e48' },
  head: { ref: 'release-v1.0.0', sha: '5d916a0b914f31f75887569154ee88cb68521a12' },
};

export type GitHubHttpMock = {
  /** Endpoints hit, so a test can assert the operation really went to GitHub rather than guessing. */
  calls: string[];
  live: boolean;
};

/** Intercept `GET /repos/:owner/:repo/pulls/:number`; every other github.com request is left alone. */
export const installGitHubMock = async (page: Page): Promise<GitHubHttpMock> => {
  const mock: GitHubHttpMock = { calls: [], live: process.env.DX_E2E_LIVE_GITHUB === 'true' };
  if (mock.live) {
    return mock;
  }

  await page.route('https://api.github.com/repos/*/*/pulls/*', async (route) => {
    mock.calls.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // The app's fetch carries `Accept`, which is not CORS-safelisted, so the route must answer the
      // preflight's terms as GitHub does or the browser rejects the fulfilled response.
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
      body: JSON.stringify(PULL_REQUEST_FIXTURE),
    });
  });

  return mock;
};
