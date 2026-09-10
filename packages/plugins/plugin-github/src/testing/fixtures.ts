//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { random } from '@dxos/random';
import { Issue, PullRequest, Repo } from '@dxos/types';

import { type GitHubCapabilities } from '#types';

import { type GitHubLink } from '../extensions';

// Kept out of the story modules: react-refresh only fast-refreshes a module whose exports are all
// components, so factories exported beside a story force a full page reload on every edit.

/** Deterministic per link, so a re-hover shows the same fixture. */
const seedFor = (link: GitHubLink) =>
  random.seed(link.url.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 1));

export const createRepo = (
  link: GitHubLink = { owner: 'dxos', repo: 'dxos', kind: 'repo', url: 'https://github.com/dxos/dxos' },
): Repo.Repo => {
  seedFor(link);
  return Repo.make({
    owner: link.owner,
    name: link.repo,
    url: link.url,
    description: random.lorem.paragraph(),
    defaultBranch: 'main',
  });
};

export const createIssue = (
  link: GitHubLink = {
    owner: 'dxos',
    repo: 'dxos',
    kind: 'issue',
    number: 1,
    url: 'https://github.com/dxos/dxos/issues/1',
  },
): Issue.Issue => {
  seedFor(link);
  return Issue.make({
    owner: link.owner,
    repo: link.repo,
    number: link.number ?? 0,
    url: link.url,
    title: random.lorem.sentence(),
    state: random.helpers.arrayElement(['open', 'closed'] as const),
    author: random.person.fullName(),
    description: random.lorem.paragraph(),
    labels: ['bug', 'editor'],
  });
};

export const createPullRequest = (
  link: GitHubLink = {
    owner: 'dxos',
    repo: 'dxos',
    kind: 'pull',
    number: 13007,
    url: 'https://github.com/dxos/dxos/pull/13007',
  },
): PullRequest.PullRequest => {
  seedFor(link);
  return PullRequest.make({
    owner: link.owner,
    repo: link.repo,
    number: link.number ?? 0,
    url: link.url,
    title: random.lorem.sentence(),
    state: random.helpers.arrayElement(['open', 'merged', 'draft', 'closed'] as const),
    author: random.person.fullName(),
    description: random.lorem.paragraph(),
    baseBranch: 'main',
    headBranch: `${random.lorem.word()}/${random.lorem.word()}`,
    additions: random.number.int({ min: 5, max: 900 }),
    deletions: random.number.int({ min: 0, max: 400 }),
  });
};

/** A `LinkSource` answering from fixtures, so a story exercises the resolver without the network. */
export const fixtureLinkSource: GitHubCapabilities.GitHubLinkSource = (link) =>
  Effect.succeed(
    link.kind === 'repo' ? createRepo(link) : link.kind === 'pull' ? createPullRequest(link) : createIssue(link),
  );
