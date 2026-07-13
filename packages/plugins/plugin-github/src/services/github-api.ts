//
// Copyright 2026 DXOS.org
//

// TODO(wittjosiah): Refactor to use a dfx-style Effect-native client.

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientError from '@effect/platform/HttpClientError';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ParseResult from 'effect/ParseResult';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { Database, type Ref } from '@dxos/echo';
import { Connection } from '@dxos/types';

import { GITHUB_API_BASE } from '../constants';

/** Stored as `AccessToken.token`; sent as `Authorization: Bearer <token>`. */
type GitHubCredentialsValue = {
  token: string;
};

const ACCEPT = 'application/vnd.github+json';
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
  pull_request: Schema.NullOr(GitHubPullRefSchema).pipe(Schema.optional),
});
export type GitHubIssue = Schema.Schema.Type<typeof GitHubIssueSchema>;

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
 * `Effect.provide(GitHubApi.GitHubCredentials.fromConnection(ref))` at the
 * operation boundary.
 */
export class GitHubCredentials extends Context.Tag('@dxos/plugin-github/GitHubCredentials')<
  GitHubCredentials,
  GitHubCredentialsValue
>() {
  static fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
    Layer.effect(
      GitHubCredentials,
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const accessToken = yield* Database.load(connection.accessToken);
        return { token: accessToken.token };
      }),
    );
}

//
// Request pipeline
//

type GitHubEffect<T> = Effect.Effect<
  T,
  HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException,
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
const shouldRetry = (
  error: HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException,
): boolean => {
  if (error instanceof ParseResult.ParseError) {
    return false;
  }
  if (Cause.isTimeoutException(error)) {
    return true;
  }
  if (error._tag === 'RequestError') {
    return true;
  }
  if (error.reason !== 'StatusCode') {
    return true;
  }
  const status = error.response.status;
  return status === 429 || (status >= 500 && status <= 599);
};

const withAuth = (req: HttpClientRequest.HttpClientRequest, creds: GitHubCredentialsValue) =>
  req.pipe(
    HttpClientRequest.setHeader('Authorization', `Bearer ${creds.token}`),
    HttpClientRequest.setHeader('Accept', ACCEPT),
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
const githubRequest = <T>(
  build: () => HttpClientRequest.HttpClientRequest,
  schema: Schema.Schema<T>,
): GitHubEffect<T> =>
  Effect.gen(function* () {
    const creds = yield* GitHubCredentials;
    const httpClient = yield* HttpClient.HttpClient;
    const clientNoTracer = httpClient.pipe(
      HttpClient.withTracerDisabledWhen(() => true),
      HttpClient.filterStatusOk,
    );
    return yield* clientNoTracer.execute(withAuth(build(), creds)).pipe(
      Effect.flatMap((res) => Effect.flatMap(res.json, Schema.decodeUnknown(schema))),
      Effect.timeout('15 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(3))),
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

const githubPaginated = <T>(
  buildInitial: () => HttpClientRequest.HttpClientRequest,
  itemSchema: Schema.Schema<T>,
): GitHubEffect<readonly T[]> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const creds = yield* GitHubCredentials;
    const clientNoTracer = httpClient.pipe(
      HttpClient.withTracerDisabledWhen(() => true),
      HttpClient.filterStatusOk,
    );
    const arraySchema = Schema.Array(itemSchema);

    let nextUrl: string | undefined;
    let request = withAuth(buildInitial(), creds).pipe(HttpClientRequest.appendUrlParam('per_page', '100'));
    const out: T[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const result = yield* clientNoTracer.execute(request).pipe(
        Effect.flatMap((res) =>
          Effect.gen(function* () {
            const body = yield* res.json;
            const decoded = yield* Schema.decodeUnknown(arraySchema)(body);
            return { decoded, link: res.headers['link'] };
          }),
        ),
        Effect.timeout('15 seconds'),
        Effect.retry({
          schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(3))),
          while: shouldRetry,
        }),
        Effect.scoped,
      );

      out.push(...result.decoded);
      nextUrl = getNextLink(result.link);
      if (!nextUrl) {
        break;
      }
      request = withAuth(HttpClientRequest.get(nextUrl), creds);
    }

    return out;
  });

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
 * PATCH a GitHub object. The shape mirrors {@link githubRequest} except the
 * request method is PATCH and the body is `application/json`. Failures are
 * propagated unchanged; the caller is expected to surface them on the target
 * row's `lastError`. Retry rules are the same — 429 / 5xx retry, 4xx don't.
 */
const githubPatch = <T>(
  build: () => HttpClientRequest.HttpClientRequest,
  body: Record<string, unknown>,
  schema: Schema.Schema<T>,
): GitHubEffect<T> =>
  Effect.gen(function* () {
    const creds = yield* GitHubCredentials;
    const httpClient = yield* HttpClient.HttpClient;
    const clientNoTracer = httpClient.pipe(
      HttpClient.withTracerDisabledWhen(() => true),
      HttpClient.filterStatusOk,
    );
    const request = withAuth(build(), creds).pipe(HttpClientRequest.bodyUnsafeJson(body));
    return yield* clientNoTracer.execute(request).pipe(
      Effect.flatMap((res) => Effect.flatMap(res.json, Schema.decodeUnknown(schema))),
      Effect.timeout('15 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(3))),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
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
  githubPatch(
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
  githubPatch(
    () => HttpClientRequest.patch(`${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`),
    input as unknown as Record<string, unknown>,
    GitHubRepoSchema,
  );
