//
// Copyright 2026 DXOS.org
//

import { type Commit } from '@dxos/react-ui-components';
import { type Text } from '@dxos/schema';
import { Branch, type History, Version, diffSpans, diffStats } from '@dxos/versioning';

import { type SpaceCapabilities } from '#types';

export const MAIN_BRANCH = 'main';
export const NOW_COMMIT_ID = 'now';
/** Prefix of the synthetic per-branch tip node (the editable present of a branch lane). */
export const BRANCH_TIP_PREFIX = 'branch-tip-';
/** Prefix of a branch fork node (the point a branch diverged from its parent). */
export const BRANCH_PREFIX = 'branch-';

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
  options?: { nowLabel?: string; branchTipLabel?: string },
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
  // object and are laned by their registry `key` (see `branchForVersion`).
  const branches = history.branches.filter((branch) => branch.status !== 'archived');
  for (const branch of branches) {
    const textId = branch.content?.target?.id;
    if (textId) {
      branchByTextId.set(textId, branch);
    }
  }
  const branchByKey = new Map(branches.filter((branch) => branch.key).map((branch) => [branch.key!, branch]));

  // The branch a checkpoint was taken on: a core checkpoint carries the branch `key` (its target id
  // equals the root's), while a legacy checkpoint is identified by its target Text id.
  const branchForVersion = (version: Version.Version): Branch.Branch | undefined =>
    (version.branch ? branchByKey.get(version.branch) : undefined) ??
    (version.target.target?.id ? branchByTextId.get(version.target.target.id) : undefined);

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
      id: `${BRANCH_PREFIX}${branch.id}`,
      branch: label,
      message: stats ? `${label} (+${stats.insertions} −${stats.deletions})` : label,
      timestamp: new Date(branch.createdAt),
      icon: 'ph--git-branch--regular',
      parents: [lastOnBranch.get(parent)].filter((id): id is string => id !== undefined),
    });
  };

  // A branch forked from a checkpoint anchors at that checkpoint's heads; emit its fork node right
  // after that revision so it descends from the correct commit (not the latest main commit).
  const sameHeads = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((head) => b.includes(head));

  for (const version of history.versions) {
    // The lane is the branch the checkpoint was taken on (core: via `branch` key; legacy: via
    // target Text id), else main. A core branch checkpoint shares the root's target id, so it must
    // be laned by `branch` — otherwise it wrongly lands on main.
    const targetBranch = branchForVersion(version);
    const target = targetBranch ? Branch.label(targetBranch) : MAIN_BRANCH;

    // A checkpoint on a branch needs the branch's fork commit emitted first.
    if (targetBranch) {
      emitBranch(targetBranch);
    }

    // A `merge:` checkpoint on the parent becomes the merge commit (two parents) of the
    // matching merged branch; everything else is a plain checkpoint commit.
    // TODO(burdon): Replace the label match with a structural version→branch link if branch
    // renaming is introduced (labels are currently immutable: name set once, else createdAt).
    const merged = branches.find(
      (branch) => branch.status === 'merged' && version.name === `merge: ${Branch.label(branch)}`,
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

    // Emit any branch forked at exactly this revision right after it: `emitBranch` parents to the
    // parent lane's last commit, which is this version we just pushed — so the fork descends from
    // the checkpoint it was created from rather than from the latest commit.
    for (const branch of branches) {
      if (branch.parent.target?.id === version.target.target?.id && sameHeads(branch.anchor, version.heads)) {
        emitBranch(branch);
      }
    }
  }

  // Branches not anchored at a checkpoint (forked from an un-checkpointed tip): fork from the
  // latest commit on the parent lane.
  branches.forEach(emitBranch);

  // Synthetic tip per active branch lane: the editable present of that branch. Without it the last
  // node on a branch lane is its latest checkpoint (a read-only pin), leaving no obvious way back to
  // the live, editable branch tip — the reviewer would have to click the fork node far upstream.
  for (const branch of branches) {
    if (branch.status !== 'active') {
      continue;
    }
    const label = Branch.label(branch);
    const parent = lastOnBranch.get(label);
    if (!parent) {
      continue;
    }
    push({
      id: `${BRANCH_TIP_PREFIX}${branch.id}`,
      branch: label,
      message: options?.branchTipLabel ?? options?.nowLabel ?? 'Now',
      icon: 'ph--record--regular',
      parents: [parent],
    });
  }

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
  // The tip prefix subsumes the fork prefix, so match it first.
  if (commit.id.startsWith(BRANCH_TIP_PREFIX)) {
    const branchId = commit.id.slice(BRANCH_TIP_PREFIX.length);
    const branch = object.history?.branches.find((branch) => branch.id === branchId);
    return branch?.status === 'active' ? { kind: 'branch', branchId } : { kind: 'current' };
  }
  if (commit.id.startsWith(BRANCH_PREFIX)) {
    // The fork node shows the branch's state at creation: a read-only view of the parent content at
    // the branch anchor. The branch's editable present is a separate `Tip` node (BRANCH_TIP_PREFIX).
    const branchId = commit.id.slice(BRANCH_PREFIX.length);
    return object.history?.branches.some((branch) => branch.id === branchId) ? { kind: 'fork', branchId } : undefined;
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
