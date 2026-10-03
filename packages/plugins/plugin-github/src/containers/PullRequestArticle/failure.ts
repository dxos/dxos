//
// Copyright 2026 DXOS.org
//

import { GitHubApi } from '../../services/index.ts';

/**
 * Names a pull-request action's failure so the user knows what to do about it.
 *
 * A rejected credential is the one failure the user can fix themselves, and it is indistinguishable
 * from any other error once it reaches the toast as `error.message` — GitHub answers it as a bare
 * `401`, which surfaces as `StatusCode: non 2xx status code (401 GET …)`. Matches the same
 * distinction `ImportPullRequestDialog` already draws on `tokenStatus`.
 */
export const pullRequestFailureKey = (error: unknown, fallbackKey: string): string =>
  GitHubApi.responseStatus(error) === 401 ? 'github-token-rejected.title' : fallbackKey;
