//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { AccessToken, Connection } from '@dxos/link';
import { MANAGED_ACCESS_TOKEN } from '@dxos/protocols';
import { PullRequest } from '@dxos/types';

import { GITHUB_APP_PROVIDER_ID, GITHUB_PROVIDER_ID, GITHUB_SOURCE } from '../constants.ts';
import { GitHubConnectionUnavailableError } from '../errors.ts';
import { GitHubApi } from '../services/index.ts';
import {
  githubAccess,
  githubReadCredentials,
  githubWriteCredentials,
  resolvePullRequest,
  summarizeCheckRuns,
  summarizeReviews,
  toCheckRun,
} from './pull-request.ts';

describe('summarizeCheckRuns', () => {
  test('no runs is none', () => {
    expect(summarizeCheckRuns([])).toEqual({ ci: 'none', checks: { total: 0, passed: 0, failed: 0, pending: 0 } });
  });

  test('all completed without failure is success, skipped and neutral included', () => {
    const { ci, checks } = summarizeCheckRuns([
      { name: 'build', status: 'completed', conclusion: 'success' },
      { name: 'lint', status: 'completed', conclusion: 'skipped' },
      { name: 'docs', status: 'completed', conclusion: 'neutral' },
    ]);
    expect(ci).toEqual('success');
    expect(checks).toEqual({ total: 3, passed: 3, failed: 0, pending: 0 });
  });

  test('an unfinished run is pending', () => {
    const { ci } = summarizeCheckRuns([
      { name: 'build', status: 'completed', conclusion: 'success' },
      { name: 'test', status: 'in_progress', conclusion: null },
    ]);
    expect(ci).toEqual('pending');
  });

  test('a stale run does not count as passed', () => {
    const { ci, checks } = summarizeCheckRuns([
      { name: 'build', status: 'completed', conclusion: 'success' },
      { name: 'test', status: 'completed', conclusion: 'stale' },
    ]);
    expect(ci).toEqual('failure');
    expect(checks).toEqual({ total: 2, passed: 1, failed: 1, pending: 0 });
  });

  test('a failure wins over pending runs', () => {
    const { ci, checks } = summarizeCheckRuns([
      { name: 'build', status: 'completed', conclusion: 'timed_out' },
      { name: 'test', status: 'queued' },
    ]);
    expect(ci).toEqual('failure');
    expect(checks).toEqual({ total: 2, passed: 0, failed: 1, pending: 1 });
  });
});

describe('toCheckRun', () => {
  test('folds a conclusion into the outcome the list shows', () => {
    expect(toCheckRun({ name: 'test', status: 'completed', conclusion: 'timed_out' }).outcome).toEqual('failure');
    expect(toCheckRun({ name: 'cli', status: 'completed', conclusion: 'skipped' }).outcome).toEqual('skipped');
    expect(toCheckRun({ name: 'e2e', status: 'in_progress', conclusion: null }).outcome).toEqual('pending');
    expect(toCheckRun({ name: 'build', status: 'completed', conclusion: 'success' }).outcome).toEqual('success');
  });

  test("links the provider's page over GitHub's", () => {
    const run = toCheckRun({
      name: 'Check / check',
      status: 'completed',
      conclusion: 'success',
      html_url: 'https://github.com/dxos/dxos/runs/1',
      details_url: 'https://depot.dev/orgs/acme/workflows/abc?job=1',
      started_at: '2026-09-23T12:47:05Z',
      completed_at: '2026-09-23T12:51:13Z',
    });
    expect(run).toEqual({
      name: 'Check / check',
      outcome: 'success',
      conclusion: 'success',
      url: 'https://depot.dev/orgs/acme/workflows/abc?job=1',
      startedAt: '2026-09-23T12:47:05Z',
      completedAt: '2026-09-23T12:51:13Z',
    });
  });
});

describe('summarizeReviews', () => {
  const review = (id: number, login: string, state: string) => ({ id, state, user: { login } });

  test('no reviews is none', () => {
    expect(summarizeReviews([])).toEqual({ review: 'none', approvals: 0 });
  });

  test('a comment alone is no verdict', () => {
    expect(summarizeReviews([review(1, 'alice', 'COMMENTED')])).toEqual({ review: 'none', approvals: 0 });
  });

  test('approvals are counted per reviewer', () => {
    expect(
      summarizeReviews([review(1, 'alice', 'APPROVED'), review(2, 'alice', 'APPROVED'), review(3, 'bob', 'APPROVED')]),
    ).toEqual({ review: 'approved', approvals: 2 });
  });

  test('an outstanding request for changes outweighs approvals', () => {
    expect(summarizeReviews([review(1, 'alice', 'APPROVED'), review(2, 'bob', 'CHANGES_REQUESTED')])).toEqual({
      review: 'changes_requested',
      approvals: 1,
    });
  });

  test("a reviewer's later approval clears their request, and a later comment does not undo it", () => {
    expect(
      summarizeReviews([
        review(1, 'bob', 'CHANGES_REQUESTED'),
        review(2, 'bob', 'APPROVED'),
        review(3, 'bob', 'COMMENTED'),
      ]),
    ).toEqual({ review: 'approved', approvals: 1 });
  });

  test('a dismissed review withdraws the verdict', () => {
    expect(summarizeReviews([review(1, 'bob', 'APPROVED'), review(2, 'bob', 'DISMISSED')])).toEqual({
      review: 'none',
      approvals: 0,
    });
  });
});

describe('GitHub access', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // An app connection's token stays with EDGE; the object holds a placeholder that only the
  // credentials service can turn into the live installation token.
  test("resolves an app connection's custodied token through the credentials service", async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([AccessToken.AccessToken, Connection.Connection]);
    const accessToken = db.add(
      Obj.make(AccessToken.AccessToken, { source: GITHUB_SOURCE, token: MANAGED_ACCESS_TOKEN }),
    );
    db.add(
      Obj.make(Connection.Connection, { connectorId: GITHUB_APP_PROVIDER_ID, accessToken: Ref.make(accessToken) }),
    );
    const credentials = Layer.succeed(Credential.CredentialsService, {
      queryCredentials: async () => [],
      getCredential: async ({ accessTokenId }) => ({
        service: GITHUB_SOURCE,
        apiKey: accessTokenId === accessToken.id ? 'ghs_live' : undefined,
      }),
    });

    const access = await EffectEx.runPromise(
      githubAccess().pipe(Effect.provide(Layer.merge(Database.layer(db), credentials))),
    );

    expect(access).toEqual({ token: 'ghs_live', connected: true });
  });

  /** A credentials service that can resolve nothing, as for an App EDGE will no longer mint for. */
  const unresolvable = Layer.succeed(Credential.CredentialsService, {
    queryCredentials: async () => [],
    getCredential: async () => {
      throw new Error('installation is gone');
    },
  });

  /** A space holding GitHub connections with these tokens, in this order. */
  const withConnections = async (...connections: Array<[token: string, connectorId: string]>) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([AccessToken.AccessToken, Connection.Connection, PullRequest.PullRequest]);
    for (const [token, connectorId] of connections) {
      const accessToken = db.add(Obj.make(AccessToken.AccessToken, { source: GITHUB_SOURCE, token }));
      db.add(Obj.make(Connection.Connection, { connectorId, accessToken: Ref.make(accessToken) }));
    }
    return db;
  };
  const DEAD_APP: [string, string] = [MANAGED_ACCESS_TOKEN, GITHUB_APP_PROVIDER_ID];

  // The user's own token is on the object; only a custodied one needs the credentials service.
  test("reads a user connection's token from the object", async () => {
    const db = await withConnections(['gho_user', GITHUB_PROVIDER_ID]);

    const access = await EffectEx.runPromise(
      githubAccess().pipe(Effect.provide(Layer.merge(Database.layer(db), unresolvable))),
    );

    expect(access).toEqual({ token: 'gho_user', connected: true });
  });

  // An unmintable App token still reads as a connection, so callers can say to fix it rather than
  // to connect GitHub.
  test('reports a custodied token that cannot be resolved as a connection with no token', async () => {
    const db = await withConnections(DEAD_APP);

    const access = await EffectEx.runPromise(
      githubAccess().pipe(Effect.provide(Layer.merge(Database.layer(db), unresolvable))),
    );

    expect(access).toEqual({ token: '', connected: true });
  });

  // The first connection is the one used; a broken one is reported, never silently replaced by
  // another connection acting as someone else.
  test('does not fall through to another connection', async () => {
    const db = await withConnections(DEAD_APP, ['gho_user', GITHUB_PROVIDER_ID]);

    const access = await EffectEx.runPromise(
      githubAccess().pipe(Effect.provide(Layer.merge(Database.layer(db), unresolvable))),
    );

    expect(access).toEqual({ token: '', connected: true });
  });

  // A write has no anonymous fallback, so it fails, typed, in a way the UI maps to "fix your connection".
  test('fails a write when the connection has no token', async () => {
    const db = await withConnections(DEAD_APP);

    const error = await EffectEx.runPromise(
      githubWriteCredentials().pipe(Effect.flip, Effect.provide(Layer.merge(Database.layer(db), unresolvable))),
    );

    expect(GitHubConnectionUnavailableError.is(error)).toBe(true);
  });

  // A read goes anonymous, which reaches a public pull request as it would with no connection.
  test('reads anonymously when the connection has no token', async () => {
    const db = await withConnections(DEAD_APP);

    const token = await EffectEx.runPromise(
      Effect.gen(function* () {
        return (yield* GitHubApi.GitHubCredentials).token;
      }).pipe(
        Effect.provide(
          Layer.unwrap(githubReadCredentials()).pipe(Layer.provide(Layer.merge(Database.layer(db), unresolvable))),
        ),
      ),
    );

    expect(token).toEqual('');
  });

  // Finding the pull request does not depend on its credentials: sync reads with its own fallback.
  test('resolves a stored pull request without its credentials', async () => {
    const db = await withConnections(DEAD_APP);
    const pullRequest = db.add(
      PullRequest.make({ owner: 'dxos', repo: 'dxos', number: 1, title: '#1', state: 'open' }),
    );

    const resolved = await EffectEx.runPromise(resolvePullRequest(Ref.make(pullRequest)));

    expect(resolved.pullRequest).toBe(pullRequest);
  });
});
