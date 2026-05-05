//
// Copyright 2026 DXOS.org
//

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
import { Integration } from '@dxos/plugin-integration/types';

import { GITHUB_API_BASE } from '../constants';

/** Stored as `AccessToken.token`; sent as `Authorization: Bearer <token>`. */
type GitHubCredentialsValue = {
  token: string;
};

const ACCEPT = 'application/vnd.github+json';
const API_VERSION = '2022-11-28';
const USER_AGENT = '@dxos/plugin-github';

const PageDir = Schema.Literal('next', 'last', 'prev', 'first');

// ── Subset schemas for the responses we care about ─────────────────────────

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

/** Fields accepted by `PATCH /repos/{owner}/{repo}/issues/{number}`. */
export type UpdateIssueInput = {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  state_reason?: 'completed' | 'not_planned' | 'reopened' | null;
};

/** Fields accepted by `POST /repos/{owner}/{repo}/issues`. */
export type CreateIssueInput = {
  title: string;
  body?: string;
};

// ── Credentials service ────────────────────────────────────────────────────

/**
 * Layer-based credentials service. Mirrors `TrelloCredentials`: every API call
 * pulls the token from this service rather than threading it through as an
 * explicit parameter, so callers compose a single
 * `Effect.provide(GitHubApi.GitHubCredentials.fromIntegration(ref))` at the
 * operation boundary.
 */
export class GitHubCredentials extends Context.Tag('@dxos/plugin-github/GitHubCredentials')<
  GitHubCredentials,
  GitHubCredentialsValue
>() {
  static fromIntegration = (integrationRef: Ref.Ref<Integration.Integration>) =>
    Layer.effect(
      GitHubCredentials,
      Effect.gen(function* () {
        const integration = yield* Database.load(integrationRef);
        const accessToken = yield* Database.load(integration.accessToken);
        return { token: accessToken.token };
      }),
    );
}

// ── Request pipeline ───────────────────────────────────────────────────────

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

const runRequest = <T>(request: HttpClientRequest.HttpClientRequest, schema: Schema.Schema<T>): GitHubEffect<T> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const clientNoTracer = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));
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

const githubRequest = <T>(
  build: (creds: GitHubCredentialsValue) => HttpClientRequest.HttpClientRequest,
  schema: Schema.Schema<T>,
): GitHubEffect<T> =>
  Effect.gen(function* () {
    const creds = yield* GitHubCredentials;
    return yield* runRequest(build(creds), schema);
  });

// ── Pagination ─────────────────────────────────────────────────────────────

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
  buildInitial: (creds: GitHubCredentialsValue) => HttpClientRequest.HttpClientRequest,
  itemSchema: Schema.Schema<T>,
): GitHubEffect<readonly T[]> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const creds = yield* GitHubCredentials;
    const clientNoTracer = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));
    const arraySchema = Schema.Array(itemSchema);

    let nextUrl: string | undefined;
    let request = withAuth(buildInitial(creds), creds).pipe(
      HttpClientRequest.appendUrlParam('per_page', '100'),
    );
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

    // Validate to keep Schema.Schema<readonly T[]> type discipline (effectively a no-op).
    void PageDir;
    return out;
  });

// ── API surface ────────────────────────────────────────────────────────────

/** GET /user — authenticated user profile. */
export const fetchUser = (): GitHubEffect<GitHubUser> =>
  githubRequest((creds) => withAuth(HttpClientRequest.get(`${GITHUB_API_BASE}/user`), creds), GitHubUserSchema);

/** GET /user/orgs — orgs visible to the authenticated user. */
export const fetchUserOrgs = (): GitHubEffect<readonly GitHubOrg[]> =>
  githubPaginated((_creds) => HttpClientRequest.get(`${GITHUB_API_BASE}/user/orgs`), GitHubOrgSchema);

/** GET /orgs/{org} — full org metadata. */
export const fetchOrg = (org: string): GitHubEffect<GitHubOrg> =>
  githubRequest(
    (creds) => withAuth(HttpClientRequest.get(`${GITHUB_API_BASE}/orgs/${encodeURIComponent(org)}`), creds),
    GitHubOrgSchema,
  );

/** GET /orgs/{org}/members — public + private members (depends on token). */
export const fetchOrgMembers = (org: string): GitHubEffect<readonly GitHubUser[]> =>
  githubPaginated(
    (_creds) => HttpClientRequest.get(`${GITHUB_API_BASE}/orgs/${encodeURIComponent(org)}/members`),
    GitHubUserSchema,
  );

/** GET /users/{login} — full user profile (org members lists return a partial form). */
export const fetchUserByLogin = (login: string): GitHubEffect<GitHubUser> =>
  githubRequest(
    (creds) => withAuth(HttpClientRequest.get(`${GITHUB_API_BASE}/users/${encodeURIComponent(login)}`), creds),
    GitHubUserSchema,
  );

/** GET /orgs/{org}/repos — repos owned by the org. */
export const fetchOrgRepos = (org: string): GitHubEffect<readonly GitHubRepo[]> =>
  githubPaginated(
    (_creds) => HttpClientRequest.get(`${GITHUB_API_BASE}/orgs/${encodeURIComponent(org)}/repos`),
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
  githubPaginated((_creds) => {
    let req = HttpClientRequest.get(`${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`).pipe(
      HttpClientRequest.appendUrlParam('state', 'all'),
    );
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
    (_creds) =>
      HttpClientRequest.get(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
      ),
    GitHubCommentSchema,
  );

/** PATCH /repos/{owner}/{repo}/issues/{number} — supports both issues and PRs. */
export const updateIssue = (
  owner: string,
  repo: string,
  issueNumber: number,
  input: UpdateIssueInput,
): GitHubEffect<GitHubIssue> =>
  githubRequest(
    (creds) =>
      withAuth(
        HttpClientRequest.patch(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
        ),
        creds,
      ).pipe(HttpClientRequest.bodyUnsafeJson(input)),
    GitHubIssueSchema,
  );

/** POST /repos/{owner}/{repo}/issues — creates a new issue (NOT a PR). */
export const createIssue = (owner: string, repo: string, input: CreateIssueInput): GitHubEffect<GitHubIssue> =>
  githubRequest(
    (creds) =>
      withAuth(
        HttpClientRequest.post(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
        ),
        creds,
      ).pipe(HttpClientRequest.bodyUnsafeJson(input)),
    GitHubIssueSchema,
  );
