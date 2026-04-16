//
// Copyright 2025 DXOS.org
//

import { type Commit } from './Timeline';

const NODE = '●';
const MERGE_NODE = '◆';
const RAIL = '│';
const HORIZ = '─';
const COL_WIDTH = 3;

/**
 * Renders commits as a monospace ASCII graph with rounded box-drawing arcs and vertical rails.
 *
 * Commits must be ordered chronologically (oldest first, newest last). Parents must refer to older commits.
 */
export const renderTimelineAscii = (commits: Commit[], branches: string[]): string => {
  if (commits.length === 0) {
    return '';
  }

  const laneById = assignLanes(commits, branches);
  const lanes = commits.map((commit) => laneById.get(commit.id)!);
  const maxLane = Math.max(...lanes);

  if (maxLane === 0) {
    return commits.map((commit) => `${NODE}  ${formatLabel(commit)}`).join('\n');
  }

  const active = computeActiveColumns(commits, lanes, laneById);

  const graphParts = commits.map((commit, row) =>
    renderRow(commit, lanes[row]!, maxLane, active[row]!, laneById),
  );

  const maxGraphWidth = Math.max(...graphParts.map((part) => part.length));
  return commits
    .map((commit, row) => `${graphParts[row]!.padEnd(maxGraphWidth)}  ${formatLabel(commit)}`)
    .join('\n');
};

const renderRow = (
  commit: Commit,
  commitLane: number,
  maxLane: number,
  activeRow: boolean[],
  laneById: Map<string, number>,
): string => {
  const totalChars = (maxLane + 1) * COL_WIDTH;
  const chars: string[] = Array(totalChars).fill(' ');

  const merge = isMergeCommit(commit);
  const fork = !merge && isForkCommit(commit, laneById, commitLane);

  let connectLane = -1;
  if (fork) {
    const parentLane = laneById.get(commit.parents![0]!);
    if (parentLane !== undefined) {
      connectLane = parentLane;
    }
  } else if (merge) {
    for (const parentId of commit.parents ?? []) {
      const parentLane = laneById.get(parentId);
      if (parentLane !== undefined && parentLane !== commitLane) {
        connectLane = parentLane;
        break;
      }
    }
  }

  for (let col = 0; col <= maxLane; col++) {
    if (col === commitLane) {
      continue;
    }
    if (activeRow[col]) {
      chars[col * COL_WIDTH] = RAIL;
    }
  }

  chars[commitLane * COL_WIDTH] = merge ? MERGE_NODE : NODE;

  if (connectLane >= 0) {
    const connectPos = connectLane * COL_WIDTH;
    if (fork) {
      chars[connectPos] = connectLane < commitLane ? '├' : '┤';
    } else {
      chars[connectPos] = connectLane > commitLane ? '╯' : '╰';
    }

    const minCol = Math.min(commitLane, connectLane);
    const maxCol = Math.max(commitLane, connectLane);
    for (let pos = minCol * COL_WIDTH + 1; pos < maxCol * COL_WIDTH; pos++) {
      if (pos % COL_WIDTH === 0) {
        const col = pos / COL_WIDTH;
        if (activeRow[col]) {
          chars[pos] = '┼';
        } else {
          chars[pos] = HORIZ;
        }
      } else {
        chars[pos] = HORIZ;
      }
    }
  }

  return chars.join('').trimEnd();
};

const formatLabel = (commit: Commit): string => {
  const icon = commit.icon
    ?.replace(/^ph--/, '')
    .replace(/--regular$/, '')
    .replace(/--bold$/, '')
    .replace(/--fill$/, '');
  return icon ? `[${icon}] ${commit.message}` : commit.message;
};

const assignLanes = (commits: Commit[], branches: string[]): Map<string, number> => {
  const branchOrder = new Map<string, number>();
  for (let idx = 0; idx < branches.length; idx++) {
    branchOrder.set(branches[idx]!, idx);
  }
  const laneById = new Map<string, number>();
  for (const commit of commits) {
    laneById.set(commit.id, branchOrder.get(commit.branch) ?? 0);
  }
  return laneById;
};

const isMergeCommit = (commit: Commit): boolean => (commit.parents?.length ?? 0) > 1;

const isForkCommit = (commit: Commit, laneById: Map<string, number>, lane: number): boolean => {
  const parents = commit.parents;
  if (!parents || parents.length !== 1) {
    return false;
  }
  const parentLane = laneById.get(parents[0]!);
  return parentLane !== undefined && parentLane !== lane;
};

/**
 * Column `col` is active on `row` when `row` falls inside the vertical span
 * of that column (the range of rows that include commits on that lane plus
 * merge rows referencing parents on that lane) AND the row's own commit
 * is not on that column.
 */
const computeActiveColumns = (
  commits: Commit[],
  lanes: number[],
  laneById: Map<string, number>,
): boolean[][] => {
  const rows = commits.length;
  const cols = Math.max(...lanes, 0) + 1;
  const rowIndicesByCol: number[][] = Array.from({ length: cols }, () => []);

  for (let row = 0; row < rows; row++) {
    rowIndicesByCol[lanes[row]!]!.push(row);
  }

  for (let row = 0; row < rows; row++) {
    for (const parentId of commits[row]?.parents ?? []) {
      const parentLane = laneById.get(parentId);
      if (parentLane === undefined) {
        continue;
      }
      rowIndicesByCol[parentLane]!.push(row);
    }
  }

  const active: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (let col = 0; col < cols; col++) {
    const indices = rowIndicesByCol[col]!;
    if (indices.length === 0) {
      continue;
    }
    const minR = Math.min(...indices);
    const maxR = Math.max(...indices);
    for (let row = minR; row <= maxR; row++) {
      if (lanes[row] !== col) {
        active[row]![col] = true;
      }
    }
  }

  return active;
};
