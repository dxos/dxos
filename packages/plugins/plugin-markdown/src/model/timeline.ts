//
// Copyright 2026 DXOS.org
//

import { type Commit } from '@dxos/react-ui-components';

import { type Markdown, type MarkdownCapabilities, type Versioning } from '../types';
import { diffSpans, diffStats } from './diff';
import { branchLabel, contentAt, versionLabel } from './versioning';

export const MAIN_BRANCH = 'main';
export const NOW_COMMIT_ID = 'now';

export type TimelineModel = {
  /** Oldest-first, topologically ordered (parents precede children) — the Timeline contract. */
  commits: Commit[];
  /** Lane order; main first. */
  branches: string[];
};

/**
 * Maps a document's version history onto Timeline commits:
 * checkpoints → commits, branch records → fork nodes, `merge:` auto-checkpoints → two-parent
 * merge commits, plus a synthetic tip for the current state of main.
 */
export const createTimelineModel = (doc: Markdown.Document, options?: { nowLabel?: string }): TimelineModel => {
  const history = doc.history;
  const rootText = doc.content.target;
  if (!history || !rootText) {
    return { commits: [], branches: [MAIN_BRANCH] };
  }

  // Branch name per Text id; the root is main.
  const branchByTextId = new Map<string, Versioning.Branch | undefined>([[rootText.id, undefined]]);
  const branchName = (textId: string | undefined): string | undefined => {
    if (textId === undefined || !branchByTextId.has(textId)) {
      return undefined;
    }
    const branch = branchByTextId.get(textId);
    return branch ? branchLabel(branch) : MAIN_BRANCH;
  };

  // Archived (discarded) branches are dropped from the graph.
  const branches = history.branches.filter((branch) => branch.status !== 'archived');
  for (const branch of branches) {
    const textId = branch.content.target?.id;
    if (textId) {
      branchByTextId.set(textId, branch);
    }
  }

  // Versions are stored in creation order, which is the authoritative topological order.
  // Branch fork commits are emitted lazily: right before the first commit that needs them
  // (a checkpoint on the branch, or the merge back into the parent).
  const commits: Commit[] = [];
  const lastOnBranch = new Map<string, string>();

  const push = (commit: Commit) => {
    commits.push(commit);
    lastOnBranch.set(commit.branch, commit.id);
  };

  const emittedBranches = new Set<string>();
  const emitBranch = (branch: Versioning.Branch) => {
    const parent = branchName(branch.parent.target?.id);
    if (emittedBranches.has(branch.id) || !parent) {
      return;
    }
    emittedBranches.add(branch.id);
    const stats = branchStats(branch);
    const label = branchLabel(branch);
    push({
      id: `branch-${branch.id}`,
      branch: label,
      message: stats ? `${label} (+${stats.insertions} −${stats.deletions})` : label,
      timestamp: new Date(branch.createdAt),
      icon: 'ph--git-branch--regular',
      parents: [lastOnBranch.get(parent)].filter((id): id is string => id !== undefined),
    });
  };

  for (const version of history.versions) {
    const targetId = version.target.target?.id;
    const target = branchName(targetId);
    if (!target) {
      continue;
    }

    // A checkpoint on a branch's own Text needs its fork commit first.
    const targetBranch = targetId ? branchByTextId.get(targetId) : undefined;
    if (targetBranch) {
      emitBranch(targetBranch);
    }

    // A `merge:` checkpoint on the parent becomes the merge commit (two parents) of the
    // matching merged branch; everything else is a plain checkpoint commit.
    // TODO(burdon): Replace the label match with a structural version→branch link if branch
    // renaming is introduced (labels are currently immutable: name set once, else createdAt).
    const merged = branches.find(
      (branch) =>
        branch.status === 'merged' &&
        version.name === `merge: ${branchLabel(branch)}` &&
        branch.parent.target?.id === targetId,
    );
    if (merged) {
      emitBranch(merged);
    }

    const parents = [lastOnBranch.get(target), merged && lastOnBranch.get(branchLabel(merged))].filter(
      (id): id is string => id !== undefined,
    );
    push({
      id: version.id,
      branch: target,
      message: versionLabel(version),
      timestamp: new Date(version.createdAt),
      icon: merged ? 'ph--git-merge--regular' : 'ph--bookmark-simple--regular',
      parents,
    });
  }

  // Branches never referenced by a checkpoint or merge (fresh drafts).
  branches.forEach(emitBranch);

  // Synthetic tip: the editable present of main.
  push({
    id: NOW_COMMIT_ID,
    branch: MAIN_BRANCH,
    message: options?.nowLabel ?? 'Now',
    icon: 'ph--record--regular',
    parents: [lastOnBranch.get(MAIN_BRANCH)].filter((id): id is string => id !== undefined),
  });

  return {
    commits,
    branches: [MAIN_BRANCH, ...branches.map((branch) => branchLabel(branch))],
  };
};

/** Maps a Timeline commit back onto a version selection. */
export const commitToSelection = (
  doc: Markdown.Document,
  commit: Commit,
): MarkdownCapabilities.VersionSelection | undefined => {
  if (commit.id === NOW_COMMIT_ID) {
    return { kind: 'current' };
  }
  if (commit.id.startsWith('branch-')) {
    const branchId = commit.id.slice('branch-'.length);
    const branch = doc.history?.branches.find((branch) => branch.id === branchId);
    // Merged/archived branch Texts are no longer editable targets; fall back to the present.
    return branch?.status === 'active' ? { kind: 'branch', branchId } : { kind: 'current' };
  }
  if (doc.history?.versions.some((version) => version.id === commit.id)) {
    return { kind: 'checkpoint', versionId: commit.id };
  }
  return undefined;
};

const branchStats = (branch: Versioning.Branch) => {
  if (branch.status !== 'active') {
    return undefined;
  }
  const branchText = branch.content.target;
  const parentText = branch.parent.target;
  if (!branchText || !parentText) {
    return undefined;
  }
  return diffStats(diffSpans(contentAt(parentText, branch.anchor), branchText.content));
};
