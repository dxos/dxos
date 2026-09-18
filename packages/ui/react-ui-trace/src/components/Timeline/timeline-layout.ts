//
// Copyright 2026 DXOS.org
//

import { type Commit } from './Timeline.tsx';

/** The row range a branch's line covers, in commit indices. */
export type TimelineSpan = {
  start: number;
  end: number;
};

export type TimelineRow = {
  commit: Commit;
  /** Index into the commit list the layout was built from; `spans` share these coordinates. */
  index: number;
};

export type TimelineLayout = {
  /** One row per commit on a whitelisted branch, in commit order. */
  rows: TimelineRow[];
  /** Lane per branch; a branch outside the whitelist gets none, and so gets no rows. */
  branchLane: Map<string, number>;
  /** Lanes the row graphic has to be wide enough for. */
  laneCount: number;
  /** The span each branch's line covers. */
  spans: Map<string, TimelineSpan>;
  /** Row index per commit index — the keyboard navigates in commit indices but scrolls rows. */
  rowByCommitIndex: Map<number, number>;
  /** Commit index per commit id — a click names a commit, everything else speaks in indices. */
  commitIndexById: Map<string, number>;
};

/**
 * Lays a commit graph out into rows: which lane each branch draws in, how far each branch's line
 * runs, and which commits get a row at all.
 *
 * Pure and linear in the number of commits: every lookup a commit makes about a parent, and every
 * lane release, is served from an index built in one pass. Commits are assumed to be in topological
 * order — a parent always precedes its children.
 */
export const layoutTimeline = (commits: readonly Commit[], branches: readonly string[]): TimelineLayout => {
  const visibleBranches = new Set(branches);
  const firstBranch = branches[0];

  const commitIndexById = new Map<string, number>();
  commits.forEach((commit, index) => {
    if (!commitIndexById.has(commit.id)) {
      commitIndexById.set(commit.id, index);
    }
  });

  const positionOf = (commitId: string): { index: number; branch: string } | undefined => {
    const index = commitIndexById.get(commitId);
    return index === undefined ? undefined : { index, branch: commits[index].branch };
  };

  // The row at which each branch is merged by another branch, and so may hand its lane back.
  const mergeRow = new Map<string, number>();
  commits.forEach((commit, row) => {
    for (const parentId of commit.parents ?? []) {
      const parent = positionOf(parentId);
      if (parent && parent.branch !== commit.branch && visibleBranches.has(parent.branch)) {
        mergeRow.set(parent.branch, row);
      }
    }
  });

  // Inverted so a row releases lanes with one lookup instead of a scan of every merge.
  const releasedAtRow = new Map<number, string[]>();
  for (const [branch, endRow] of mergeRow) {
    if (branch === firstBranch) {
      continue;
    }
    const released = releasedAtRow.get(endRow);
    if (released) {
      released.push(branch);
    } else {
      releasedAtRow.set(endRow, [branch]);
    }
  }

  // Assign branches to lanes, reusing a lane once its branch has been merged. Unmerged branches
  // keep their lane active — they may still be in progress.
  const branchLane = new Map<string, number>();
  if (firstBranch !== undefined) {
    branchLane.set(firstBranch, 0);
  }

  const activeLanes = new Set<number>([0]);
  let maxLane = 0;

  commits.forEach((commit, row) => {
    if (visibleBranches.has(commit.branch) && !branchLane.has(commit.branch)) {
      let lane = 1;
      while (activeLanes.has(lane)) {
        lane++;
      }
      branchLane.set(commit.branch, lane);
      activeLanes.add(lane);
      maxLane = Math.max(maxLane, lane);
    }

    for (const branch of releasedAtRow.get(row) ?? []) {
      const lane = branchLane.get(branch);
      if (lane !== undefined) {
        activeLanes.delete(lane);
      }
    }
  });

  // How far each branch's line runs: from its first commit (or the fork it came off) to its last
  // commit (or the merge that absorbed it).
  const spans = new Map<string, TimelineSpan>();
  commits.forEach((commit, index) => {
    let span = spans.get(commit.branch);
    if (span) {
      span.end = index;
    } else {
      span = { start: index, end: index };
      spans.set(commit.branch, span);
    }

    const parents = commit.parents ?? [];
    for (const parentId of parents) {
      const parent = positionOf(parentId);
      if (!parent || parent.branch === commit.branch) {
        continue;
      }

      span.start = Math.min(span.start, parent.index);

      // A merge extends the branch being merged in, down to this row.
      if (parents.length > 1) {
        const parentSpan = spans.get(parent.branch);
        if (parentSpan) {
          parentSpan.end = Math.max(parentSpan.end, index);
        }
      }
    }
  });

  const rows: TimelineRow[] = [];
  const rowByCommitIndex = new Map<number, number>();
  commits.forEach((commit, index) => {
    if (branchLane.has(commit.branch)) {
      rowByCommitIndex.set(index, rows.length);
      rows.push({ commit, index });
    }
  });

  return { rows, branchLane, laneCount: maxLane + 1, spans, rowByCommitIndex, commitIndexById };
};
