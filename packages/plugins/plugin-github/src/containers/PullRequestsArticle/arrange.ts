//
// Copyright 2026 DXOS.org
//

import { type Filter } from '@dxos/echo';
import { matchesFilter } from '@dxos/echo-query';
import { PullRequest, type Task } from '@dxos/types';

import { type GitHubOperation } from '#types';

import type * as PullRequestsView from '../../types/PullRequestsView.ts';

/** The live part of a pull request's standing, read from GitHub rather than stored. */
export type PullRequestChecks = {
  ci: GitHubOperation.CiState;
  checks: GitHubOperation.CheckCounts;
  review: GitHubOperation.ReviewState;
  approvals: number;
};

/** One row of the list: the stored pull request, its live checks once they arrive, and the tasks that list it. */
export type PullRequestRow = {
  pullRequest: PullRequest.PullRequest;
  checks?: PullRequestChecks;
  tasks: readonly Task.Task[];
};

export type PullRequestRowGroup = {
  id: string;
  /** A literal (a repository, an author) or a translation key in the plugin's namespace. */
  label: string;
  translate?: boolean;
  icon: string;
  hue?: string;
  rows: readonly PullRequestRow[];
};

/** What a free-text term searches: what a reader sees in the row. */
const rowText = (pullRequest: PullRequest.PullRequest) => [
  pullRequest.title,
  PullRequest.reference(pullRequest),
  pullRequest.author,
  pullRequest.headBranch,
];

/** The rows the toolbar's query keeps, in input order; an absent filter keeps every row. */
export const filterRows = (rows: readonly PullRequestRow[], filter?: Filter.Any): readonly PullRequestRow[] =>
  filter ? rows.filter(({ pullRequest }) => matchesFilter(filter, pullRequest, { text: rowText })) : rows;

const STATE_WEIGHT: Record<PullRequest.State, number> = { open: 1_000, draft: 600, merged: 100, closed: 0 };

/**
 * How much a row asks of the reader now: an open pull request outranks a draft, which outranks a
 * finished one; within those, red CI or requested changes (something to fix) outrank one ready to
 * merge, which outranks one still waiting; and a pull request some task tracks is nudged up.
 */
export const relevance = ({ pullRequest, checks, tasks }: PullRequestRow): number => {
  let score = STATE_WEIGHT[pullRequest.state];
  if (pullRequest.state === 'open' || pullRequest.state === 'draft') {
    if (checks?.ci === 'failure') {
      score += 300;
    }
    if (checks?.review === 'changes_requested') {
      score += 250;
    }
    if (checks?.review === 'approved' && checks.ci !== 'failure' && checks.ci !== 'pending') {
      score += 200;
    }
    if (checks?.ci === 'pending') {
      score += 50;
    }
  }
  if (tasks.length > 0) {
    score += 25;
  }
  return score;
};

const time = (value: string | undefined): number => {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Newest activity GitHub reported, falling back to when it was opened. */
const activity = (pullRequest: PullRequest.PullRequest): number =>
  time(pullRequest.updatedAt) || time(pullRequest.createdAt);

const byRecency = (left: PullRequestRow, right: PullRequestRow): number =>
  activity(left.pullRequest) - activity(right.pullRequest) || left.pullRequest.number - right.pullRequest.number;

const compareBy: Record<PullRequestsView.SortField, (left: PullRequestRow, right: PullRequestRow) => number> = {
  // Ties broken by recency, so equally urgent rows read newest first under the default (descending) order.
  relevance: (left, right) => relevance(left) - relevance(right) || byRecency(left, right),
  updated: byRecency,
  created: (left, right) =>
    time(left.pullRequest.createdAt) - time(right.pullRequest.createdAt) ||
    left.pullRequest.number - right.pullRequest.number,
  number: (left, right) => left.pullRequest.number - right.pullRequest.number,
  title: (left, right) =>
    (left.pullRequest.title ?? '').localeCompare(right.pullRequest.title ?? '', undefined, { sensitivity: 'base' }),
};

/** The rows reordered by `sort`, ties kept in input order. */
export const sortRows = (rows: readonly PullRequestRow[], sort: PullRequestsView.Sort): readonly PullRequestRow[] => {
  const compare = compareBy[sort.field];
  const sign = sort.direction === 'desc' ? -1 : 1;
  const index = new Map(rows.map((row, position) => [row.pullRequest.id, position]));
  return [...rows].sort(
    (left, right) =>
      sign * compare(left, right) || (index.get(left.pullRequest.id) ?? 0) - (index.get(right.pullRequest.id) ?? 0),
  );
};

const STATE_ORDER: readonly PullRequest.State[] = ['open', 'draft', 'merged', 'closed'];
const STATE_ICON: Record<PullRequest.State, string> = {
  open: 'ph--git-pull-request--regular',
  draft: 'ph--git-pull-request--regular',
  merged: 'ph--git-merge--regular',
  closed: 'ph--x-circle--regular',
};
export const STATE_HUE: Record<PullRequest.State, string> = {
  open: 'green',
  closed: 'red',
  merged: 'purple',
  draft: 'neutral',
};

const CI_ORDER: readonly GitHubOperation.CiState[] = ['failure', 'pending', 'success', 'none'];
const CI_ICON: Record<GitHubOperation.CiState, string> = {
  failure: 'ph--x-circle--regular',
  pending: 'ph--circle-notch--regular',
  success: 'ph--check-circle--regular',
  none: 'ph--minus-circle--regular',
};
export const CI_HUE: Record<GitHubOperation.CiState, string> = {
  success: 'green',
  failure: 'red',
  pending: 'amber',
  none: 'neutral',
};

/** Rows partitioned by a string key, groups in first-seen order unless `order` ranks them; empty groups dropped. */
const partition = <K extends string>(
  rows: readonly PullRequestRow[],
  key: (row: PullRequestRow) => K,
  make: (key: K, rows: readonly PullRequestRow[]) => PullRequestRowGroup,
  order?: (left: K, right: K) => number,
): PullRequestRowGroup[] => {
  const byKey = new Map<K, PullRequestRow[]>();
  for (const row of rows) {
    const value = key(row);
    byKey.set(value, [...(byKey.get(value) ?? []), row]);
  }
  const keys = [...byKey.keys()];
  if (order) {
    keys.sort(order);
  }
  return keys.map((value) => make(value, byKey.get(value) ?? []));
};

const rankOf =
  <T extends string>(values: readonly T[]) =>
  (left: T, right: T) =>
    values.indexOf(left) - values.indexOf(right);

/**
 * The rows partitioned by `field`, each group's rows in input order (so a sort applies within every
 * group). Absent for `none`: an ungrouped list has no headers.
 */
export const groupRows = (
  rows: readonly PullRequestRow[],
  field: PullRequestsView.GroupField,
): PullRequestRowGroup[] | undefined => {
  switch (field) {
    case 'none':
      return undefined;

    case 'repo':
      return partition(
        rows,
        ({ pullRequest }) => `${pullRequest.owner}/${pullRequest.repo}`,
        (repo, rows) => ({ id: `repo-${repo}`, label: repo, icon: 'ph--git-branch--regular', rows }),
        (left, right) => left.localeCompare(right),
      );

    case 'state':
      return partition(
        rows,
        ({ pullRequest }) => pullRequest.state,
        (state, rows) => ({
          id: `state-${state}`,
          label: `pull-request-state.${state}.label`,
          translate: true,
          icon: STATE_ICON[state],
          hue: STATE_HUE[state],
          rows,
        }),
        rankOf(STATE_ORDER),
      );

    case 'checks':
      return [
        ...partition(
          rows.filter((row) => row.checks),
          ({ checks }): GitHubOperation.CiState => checks?.ci ?? 'none',
          (ci, rows) => ({
            id: `checks-${ci}`,
            label: `ci-status.${ci}.label`,
            translate: true,
            icon: CI_ICON[ci],
            hue: CI_HUE[ci],
            rows,
          }),
          rankOf(CI_ORDER),
        ),
        // Rows whose checks have not arrived (or are not fetched, e.g. a merged pull request) last.
        ...partition(
          rows.filter((row) => !row.checks),
          () => 'unknown' as const,
          (_, rows) => ({
            id: 'checks-unknown',
            label: 'ci-status.unknown.label',
            translate: true,
            icon: 'ph--question--regular',
            rows,
          }),
        ),
      ];

    case 'author':
      return partition(
        rows,
        ({ pullRequest }) => pullRequest.author ?? '',
        (author, rows) => ({
          id: `author-${author}`,
          label: author || 'group-no-author.label',
          translate: !author,
          icon: author ? 'ph--user--regular' : 'ph--user-circle-dashed--regular',
          rows,
        }),
        // Unknown authors last; the rest by name.
        (left, right) => (left === '' ? 1 : right === '' ? -1 : left.localeCompare(right)),
      );
  }
};
