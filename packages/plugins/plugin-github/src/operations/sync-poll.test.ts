//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { Milestone, Organization, Person, PullRequest, Repo, Task, TaskSet } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants.ts';
import { type GitHubApi } from '../services/index.ts';
import { syncRepoBinding } from './sync.ts';

//
// A fake api.github.com: serves the issues delta newest first with `since`, pages and ETags, the
// repository with an ETag, and the GraphQL pull-request batch. It records every request it answers.
//

type FakeGitHub = {
  items: GitHubApi.DeltaItem[];
  details: Map<number, GitHubApi.PullRequestDetail>;
  /** Items per page of the delta; GitHub's is 100, small here so a test can span pages. */
  pageSize: number;
  /** A delta page that answers 404, to interrupt a run midway. */
  failPage?: number;
  /** The repository GitHub serves; `REPO` unless set. */
  repo?: GitHubApi.GitHubRepo;
  /** What `/orgs/dxos` answers; 404 (a user-owned repository) unless set. */
  orgStatus?: number;
  requests: string[];
  /** The pull-request numbers each GraphQL request asked for. */
  batches: number[][];
};

const REPO: GitHubApi.GitHubRepo = {
  id: 1234,
  name: 'composer',
  full_name: 'dxos/composer',
  description: 'composer monorepo',
  html_url: 'https://github.com/dxos/composer',
  default_branch: 'main',
  owner: { id: 1, login: 'dxos' },
};

const GraphQLRequest = Schema.Struct({ query: Schema.String });

const etagOf = (body: unknown) => `W/"${createHash('sha1').update(JSON.stringify(body)).digest('hex')}"`;

const fakeFetch =
  (server: FakeGitHub): typeof globalThis.fetch =>
  async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    server.requests.push(
      `${request.method} ${url.pathname}${url.searchParams.get('page') ? `?page=${url.searchParams.get('page')}` : ''}`,
    );
    const ifNoneMatch = request.headers.get('if-none-match');

    if (url.pathname === '/repos/dxos/composer') {
      const repo = server.repo ?? REPO;
      const etag = etagOf(repo);
      return ifNoneMatch === etag ? new Response(null, { status: 304 }) : Response.json(repo, { headers: { etag } });
    }
    if (url.pathname === '/repos/dxos/composer/milestones') {
      return Response.json([]);
    }
    if (url.pathname === '/repos/dxos/composer/issues') {
      const since = url.searchParams.get('since');
      const page = Number(url.searchParams.get('page') ?? '1');
      if (page === server.failPage) {
        return new Response('Not Found', { status: 404 });
      }
      const matching = server.items
        .filter((item) => !since || Date.parse(item.updated_at ?? '') >= Date.parse(since))
        .sort((left, right) => Date.parse(right.updated_at ?? '') - Date.parse(left.updated_at ?? ''));
      if (url.searchParams.get('direction') === 'asc') {
        matching.reverse();
      }
      const body = matching.slice((page - 1) * server.pageSize, page * server.pageSize);
      const etag = etagOf(body);
      if (page === 1 && ifNoneMatch === etag) {
        return new Response(null, { status: 304 });
      }
      const headers: Record<string, string> = { etag };
      if (page * server.pageSize < matching.length) {
        const next = new URL(url);
        next.searchParams.set('page', String(page + 1));
        headers.link = `<${next.toString()}>; rel="next"`;
      }
      return Response.json(body, { headers });
    }
    if (url.pathname === '/graphql') {
      const { query } = Schema.decodeUnknownSync(GraphQLRequest)(await request.json());
      const numbers = [...query.matchAll(/(pr\d+): pullRequest\(number: (\d+)\)/g)].map(
        ([, alias, number]) => [alias, Number(number)] as const,
      );
      server.batches.push(numbers.map(([, number]) => number));
      const repository = Object.fromEntries(
        numbers.map(([alias, number]) => [alias, server.details.get(number) ?? null]),
      );
      return Response.json({ data: { repository } });
    }
    // `/orgs/dxos`: the owner is a user, so there is no organization.
    return new Response('Not Found', { status: url.pathname === '/orgs/dxos' ? (server.orgStatus ?? 404) : 404 });
  };

const issue = (id: number, updatedAt: string, overrides: Partial<GitHubApi.DeltaItem> = {}): GitHubApi.DeltaItem => ({
  id,
  number: id,
  title: `Issue ${id}`,
  body: 'desc',
  state: 'open',
  updated_at: updatedAt,
  ...overrides,
});

const pull = (id: number, updatedAt: string, overrides: Partial<GitHubApi.DeltaItem> = {}): GitHubApi.DeltaItem =>
  issue(id, updatedAt, {
    title: `Pull ${id}`,
    html_url: `https://github.com/dxos/composer/pull/${id}`,
    pull_request: { url: `https://api.github.com/repos/dxos/composer/pulls/${id}`, merged_at: null },
    ...overrides,
  });

const detail = (number: number, overrides: Partial<GitHubApi.PullRequestDetail> = {}): GitHubApi.PullRequestDetail => ({
  number,
  isDraft: false,
  merged: false,
  baseRefName: 'main',
  headRefName: `branch-${number}`,
  headRefOid: 'sha-1',
  additions: 1,
  deletions: 1,
  reviewDecision: null,
  statusCheckRollup: { state: 'SUCCESS' },
  closingIssuesReferences: { nodes: [] },
  ...overrides,
});

describe('plugin-github polling sync (spec/SYNC.mdl)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async (server: Partial<FakeGitHub> = {}) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      AccessToken.AccessToken,
      Connection.Connection,
      Cursor.Cursor,
      Organization.Organization,
      Person.Person,
      TaskSet.TaskSet,
      Task.Task,
      Milestone.Milestone,
      Repo.Repo,
      PullRequest.PullRequest,
    ]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: GITHUB_SOURCE, token: 'tok' }));
    const repo = db.add(
      Repo.make({ [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '1234' }] }, owner: 'dxos', name: 'composer' }),
    );
    const binding = db.add(
      Cursor.makeExternal({ source: Ref.make(token), target: Ref.make(repo), externalId: '1234' }),
    );
    if (!Cursor.isExternal(binding)) {
      throw new Error('expected external-sync cursor');
    }
    const github: FakeGitHub = { items: [], details: new Map(), pageSize: 100, requests: [], batches: [], ...server };

    const services = Layer.mergeAll(
      Database.layer(db),
      Trace.testTraceService().pipe(Layer.provide(Layer.succeed(Trace.TraceSink, { write: () => {} }))),
      Layer.succeed(Operation.Service, {
        invoke: (operation, ..._args) => Effect.fail(new Operation.NoHandlerError(operation.meta.key)),
        schedule: () => Effect.void,
        invokePromise: async () => ({ error: new Error('Operation.Service unused') }),
      }),
      Layer.succeed(Credential.CredentialsService, {
        queryCredentials: async () => [],
        getCredential: async () => {
          throw new Error('the token is stored on the object');
        },
      }),
    );

    /** One poll; `requests` lists only what this poll asked GitHub for. */
    const poll = async () => {
      github.requests = [];
      github.batches = [];
      const result = await syncRepoBinding(binding).pipe(
        Effect.provideService(FetchHttpClient.Fetch, fakeFetch(github)),
        Effect.provide(services),
        EffectEx.runAndForwardErrors,
      );
      return { result, requests: [...github.requests], batches: [...github.batches] };
    };

    const pullRequests = () => db.query(Filter.type(PullRequest.PullRequest)).run();

    return { db, repo, binding, github, poll, pullRequests };
  };

  test('the first poll mirrors issues as Tasks and pull requests as PullRequests on the Repo', async ({ expect }) => {
    const { db, repo, binding, github, poll, pullRequests } = await setup();
    github.items = [issue(1, '2026-10-01T10:00:00Z'), pull(2, '2026-10-01T11:00:00Z')];
    github.details.set(2, detail(2, { closingIssuesReferences: { nodes: [{ databaseId: 1 }] } }));

    const { result } = await poll();

    expect(result.pulled).toEqual({ issues: 1, pullRequests: 1 });
    const [issueSet] = await db.query(Filter.type(TaskSet.TaskSet)).run();
    expect(Obj.getKeys(issueSet, GITHUB_SOURCE)).toEqual([{ source: GITHUB_SOURCE, id: '1234' }]);
    const tasks = await db.query(Filter.type(Task.Task)).run();
    expect(tasks.map((task) => task.title)).toEqual(['Issue 1']);
    const [pullRequest] = await pullRequests();
    expect(pullRequest).toMatchObject({ owner: 'dxos', repo: 'composer', number: 2, state: 'open', checks: 'success' });
    expect(pullRequest.repository?.target?.id).toBe(repo.id);
    expect(pullRequest.closes?.map((ref) => ref.target?.id)).toEqual([tasks[0].id]);
    expect(Obj.getKeys(pullRequest, GITHUB_SOURCE)).toEqual([{ source: GITHUB_SOURCE, id: '2' }]);
    expect(repo).toMatchObject({ url: REPO.html_url, defaultBranch: 'main', description: 'composer monorepo' });
    expect(binding.max).toBe(String(Date.parse('2026-10-01T11:00:00Z') - 5_000));
  });

  test('T-1: a quiet repository costs one request, answered 304', async ({ expect }) => {
    const { github, poll, pullRequests } = await setup();
    github.items = [issue(1, '2026-10-01T10:00:00Z'), pull(2, '2026-10-01T11:00:00Z')];
    github.details.set(2, detail(2));
    await poll();
    // The watermark moved, so the next poll's URL differs from the one the stored ETag describes.
    await poll();
    const before = (await pullRequests()).map((pullRequest) => Obj.getSnapshot(pullRequest));

    const { result, requests } = await poll();

    expect(requests).toEqual(['GET /repos/dxos/composer/issues']);
    expect(result).toMatchObject({ notModified: true, requests: 1, pulled: { issues: 0, pullRequests: 0 } });
    expect((await pullRequests()).map((pullRequest) => Obj.getSnapshot(pullRequest))).toEqual(before);
  });

  test('T-2: an updated pull request costs the delta and one GraphQL batch', async ({ expect }) => {
    const { binding, github, poll, pullRequests } = await setup();
    github.items = [issue(1, '2026-10-01T10:00:00Z'), pull(2, '2026-10-01T11:00:00Z')];
    github.details.set(2, detail(2));
    await poll();
    await poll();

    github.items[1] = pull(2, '2026-10-02T09:00:00Z');
    github.details.set(2, detail(2, { headRefOid: 'sha-2', statusCheckRollup: { state: 'PENDING' } }));
    const { result, requests, batches } = await poll();

    expect(requests).toEqual(['GET /repos/dxos/composer/issues', 'POST /graphql']);
    expect(batches).toEqual([[2]]);
    expect(result).toMatchObject({ notModified: false, requests: 2, pulled: { issues: 0, pullRequests: 1 } });
    const [pullRequest] = await pullRequests();
    expect(pullRequest).toMatchObject({ headSha: 'sha-2', checks: 'pending', updatedAt: '2026-10-02T09:00:00Z' });
    expect(binding.max).toBe(String(Date.parse('2026-10-02T09:00:00Z') - 5_000));
  });

  test('T-3: pending checks are re-read on a poll whose delta answers 304', async ({ expect }) => {
    const { github, poll, pullRequests } = await setup();
    github.items = [pull(2, '2026-10-01T11:00:00Z')];
    github.details.set(2, detail(2, { statusCheckRollup: { state: 'PENDING' } }));
    await poll();
    await poll();
    expect((await pullRequests())[0].checks).toBe('pending');

    // CI finished; nothing about the pull request itself changed.
    github.details.set(2, detail(2, { statusCheckRollup: { state: 'FAILURE' } }));
    const { result, requests, batches } = await poll();

    expect(requests).toEqual(['GET /repos/dxos/composer/issues', 'POST /graphql']);
    expect(batches).toEqual([[2]]);
    expect(result.notModified).toBe(true);
    expect((await pullRequests())[0].checks).toBe('failure');

    // Settled: the next quiet poll is one request again.
    expect((await poll()).requests).toEqual(['GET /repos/dxos/composer/issues']);
  });

  test('T-4: a pull request imported before its repository was bound becomes the synced one', async ({ expect }) => {
    const { db, repo, github, poll, pullRequests } = await setup();
    const imported = db.add(
      PullRequest.make({ owner: 'dxos', repo: 'composer', number: 2, title: 'Imported', state: 'open' }),
    );
    github.items = [pull(2, '2026-10-01T11:00:00Z')];
    github.details.set(2, detail(2));

    await poll();

    const all = await pullRequests();
    expect(all.map((pullRequest) => pullRequest.id)).toEqual([imported.id]);
    expect(imported.title).toBe('Pull 2');
    expect(imported.repository?.target?.id).toBe(repo.id);
    expect(Obj.getKeys(imported, GITHUB_SOURCE)).toEqual([{ source: GITHUB_SOURCE, id: '2' }]);
  });

  test('T-5: a Task the earlier sync made for a pull request is replaced by a PullRequest', async ({ expect }) => {
    const { db, github, poll, pullRequests } = await setup();
    const issueSet = db.add(
      TaskSet.make({ [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '1234' }] }, name: 'dxos/composer' }),
    );
    const legacy = db.add(
      Task.make({
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '2' }] },
        [Obj.Parent]: issueSet,
        title: 'Pull 2',
        status: 'todo',
      }),
    );
    Obj.update(issueSet, (issueSet) => {
      issueSet.tasks.push(Ref.make(legacy));
    });
    github.items = [pull(2, '2026-10-01T11:00:00Z')];
    github.details.set(2, detail(2));

    await poll();

    const [pullRequest] = await pullRequests();
    expect(Obj.getKeys(pullRequest, GITHUB_SOURCE)).toEqual([{ source: GITHUB_SOURCE, id: '2' }]);
    expect(await db.query(Filter.type(Task.Task)).run()).toEqual([]);
    expect(issueSet.tasks).toEqual([]);
  });

  test('T-6: a delta spanning pages advances the watermark only once the last page is applied', async ({ expect }) => {
    const { binding, github, poll } = await setup({ pageSize: 2 });
    github.items = [1, 2, 3, 4, 5].map((id) => issue(id, `2026-10-0${id}T10:00:00Z`));

    // A run that stops on the last page leaves the watermark where it was.
    github.failPage = 3;
    await expect(poll()).rejects.toThrow();
    expect(binding.max).toBeUndefined();
    expect(binding.spec.token).toBeUndefined();

    github.failPage = undefined;
    const { requests } = await poll();

    expect(requests.filter((request) => request.includes('/issues'))).toEqual([
      'GET /repos/dxos/composer/issues',
      'GET /repos/dxos/composer/issues?page=2',
      'GET /repos/dxos/composer/issues?page=3',
    ]);
    expect(binding.max).toBe(String(Date.parse('2026-10-05T10:00:00Z') - 5_000));
  });

  test('a first sync of a large repository backfills oldest first in resumable chunks', async ({ expect }) => {
    const { db, binding, github, poll } = await setup({ pageSize: 1 });
    github.items = Array.from({ length: 12 }, (_, index) =>
      issue(index + 1, `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00Z`),
    );

    // Ten pages, then the run saves its place and asks to run again.
    await expect(poll()).rejects.toThrow();
    expect(github.requests.filter((request) => request.includes('/issues'))).toHaveLength(10);
    expect(binding.max).toBe(String(Date.parse('2026-10-10T10:00:00Z') - 5_000));
    expect(binding.spec.token).toBeUndefined();
    expect(await db.query(Filter.type(Task.Task)).run()).toHaveLength(10);

    // The next run resumes from the watermark, reaches the end and stores the ETag.
    await poll();
    expect(await db.query(Filter.type(Task.Task)).run()).toHaveLength(12);
    expect(binding.max).toBe(String(Date.parse('2026-10-12T10:00:00Z') - 5_000));
    expect(binding.spec.token).toBeDefined();
  });

  test('a backfill chunk updated within the overlap is read to its end rather than repeated', async ({ expect }) => {
    const { db, binding, github, poll } = await setup({ pageSize: 1 });
    github.items = Array.from({ length: 12 }, (_, index) => issue(index + 1, '2026-10-01T10:00:00Z'));

    await expect(poll()).rejects.toThrow();
    expect(await db.query(Filter.type(Task.Task)).run()).toHaveLength(10);

    // Ten more pages from the same watermark would not move it, so this run reads every page.
    const { requests } = await poll();
    expect(requests.filter((request) => request.includes('/issues'))).toHaveLength(10 + 12);
    expect(await db.query(Filter.type(Task.Task)).run()).toHaveLength(12);
    expect(binding.spec.token).toBeDefined();
  });

  test('a local repository description is pushed on a quiet poll', async ({ expect }) => {
    const { repo, github, poll } = await setup();
    github.items = [issue(1, '2026-10-01T10:00:00Z')];
    await poll();
    await poll();
    Obj.update(repo, (repo) => {
      repo.description = 'rewritten';
    });

    // The pending edit is merged against a fresh, conditional read of the repository before it is pushed.
    const { result, requests } = await poll();
    expect(requests).toEqual([
      'GET /repos/dxos/composer',
      'GET /repos/dxos/composer/issues',
      'PATCH /repos/dxos/composer',
    ]);
    expect(result).toMatchObject({ notModified: true, pushed: { repos: 1, issues: 0 } });
  });

  test('a GitHub description edit made since the last read is not overwritten by a local one', async ({ expect }) => {
    const { repo, github, poll } = await setup();
    github.items = [issue(1, '2026-10-01T10:00:00Z')];
    await poll();
    await poll();
    github.repo = { ...REPO, description: 'edited on GitHub' };
    Obj.update(repo, (repo) => {
      repo.description = 'edited in Composer';
    });

    const { requests } = await poll();

    expect(requests).not.toContain('PATCH /repos/dxos/composer');
    expect(repo.description).toBe('edited on GitHub');
  });

  test('settled checks are re-read on the hourly schedule, since a re-run does not move updated_at', async ({
    expect,
  }) => {
    const { binding, github, poll, pullRequests } = await setup();
    github.items = [pull(2, '2026-10-01T11:00:00Z')];
    github.details.set(2, detail(2, { statusCheckRollup: { state: 'FAILURE' } }));
    await poll();
    await poll();
    expect((await pullRequests())[0].checks).toBe('failure');

    // CI re-ran and passed; within the hour the quiet poll does not look.
    github.details.set(2, detail(2, { statusCheckRollup: { state: 'SUCCESS' } }));
    expect((await poll()).requests).toEqual(['GET /repos/dxos/composer/issues']);

    // Once the hourly read is due, every open pull request joins the batch, and milestones are read
    // even though the repository answers 304.
    const snapshot = Cursor.readSnapshot<{ readAt?: number }>(binding, '1234');
    Cursor.writeSnapshot(binding, '1234', { ...snapshot, readAt: 0 });
    const { requests, batches } = await poll();
    expect(requests).toEqual([
      'GET /repos/dxos/composer',
      'GET /repos/dxos/composer/milestones',
      'GET /repos/dxos/composer/issues',
      'POST /graphql',
    ]);
    expect(batches).toEqual([[2]]);
    expect((await pullRequests())[0].checks).toBe('success');
  });

  test('an organization read that fails other than 404 is retried on the next poll', async ({ expect }) => {
    const { binding, github, poll } = await setup({ orgStatus: 403 });
    await poll();
    expect(Cursor.readSnapshot<{ membersReadAt?: number }>(binding, '1234')?.membersReadAt).toBeUndefined();

    github.orgStatus = 404;
    await poll();
    expect(Cursor.readSnapshot<{ membersReadAt?: number }>(binding, '1234')?.membersReadAt).toBeDefined();
  });

  test('a locally edited issue pushes when GitHub next reports it', async ({ expect }) => {
    const { db, github, poll } = await setup();
    github.items = [issue(1, '2026-10-01T10:00:00Z')];
    await poll();
    const [task] = await db.query(Filter.type(Task.Task)).run();
    Obj.update(task, (task) => {
      task.title = 'Edited locally';
    });

    // GitHub reports the issue again (a comment moved `updated_at`); PATCH answers 404 here, which fails the run.
    github.items = [issue(1, '2026-10-03T10:00:00Z')];
    await expect(poll()).rejects.toThrow();
    expect(github.requests).toContain('PATCH /repos/dxos/composer/issues/1');
  });
});
