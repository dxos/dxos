//
// Copyright 2026 DXOS.org
//

import { type Commit } from '@dxos/react-ui-components';
import { type Text } from '@dxos/schema';
import { Branch, type History, Version, diffSpans, diffStats } from '@dxos/versioning';

import { type SpaceCapabilities } from '#types';

export const MAIN_BRANCH = 'main';
export const NOW_COMMIT_ID = 'now';

export type TimelineModel = {
  /** Oldest-first, topologically ordered (parents precede children) — the Timeline contract. */
  commits: Commit[];
  /** Lane order; main first. */
  branches: string[];
};

/**
 * Maps an object's version history onto Timeline commits:
 * checkpoints → commits, branch records → fork nodes, `merge:` auto-checkpoints → two-parent
 * merge commits, plus a synthetic tip for the current state of main.
 */
export const createTimelineModel = (
  object: History.VersionedObject,
  rootText: Text.Text | undefined,
  options?: { nowLabel?: string },
): TimelineModel => {
  const history = object.history;
  if (!history || !rootText) {
    return { commits: [], branches: [MAIN_BRANCH] };
  }

  // Branch name per Text id; the root is main.
  const branchByTextId = new Map<string, Branch.Branch | undefined>([[rootText.id, undefined]]);
  const branchName = (textId: string | undefined): string | undefined => {
    if (textId === undefined || !branchByTextId.has(textId)) {
      return undefined;
    }
    const branch = branchByTextId.get(textId);
    return branch ? Branch.label(branch) : MAIN_BRANCH;
  };

  // Archived (discarded) branches are dropped from the graph. Only legacy content-copy branches
  // carry their own Text (and hence a lane keyed by Text id); core branches share the root's
  // object and appear via their fork/merge nodes only.
  const branches = history.branches.filter((branch) => branch.status !== 'archived');
  for (const branch of branches) {
    const textId = branch.content?.target?.id;
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
  const emitBranch = (branch: Branch.Branch) => {
    const parent = branchName(branch.parent.target?.id);
    if (emittedBranches.has(branch.id) || !parent) {
      return;
    }
    emittedBranches.add(branch.id);
    const stats = branchStats(branch);
    const label = Branch.label(branch);
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
        version.name === `merge: ${Branch.label(branch)}` &&
        branch.parent.target?.id === targetId,
    );
    if (merged) {
      emitBranch(merged);
    }

    const parents = [lastOnBranch.get(target), merged && lastOnBranch.get(Branch.label(merged))].filter(
      (id): id is string => id !== undefined,
    );
    push({
      id: version.id,
      branch: target,
      message: Version.label(version),
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
    branches: [MAIN_BRANCH, ...branches.map((branch) => Branch.label(branch))],
  };
};

/** Maps a Timeline commit back onto a version selection. */
export const commitToSelection = (
  object: History.VersionedObject,
  commit: Commit,
): SpaceCapabilities.VersionSelection | undefined => {
  if (commit.id === NOW_COMMIT_ID) {
    return { kind: 'current' };
  }
  if (commit.id.startsWith('branch-')) {
    const branchId = commit.id.slice('branch-'.length);
    const branch = object.history?.branches.find((branch) => branch.id === branchId);
    // Merged/archived branch Texts are no longer editable targets; fall back to the present.
    return branch?.status === 'active' ? { kind: 'branch', branchId } : { kind: 'current' };
  }
  if (object.history?.versions.some((version) => version.id === commit.id)) {
    return { kind: 'checkpoint', versionId: commit.id };
  }
  return undefined;
};

const branchStats = (branch: Branch.Branch) => {
  if (branch.status !== 'active') {
    return undefined;
  }
  // Core branches have no separate Text to diff synchronously; per-branch stats need a binding
  // and arrive with the stage-3 binding-aware timeline.
  const branchText = branch.content?.target;
  const parentText = branch.parent.target;
  if (!branchText || !parentText) {
    return undefined;
  }
  return diffStats(diffSpans(Version.contentAt(parentText, branch.anchor), branchText.content));
};
