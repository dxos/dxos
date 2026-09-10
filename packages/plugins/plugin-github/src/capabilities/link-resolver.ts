//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Capability from '@dxos/app-framework/Capability';
import { Database, Filter } from '@dxos/echo';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';
import * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';
import { Issue, PullRequest } from '@dxos/types';

import { GitHubCapabilities } from '#types';

import { GITHUB_PROVIDER_ID } from '../constants';
import { type GitHubLink, parseGitHubLink } from '../extensions';
import { GitHubApi } from '../services';

/**
 * Resolves a GitHub pull-request or issue URL to an in-memory `PullRequest` or `Issue` for the
 * preview popover. The object comes from the contributed `LinkSource` when a host provides one and
 * from the GitHub API otherwise; either way it is built, not stored — a preview is not a sync.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    return Capability.contribute(PreviewCapabilities.LinkResolver, [
      ({ eid }, context) =>
        Effect.gen(function* () {
          const link = parseGitHubLink(eid);
          if (!link) {
            return undefined;
          }
          const [source = fetchFromGitHub] = capabilities.getAll(GitHubCapabilities.LinkSource);
          const object = yield* source(link, context);
          return object && { label: Issue.reference(object), object };
        }),
    ]);
  }),
);

/** The default source: the space's GitHub connection token when it has one, anonymous otherwise. */
const fetchFromGitHub: GitHubCapabilities.GitHubLinkSource = (link, { space }) =>
  Effect.gen(function* () {
    const token = space ? yield* connectionToken(space) : '';
    return yield* fetchLink(link).pipe(Effect.provide(Layer.succeed(GitHubApi.GitHubCredentials, { token })));
  }).pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.tapError((error) => Effect.sync(() => log.warn('github link preview failed', { url: link.url, error }))),
    Effect.catch(() => Effect.succeed(undefined)),
  );

/** The token of the space's first GitHub connection, or empty when it has none. */
const connectionToken = (space: NonNullable<PreviewCapabilities.PreviewLinkContext['space']>) =>
  Effect.gen(function* () {
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    const connection = connections.find((connection) => connection.connectorId === GITHUB_PROVIDER_ID);
    if (!connection) {
      return '';
    }
    const accessToken = yield* Database.load(connection.accessToken);
    return accessToken.token;
  }).pipe(Effect.provide(Database.layer(space.db)));

const fetchLink = (link: GitHubLink) =>
  Effect.gen(function* () {
    if (link.kind === 'pull') {
      return toPullRequest(link, yield* GitHubApi.fetchPullRequest(link.owner, link.repo, link.number));
    }
    const issue = yield* GitHubApi.fetchIssue(link.owner, link.repo, link.number);
    // The issue endpoint answers for a pull request's number too; only the pull endpoint has its diff.
    if (issue.pull_request) {
      return toPullRequest(link, yield* GitHubApi.fetchPullRequest(link.owner, link.repo, link.number));
    }
    return toIssue(link, issue);
  });

const toIssue = ({ owner, repo, number, url }: GitHubLink, issue: GitHubApi.GitHubIssue): Issue.Issue =>
  Issue.make({
    owner,
    repo,
    number,
    title: issue.title,
    url: issue.html_url ?? url,
    state: issue.state === 'closed' ? 'closed' : 'open',
    author: issue.user?.login,
    description: issue.body ?? undefined,
    labels: issue.labels?.map((label) => label.name),
  });

const toPullRequest = ({ owner, repo, number, url }: GitHubLink, pull: GitHubApi.GitHubPull): PullRequest.PullRequest =>
  PullRequest.make({
    owner,
    repo,
    number,
    title: pull.title,
    url: pull.html_url ?? url,
    state:
      pull.merged || pull.merged_at ? 'merged' : pull.draft ? 'draft' : pull.state === 'closed' ? 'closed' : 'open',
    author: pull.user?.login,
    description: pull.body ?? undefined,
    baseBranch: pull.base?.ref,
    headBranch: pull.head?.ref,
    additions: pull.additions,
    deletions: pull.deletions,
  });
