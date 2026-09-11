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
import { Issue, PullRequest, Repo } from '@dxos/types';

import { GitHubCapabilities } from '#types';

import { GITHUB_PROVIDER_ID } from '../constants.ts';
import { type GitHubLink, parseGitHubLink } from '../extensions/index.ts';
import { GitHubApi } from '../services/index.ts';

/**
 * Resolves a GitHub repository, pull-request or issue URL to an in-memory `Repo`, `PullRequest` or
 * `Issue` for the preview popover. The object comes from the contributed `LinkSource` when a host provides one and
 * from the GitHub API otherwise; either way it is built, not stored — a preview is not a sync.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    return Capability.contribute(PreviewCapabilities.LinkResolver, [
      {
        match: (url) => parseGitHubLink(url) !== undefined,
        // How GitHub itself shortens a bare reference: the number, or the repository's full name.
        label: (url) => {
          const link = parseGitHubLink(url);
          return link && (link.number !== undefined ? `#${link.number}` : `${link.owner}/${link.repo}`);
        },
        resolve: ({ eid }, context) =>
          Effect.gen(function* () {
            const link = parseGitHubLink(eid);
            if (!link) {
              return undefined;
            }
            const [source = fetchFromGitHub] = capabilities.getAll(GitHubCapabilities.LinkSource);
            const object = yield* source(link, context);
            return (
              object && { label: Repo.instanceOf(object) ? Repo.fullName(object) : Issue.reference(object), object }
            );
          }),
      },
    ]);
  }),
);

/**
 * The default source: each of the space's GitHub connection tokens in turn — a space can hold
 * several, and only some may reach a private repository — then anonymous, which reaches a public one.
 */
const fetchFromGitHub: GitHubCapabilities.GitHubLinkSource = (link, { space }) =>
  Effect.gen(function* () {
    const tokens = space ? yield* connectionTokens(space) : [];
    for (const token of [...tokens, '']) {
      const object = yield* fetchLink(link).pipe(
        Effect.provide(Layer.succeed(GitHubApi.GitHubCredentials, { token })),
        Effect.tapError((error) => Effect.sync(() => log.warn('github link preview failed', { url: link.url, error }))),
        Effect.catch(() => Effect.succeed(undefined)),
      );
      if (object) {
        return object;
      }
    }
    return undefined;
  }).pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.catch(() => Effect.succeed(undefined)),
  );

/** The tokens of the space's GitHub connections, in query order. */
const connectionTokens = (space: NonNullable<PreviewCapabilities.PreviewLinkContext['space']>) =>
  Effect.gen(function* () {
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    const tokens: string[] = [];
    for (const connection of connections) {
      if (connection.connectorId !== GITHUB_PROVIDER_ID) {
        continue;
      }
      const accessToken = yield* Database.load(connection.accessToken);
      tokens.push(accessToken.token);
    }
    return tokens;
  }).pipe(Effect.provide(Database.layer(space.db)));

const fetchLink = (link: GitHubLink) =>
  Effect.gen(function* () {
    const { owner, repo, number } = link;
    if (link.kind === 'repo' || number === undefined) {
      return toRepo(link, yield* GitHubApi.fetchRepo(owner, repo));
    }
    if (link.kind === 'pull') {
      return toPullRequest(link, yield* GitHubApi.fetchPullRequest(owner, repo, number));
    }
    const issue = yield* GitHubApi.fetchIssue(owner, repo, number);
    // The issue endpoint answers for a pull request's number too; only the pull endpoint has its diff.
    if (issue.pull_request) {
      return toPullRequest(link, yield* GitHubApi.fetchPullRequest(owner, repo, number));
    }
    return toIssue(link, issue);
  });

const toRepo = ({ owner, url }: GitHubLink, repo: GitHubApi.GitHubRepo): Repo.Repo =>
  Repo.make({
    owner,
    name: repo.name,
    url: repo.html_url ?? url,
    description: repo.description ?? undefined,
    defaultBranch: repo.default_branch ?? undefined,
  });

const toIssue = ({ owner, repo, number = 0, url }: GitHubLink, issue: GitHubApi.GitHubIssue): Issue.Issue =>
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

const toPullRequest = (
  { owner, repo, number = 0, url }: GitHubLink,
  pull: GitHubApi.GitHubPull,
): PullRequest.PullRequest =>
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
