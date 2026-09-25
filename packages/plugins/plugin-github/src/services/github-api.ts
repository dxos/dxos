//
// Copyright 2026 DXOS.org
//

// TODO(wittjosiah): Refactor to use a dfx-style Effect-native client.

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import { Database, type Ref } from '@dxos/echo';
import { type AccessToken, Connection } from '@dxos/link';

import { GITHUB_API_BASE } from '../constants.ts';

/** Stored as `AccessToken.token`; sent as `Authorization: Bearer <token>`. Empty means anonymous. */
type GitHubCredentialsValue = {
  token: string;
};

const ACCEPT = 'application/vnd.github+json';
/** Serves a pull request as the unified diff git would produce, rather than as JSON. */
const DIFF_ACCEPT = 'application/vnd.github.v3.diff';
const API_VERSION = '2022-11-28';
const USER_AGENT = '@dxos/plugin-github';

//
// Subset schemas for the responses we care about
//

const GitHubUserSchema = Schema.Struct({
  id: Schema.Number,
  login: Schema.String,
  name: Schema.NullOr(Schema.String).pipe(Schema.optional),
  email: Schema.NullOr(Schema.String).pipe(Schema.optional),
  avatar_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
  html_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
  bio: Schema.NullOr(Schema.String).pipe(Schema.optional),
  company: Schema.NullOr(Schema.String).pipe(Schema.optional),
  type: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type GitHubUser = Schema.Schema.Type<typeof GitHubUserSchema>;

const GitHubOrgSchema = Schema.Struct({
  id: Schema.Number,
  login: Schema.String,
  description: Schema.NullOr(Schema.String).pipe(Schema.optional),
  name: Schema.NullOr(Schema.String).pipe(Schema.optional),
  blog: Schema.NullOr(Schema.String).pipe(Schema.optional),
  avatar_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
  html_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
  location: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type GitHubOrg = Schema.Schema.Type<typeof GitHubOrgSchema>;

const GitHubRepoSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  full_name: Schema.String,
  description: Schema.NullOr(Schema.String).pipe(Schema.optional),
  html_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
  homepage: Schema.NullOr(Schema.String).pipe(Schema.optional),
  archived: Schema.Boolean.pipe(Schema.optional),
  disabled: Schema.Boolean.pipe(Schema.optional),
  fork: Schema.Boolean.pipe(Schema.optional),
  default_branch: Schema.NullOr(Schema.String).pipe(Schema.optional),
  owner: Schema.Struct({ id: Schema.Number, login: Schema.String }),
});
export type GitHubRepo = Schema.Schema.Type<typeof GitHubRepoSchema>;

const GitHubLabelSchema = Schema.Struct({
  name: Schema.String,
});

const GitHubPullRefSchema = Schema.Struct({
  url: Schema.String,
  merged_at: Schema.NullOr(Schema.String).pipe(Schema.optional),
});

const GitHubMilestoneSchema = Schema.Struct({
  id: Schema.Number,
  number: Schema.Number,
  title: Schema.String,
  description: Schema.NullOr(Schema.String).pipe(Schema.optional),
  state: Schema.NullOr(Schema.String).pipe(Schema.optional),
  /** ISO datetime, unlike the date-only shape the local model stores. */
  due_on: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type GitHubMilestone = Schema.Schema.Type<typeof GitHubMilestoneSchema>;

const GitHubIssueSchema = Schema.Struct({
  id: Schema.Number,
  number: Schema.Number,
  title: Schema.String,
  body: Schema.NullOr(Schema.String).pipe(Schema.optional),
  state: Schema.String,
  state_reason: Schema.NullOr(Schema.String).pipe(Schema.optional),
  html_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
  comments: Schema.Number.pipe(Schema.optional),
  comments_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
  created_at: Schema.NullOr(Schema.String).pipe(Schema.optional),
  updated_at: Schema.NullOr(Schema.String).pipe(Schema.optional),
  closed_at: Schema.NullOr(Schema.String).pipe(Schema.optional),
  user: Schema.NullOr(GitHubUserSchema).pipe(Schema.optional),
  assignees: Schema.Array(GitHubUserSchema).pipe(Schema.optional),
  labels: Schema.Array(GitHubLabelSchema).pipe(Schema.optional),
  milestone: Schema.NullOr(GitHubMilestoneSchema).pipe(Schema.optional),
  pull_request: Schema.NullOr(GitHubPullRefSchema).pipe(Schema.optional),
});
export type GitHubIssue = Schema.Schema.Type<typeof GitHubIssueSchema>;

/** GET /repos/{owner}/{repo}/pulls/{number} — the pull-request view, which alone carries the diff size and merge state. */
const GitHubPullSchema = Schema.Struct({
  id: Schema.Number,
  number: Schema.Number,
  title: Schema.String,
  body: Schema.NullOr(Schema.String).pipe(Schema.optional),
  state: Schema.String,
  draft: Schema.Boolean.pipe(Schema.optional),
  merged: Schema.Boolean.pipe(Schema.optional),
  merged_at: Schema.NullOr(Schema.String).pipe(Schema.optional),
  html_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
  user: Schema.NullOr(GitHubUserSchema).pipe(Schema.optional),
  labels: Schema.Array(GitHubLabelSchema).pipe(Schema.optional),
  additions: Schema.Number.pipe(Schema.optional),
  deletions: Schema.Number.pipe(Schema.optional),
  // `sha` pins the commit a derived artefact (a generated walkthrough) describes; `ref` is a branch
  // name and moves under it.
  base: Schema.Struct({ ref: Schema.String, sha: Schema.String.pipe(Schema.optional) }).pipe(Schema.optional),
  head: Schema.Struct({ ref: Schema.String, sha: Schema.String.pipe(Schema.optional) }).pipe(Schema.optional),
});
export type GitHubPull = Schema.Schema.Type<typeof GitHubPullSchema>;

const GitHubCommentSchema = Schema.Struct({
  id: Schema.Number,
  body: Schema.NullOr(Schema.String).pipe(Schema.optional),
  user: Schema.NullOr(GitHubUserSchema).pipe(Schema.optional),
  created_at: Schema.NullOr(Schema.String).pipe(Schema.optional),
  updated_at: Schema.NullOr(Schema.String).pipe(Schema.optional),
  html_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type GitHubComment = Schema.Schema.Type<typeof GitHubCommentSchema>;

//
// Credentials service
//

/**
 * Layer-based credentials service. Mirrors `TrelloCredentials`: every API call
 * pulls the token from this service rather than threading it through as an
 * explicit parameter, so callers compose a single
 * `Effect.provide(GitHubApi.fromConnection(ref))` at the
 * operation boundary.
 *
 * Token sourcing: an operation invoked with a `Connection` composes
 * `fromConnection(ref)`; one invoked with an external-sync cursor composes
 * `fromAccessToken(cursor.spec.source)` directly (the cursor no longer relates
 * to `Connection`).
 */
export class GitHubCredentials extends Context.Service<GitHubCredentials, GitHubCredentialsValue>()(
  '@dxos/plugin-github/GitHubCredentials',
) {}

/** Creates a credentials layer from an AccessToken ref. Loads it and returns its `token`. */
export const fromAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken>) =>
  Layer.effect(
    GitHubCredentials,
    Effect.gen(function* () {
      const accessToken = yield* Database.load(accessTokenRef);
      return { token: accessToken.token };
    }),
  );

/** Creates a credentials layer from a Connection ref. Loads its `accessToken` and returns its `token`. */
export const fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
  Layer.effect(
    GitHubCredentials,
    Effect.gen(function* () {
      const connection = yield* Database.load(connectionRef);
      const accessToken = yield* Database.load(connection.accessToken);
      return { token: accessToken.token };
    }),
  );

//
// Request pipeline
//

export type GitHubEffect<T> = Effect.Effect<
  T,
  HttpClientError.HttpClientError | Schema.SchemaError | Cause.TimeoutError,
  HttpClient.HttpClient | GitHubCredentials
>;

/**
 * Decide whether a GitHub request failure is worth retrying.
 *  - Transport / encode failures: yes (transient by nature).
 *  - 429 / 5xx: yes — exactly the cases retry was designed for.
 *  - 4xx other than 429 (auth, validation, not-found): no — wastes time and
 *    may exacerbate rate limiting on the same token.
 *  - TimeoutException: yes.
 *  - Schema decode failures (`ParseError`): no — payload won't become valid on retry.
 */
const shouldRetry = (error: HttpClientError.HttpClientError | Schema.SchemaError | Cause.TimeoutError): boolean => {
  if (error instanceof Schema.SchemaError) {
    return false;
  }
  if (Cause.isTimeoutError(error)) {
    return true;
  }
  // v4 hangs the specific failure off `HttpClientError.reason`: a transport-level failure is always
  // worth retrying, and a response failure only on 429/5xx.
  if (error.reason._tag !== 'StatusCodeError') {
    return true;
  }
  const status = error.reason.response.status;
  return status === 429 || (status >= 500 && status <= 599);
};

/**
 * The status a failed GitHub request answered with, or `undefined` for a transport, timeout or
 * decode failure. Callers branch on it to tell a dead credential (401) from an absent resource.
 */
export const responseStatus = (error: unknown): number | undefined =>
  HttpClientError.isHttpClientError(error) && error.reason._tag === 'StatusCodeError'
    ? error.reason.response.status
    : undefined;

/** Anonymous when the token is empty: a bare `Bearer` header is rejected where no header is rate-limited. */
const withAuth = (req: HttpClientRequest.HttpClientRequest, creds: GitHubCredentialsValue, accept = ACCEPT) =>
  req.pipe(
    (req) => (creds.token ? HttpClientRequest.setHeader(req, 'Authorization', `Bearer ${creds.token}`) : req),
    HttpClientRequest.setHeader('Accept', accept),
    HttpClientRequest.setHeader('X-GitHub-Api-Version', API_VERSION),
    HttpClientRequest.setHeader('User-Agent', USER_AGENT),
  );

/**
 * Build an unauthenticated GitHub API request, fetch + decode it as a single JSON
 * response, and apply timeout + retry. `withAuth` is applied here so callers never
 * have to remember to attach credentials (forgetting would silently 401).
 *
 * `filterStatusOk` converts non-2xx responses into a typed `ResponseError`
 * (carrying `status` and the raw body) BEFORE we try to decode the body —
 * otherwise GitHub error envelopes (`{ message, documentation_url }`) would
 * blow up against the success schema with a `ParseError`, masking the real
 * cause (e.g. a 403 from an integration token that lacks issue write).
 */
const githubRequest = <T>(build: () => HttpClientRequest.HttpClientRequest, schema: Schema.Codec<T>): GitHubEffect<T> =>
  Effect.gen(function* () {
    const creds = yield* GitHubCredentials;
    const httpClient = yield* HttpClient.HttpClient;
    const clientNoTracer = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
      HttpClient.filterStatusOk,
    );
    return yield* clientNoTracer.execute(withAuth(build(), creds)).pipe(
      Effect.flatMap((res) => Effect.flatMap(res.json, Schema.decodeUnknownEffect(schema))),
      Effect.timeout('15 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.upTo({ times: 3 })),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
  });

/**
 * Fetch a response GitHub serves as text rather than JSON — the `diff` media type, which has no
 * schema to decode against.
 *
 * The timeout is longer than `githubRequest`'s because a diff is the whole change rather than a
 * summary of it. GitHub answers 406 rather than truncating when a pull request exceeds its own
 * limits (roughly 300 files or 20k lines), which `filterStatusOk` surfaces as a typed failure.
 */
const githubText = (build: () => HttpClientRequest.HttpClientRequest, accept: string): GitHubEffect<string> =>
  Effect.gen(function* () {
    const creds = yield* GitHubCredentials;
    const httpClient = yield* HttpClient.HttpClient;
    const clientNoTracer = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
      HttpClient.filterStatusOk,
    );
    return yield* clientNoTracer.execute(withAuth(build(), creds, accept)).pipe(
      Effect.flatMap((res) => res.text),
      Effect.timeout('60 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.upTo({ times: 3 })),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
  });

//
// Pagination
//

/**
 * Walk paginated GitHub list endpoints by following `Link: <…>; rel="next"`.
 *
 * Sets `per_page=100` automatically; aggregates pages into a single array.
 * Returns the empty array if the first page is empty. Stops at `MAX_PAGES`
 * to bound memory + traffic for very large orgs/repos — in v1 we accept that
 * the very largest orgs may be partially synced and surface a TODO to add
 * cursor support.
 */
const MAX_PAGES = 10;

const getNextLink = (header: string | undefined): string | undefined => {
  if (!header) {
    return undefined;
  }
  // Link: <url>; rel="next", <url>; rel="last", …
  for (const part of header.split(',')) {
    const match = part.trim().match(/^<([^>]+)>;\s*rel="([^"]+)"$/);
    if (match && match[2] === 'next') {
      return match[1];
    }
  }
  return undefined;
};

/**
 * Walks `rel="next"` to the end, decoding each page with `pageSchema` and taking its items through
 * `select` — an endpoint that answers with an envelope rather than a bare array pages the same way.
 */
const githubPages = <TPage, T>(
  buildInitial: () => HttpClientRequest.HttpClientRequest,
  pageSchema: Schema.Codec<TPage>,
  select: (page: TPage) => readonly T[],
): GitHubEffect<readonly T[]> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const creds = yield* GitHubCredentials;
    const clientNoTracer = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
      HttpClient.filterStatusOk,
    );

    let nextUrl: string | undefined;
    let request = withAuth(buildInitial(), creds).pipe(HttpClientRequest.appendUrlParam('per_page', '100'));
    const out: T[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const result = yield* clientNoTracer.execute(request).pipe(
        Effect.flatMap((res) =>
          Effect.gen(function* () {
            const body = yield* res.json;
            const decoded = yield* Schema.decodeUnknownEffect(pageSchema)(body);
            return { decoded, link: res.headers['link'] };
          }),
        ),
        Effect.timeout('15 seconds'),
        Effect.retry({
          schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.upTo({ times: 3 })),
          while: shouldRetry,
        }),
        Effect.scoped,
      );

      out.push(...select(result.decoded));
      nextUrl = getNextLink(result.link);
      if (!nextUrl) {
        break;
      }
      request = withAuth(HttpClientRequest.get(nextUrl), creds);
    }

    return out;
  });

const githubPaginated = <T>(
  buildInitial: () => HttpClientRequest.HttpClientRequest,
  itemSchema: Schema.Codec<T>,
): GitHubEffect<readonly T[]> => githubPages(buildInitial, Schema.Array(itemSchema), (page) => page);

//
// API surface
//

/** GET /user — authenticated user profile. */
export const fetchUser = (): GitHubEffect<GitHubUser> =>
  githubRequest(() => HttpClientRequest.get(`${GITHUB_API_BASE}/user`), GitHubUserSchema);

/** GET /user/orgs — orgs visible to the authenticated user. */
export const fetchUserOrgs = (): GitHubEffect<readonly GitHubOrg[]> =>
  githubPaginated(() => HttpClientRequest.get(`${GITHUB_API_BASE}/user/orgs`), GitHubOrgSchema);

/**
 * GET /user/repos — every repo the authenticated user can see.
 *
 * Includes owner, collaborator, and org-member affiliations. For a GitHub App
 * user-to-server token this is intersected with the App's installation scope —
 * admins control which repos are visible by choosing All / Selected at install
 * time.
 */
export const fetchUserRepos = (): GitHubEffect<readonly GitHubRepo[]> =>
  githubPaginated(() => HttpClientRequest.get(`${GITHUB_API_BASE}/user/repos`), GitHubRepoSchema);

/** GET /orgs/{org} — full org metadata. */
export const fetchOrg = (org: string): GitHubEffect<GitHubOrg> =>
  githubRequest(() => HttpClientRequest.get(`${GITHUB_API_BASE}/orgs/${encodeURIComponent(org)}`), GitHubOrgSchema);

/** GET /orgs/{org}/members — public + private members (depends on token). */
export const fetchOrgMembers = (org: string): GitHubEffect<readonly GitHubUser[]> =>
  githubPaginated(
    () => HttpClientRequest.get(`${GITHUB_API_BASE}/orgs/${encodeURIComponent(org)}/members`),
    GitHubUserSchema,
  );

/** GET /users/{login} — full user profile (org members lists return a partial form). */
export const fetchUserByLogin = (login: string): GitHubEffect<GitHubUser> =>
  githubRequest(() => HttpClientRequest.get(`${GITHUB_API_BASE}/users/${encodeURIComponent(login)}`), GitHubUserSchema);

/** GET /orgs/{org}/repos — repos owned by the org. */
export const fetchOrgRepos = (org: string): GitHubEffect<readonly GitHubRepo[]> =>
  githubPaginated(
    () => HttpClientRequest.get(`${GITHUB_API_BASE}/orgs/${encodeURIComponent(org)}/repos`),
    GitHubRepoSchema,
  );

/**
 * GET /repos/{owner}/{repo}/issues — both issues AND pull requests.
 *
 * `state=all` includes closed. PRs are distinguishable by a non-null
 * `pull_request` field. `since` is an optional ISO timestamp; when provided,
 * GitHub returns only issues updated at or after that point — we use this
 * for incremental syncs.
 */
export const fetchRepoIssues = (
  owner: string,
  repo: string,
  options: { since?: string } = {},
): GitHubEffect<readonly GitHubIssue[]> =>
  githubPaginated(() => {
    let req = HttpClientRequest.get(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
    ).pipe(HttpClientRequest.appendUrlParam('state', 'all'));
    if (options.since) {
      req = req.pipe(HttpClientRequest.appendUrlParam('since', options.since));
    }
    return req;
  }, GitHubIssueSchema);

/** GET /repos/{owner}/{repo}. */
export const fetchRepo = (owner: string, repo: string): GitHubEffect<GitHubRepo> =>
  githubRequest(
    () => HttpClientRequest.get(`${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`),
    GitHubRepoSchema,
  );

/** GET /repos/{owner}/{repo}/issues/{number} — an issue, or the issue view of a pull request. */
export const fetchIssue = (owner: string, repo: string, number: number): GitHubEffect<GitHubIssue> =>
  githubRequest(
    () =>
      HttpClientRequest.get(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`,
      ),
    GitHubIssueSchema,
  );

/** GET /repos/{owner}/{repo}/pulls/{number}. */
export const fetchPullRequest = (owner: string, repo: string, number: number): GitHubEffect<GitHubPull> =>
  githubRequest(
    () =>
      HttpClientRequest.get(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`,
      ),
    GitHubPullSchema,
  );

/**
 * GET /repos/{owner}/{repo}/pulls/{number} as a unified diff — the same bytes `git diff` would
 * produce, which is what a generated walkthrough splices its chunks from.
 */
export const fetchPullRequestDiff = (owner: string, repo: string, number: number): GitHubEffect<string> =>
  githubText(
    () =>
      HttpClientRequest.get(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`,
      ),
    DIFF_ACCEPT,
  );

/**
 * GET /repos/{owner}/{repo}/milestones — `state=all` so closed milestones stay mirrored (the
 * issues still assigned to them have to resolve to something).
 */
export const fetchRepoMilestones = (owner: string, repo: string): GitHubEffect<readonly GitHubMilestone[]> =>
  githubPaginated(
    () =>
      HttpClientRequest.get(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/milestones`,
      ).pipe(HttpClientRequest.appendUrlParam('state', 'all')),
    GitHubMilestoneSchema,
  );

/** GET /repos/{owner}/{repo}/issues/{number}/comments. */
export const fetchIssueComments = (
  owner: string,
  repo: string,
  issueNumber: number,
): GitHubEffect<readonly GitHubComment[]> =>
  githubPaginated(
    () =>
      HttpClientRequest.get(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
      ),
    GitHubCommentSchema,
  );

//
// Mutations (push)
//

/**
 * Write to a GitHub object (PATCH or POST, as `build` chooses). The shape mirrors {@link githubRequest} except the
 * body is `application/json`. Failures are
 * propagated unchanged; the caller is expected to surface them on the target
 * row's `lastError`.
 *
 * Only PATCH retries (429 / 5xx retry, 4xx don't). A POST here creates a comment or a review, and
 * GitHub can commit one before the response reaches us, so retrying a timeout would post it twice.
 */
const githubWrite = <T>(
  build: () => HttpClientRequest.HttpClientRequest,
  body: Record<string, unknown>,
  schema: Schema.Codec<T>,
): GitHubEffect<T> =>
  Effect.gen(function* () {
    const creds = yield* GitHubCredentials;
    const httpClient = yield* HttpClient.HttpClient;
    const clientNoTracer = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
      HttpClient.filterStatusOk,
    );
    const request = withAuth(build(), creds).pipe(HttpClientRequest.bodyJsonUnsafe(body));
    const attempt = clientNoTracer.execute(request).pipe(
      Effect.flatMap((res) => Effect.flatMap(res.json, Schema.decodeUnknownEffect(schema))),
      Effect.timeout('15 seconds'),
    );
    return yield* (
      request.method === 'PATCH'
        ? attempt.pipe(
            Effect.retry({
              schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.upTo({ times: 3 })),
              while: shouldRetry,
            }),
          )
        : attempt
    ).pipe(Effect.scoped);
  });

export type IssueUpdateInput = {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  state_reason?: 'completed' | 'not_planned' | 'reopened' | null;
};

/**
 * PATCH /repos/{owner}/{repo}/issues/{number} — update title / body / state.
 *
 * GitHub conflates issues and PRs at this endpoint: the same PATCH works for
 * both, but PR-specific fields (head/base/draft) must go through the
 * `/pulls/{n}` endpoint. We only touch issue-mappable fields here.
 */
export const updateIssue = (
  owner: string,
  repo: string,
  issueNumber: number,
  input: IssueUpdateInput,
): GitHubEffect<GitHubIssue> =>
  githubWrite(
    () =>
      HttpClientRequest.patch(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
      ),
    input as unknown as Record<string, unknown>,
    GitHubIssueSchema,
  );

export type RepoUpdateInput = {
  /** GitHub allows the owner of a repo to rename it; this is rare and risky and we currently don't push it. */
  name?: string;
  description?: string;
  homepage?: string;
};

/**
 * PATCH /repos/{owner}/{repo} — update repo description and a small set of
 * mapped metadata. Renames (`name`) are accepted by the API but we don't push
 * them by default: a rename invalidates clones, breaks pinned URLs, and is
 * almost never what a user wants from a sync mirror.
 */
export const updateRepo = (owner: string, repo: string, input: RepoUpdateInput): GitHubEffect<GitHubRepo> =>
  githubWrite(
    () => HttpClientRequest.patch(`${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`),
    input as unknown as Record<string, unknown>,
    GitHubRepoSchema,
  );

const GitHubReviewSchema = Schema.Struct({
  id: Schema.Number,
  state: Schema.String,
  html_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type GitHubReview = Schema.Schema.Type<typeof GitHubReviewSchema>;

/** POST /repos/{owner}/{repo}/pulls/{number}/reviews with `event: APPROVE`. */
export const approvePullRequest = (
  owner: string,
  repo: string,
  number: number,
  body?: string,
): GitHubEffect<GitHubReview> =>
  githubWrite(
    () =>
      HttpClientRequest.post(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/reviews`,
      ),
    { event: 'APPROVE', ...(body ? { body } : {}) },
    GitHubReviewSchema,
  );

/** POST /repos/{owner}/{repo}/issues/{number}/comments — a conversation comment, which a pull request shares with issues. */
export const createIssueComment = (
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): GitHubEffect<GitHubComment> =>
  githubWrite(
    () =>
      HttpClientRequest.post(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
      ),
    { body },
    GitHubCommentSchema,
  );

const GitHubCheckRunSchema = Schema.Struct({
  name: Schema.String,
  /** `queued`, `in_progress` or `completed`. */
  status: Schema.String,
  /** Set once `completed`: `success`, `failure`, `neutral`, `cancelled`, `skipped`, `timed_out`, `action_required`. */
  conclusion: Schema.NullOr(Schema.String).pipe(Schema.optional),
  html_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
  /** The provider's own page for the run (Depot, say), which GitHub's `html_url` only links back to. */
  details_url: Schema.NullOr(Schema.String).pipe(Schema.optional),
  started_at: Schema.NullOr(Schema.String).pipe(Schema.optional),
  completed_at: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type GitHubCheckRun = Schema.Schema.Type<typeof GitHubCheckRunSchema>;

const GitHubCheckRunsSchema = Schema.Struct({
  total_count: Schema.Number,
  check_runs: Schema.Array(GitHubCheckRunSchema),
});

/**
 * GET /repos/{owner}/{repo}/commits/{sha}/check-runs — every page, since a truncated list would
 * report a failing commit as green.
 */
export const fetchCheckRuns = (owner: string, repo: string, sha: string): GitHubEffect<readonly GitHubCheckRun[]> =>
  githubPages(
    () =>
      HttpClientRequest.get(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}/check-runs`,
      ),
    GitHubCheckRunsSchema,
    ({ check_runs }) => check_runs,
  );

export type ReviewCommentInput = {
  body: string;
  /** Head SHA the line numbers refer to. */
  commit_id: string;
  path: string;
  line: number;
  /** `LEFT` is the base (removed) side, `RIGHT` the head (added or context) side. */
  side: 'LEFT' | 'RIGHT';
};

/** POST /repos/{owner}/{repo}/pulls/{number}/comments — a review comment on one line of the diff. */
export const createReviewComment = (
  owner: string,
  repo: string,
  number: number,
  input: ReviewCommentInput,
): GitHubEffect<GitHubComment> =>
  githubWrite(
    () =>
      HttpClientRequest.post(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/comments`,
      ),
    input,
    GitHubCommentSchema,
  );
