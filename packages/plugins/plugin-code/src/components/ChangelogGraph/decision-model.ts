//
// Copyright 2026 DXOS.org
//

import { type ChangelogEntry, parseChangelog } from '@dxos/deus/extension';

export type DecisionActor = 'user' | 'agent';

/**
 * How one entry relates to another: it builds on a decision it cites, replaces one it supersedes, or approves
 * one a person accepted; `affects` links a decision to a spec block it constrains.
 */
export type ChangelogEdgeKind = 'builds-on' | 'supersedes' | 'approves' | 'affects';

export type DecisionModel = {
  kind: 'decision';
  id: string;
  entry: ChangelogEntry;
  actor?: DecisionActor;
  /** The decider without its `user:` / `agent:` prefix. */
  handle?: string;
  /** The person an agent decision was made for, without its prefix. */
  principal?: string;
  /** The decision that replaced this one, if any. */
  supersededBy?: string;
  /** User decisions that approved this one. */
  approvedBy: string[];
};

export type SpecBlockModel = {
  kind: 'block';
  /** Node id; prefixed so a block id never collides with a decision id. */
  id: string;
  /** The block id as the spec writes it, e.g. `F-1.2`. */
  label: string;
};

export type ChangelogNodeModel = DecisionModel | SpecBlockModel;

/** Points from the earlier entry to the later one, so the layout ranks the log top-down in the order it was written. */
export type ChangelogEdgeModel = { id: string; kind: ChangelogEdgeKind; from: string; to: string };

export type ChangelogGraphModel = {
  nodes: ChangelogNodeModel[];
  edges: ChangelogEdgeModel[];
};

export type ChangelogGraphOptions = {
  /** Adds a node per spec block named in `affects:`, linked to the decisions that constrain it. */
  affects?: boolean;
};

const ACTOR = /^(user|agent):(.+)$/;

/** Approval is ordinary prose (lang/changelog.mdl rule 6), so it is read from the wording of a user decision. */
const APPROVAL = /^approves?\b/i;

const parseActor = (ref: string | undefined): { actor?: DecisionActor; handle?: string } => {
  const match = ref?.match(ACTOR);
  return match ? { actor: match[1] === 'user' ? 'user' : 'agent', handle: match[2] } : { handle: ref };
};

export const SPEC_BLOCK_PREFIX = 'block:';

/** A GitHub username has a public avatar; an email handle (lang/changelog.mdl allows either) does not. */
export const githubAvatarUrl = (handle: string): string | undefined =>
  /^[A-Za-z\d-]+$/.test(handle) ? `https://avatars.githubusercontent.com/${handle}?s=64` : undefined;

/** Whether an entry approves the decisions it cites rather than building on them. */
export const isApproval = (entry: ChangelogEntry): boolean =>
  parseActor(entry.by).actor === 'user' && APPROVAL.test(entry.title);

/** The decisions of a spec's `## Changelog` and how they relate, ready to lay out as a graph. */
export const buildChangelogGraph = (
  text: string,
  { affects = false }: ChangelogGraphOptions = {},
): ChangelogGraphModel => {
  const { entries } = parseChangelog(text);
  const ids = new Set(entries.map(({ id }) => id));
  const edges: ChangelogEdgeModel[] = [];
  const supersededBy = new Map<string, string>();
  const approvedBy = new Map<string, string[]>();

  for (const entry of entries) {
    if (entry.supersedes && ids.has(entry.supersedes)) {
      supersededBy.set(entry.supersedes, entry.id);
      edges.push({
        id: `${entry.id}:supersedes:${entry.supersedes}`,
        kind: 'supersedes',
        from: entry.supersedes,
        to: entry.id,
      });
    }
    const approval = isApproval(entry);
    for (const ref of entry.refs) {
      if (!ids.has(ref) || ref === entry.supersedes) {
        continue;
      }
      if (approval) {
        approvedBy.set(ref, [...(approvedBy.get(ref) ?? []), entry.id]);
      }
      const kind = approval ? 'approves' : 'builds-on';
      edges.push({ id: `${entry.id}:${kind}:${ref}`, kind, from: ref, to: entry.id });
    }
  }

  const decisions = entries.map((entry): DecisionModel => {
    const { actor, handle } = parseActor(entry.by);
    return {
      kind: 'decision',
      id: entry.id,
      entry,
      actor,
      handle,
      principal: parseActor(entry.for).handle,
      supersededBy: supersededBy.get(entry.id),
      approvedBy: approvedBy.get(entry.id) ?? [],
    };
  });

  const blocks: SpecBlockModel[] = [];
  if (affects) {
    const labels = [...new Set(entries.flatMap((entry) => entry.affects))];
    blocks.push(
      ...labels.map((label): SpecBlockModel => ({ kind: 'block', id: `${SPEC_BLOCK_PREFIX}${label}`, label })),
    );
    for (const entry of entries) {
      for (const label of entry.affects) {
        edges.push({
          id: `${entry.id}:affects:${label}`,
          kind: 'affects',
          from: entry.id,
          to: `${SPEC_BLOCK_PREFIX}${label}`,
        });
      }
    }
  }

  return { nodes: [...decisions, ...blocks], edges };
};

/** The decisions one decider made, in log order. */
export type DeciderGroup = { actor?: DecisionActor; handle?: string; decisions: DecisionModel[] };

const ACTOR_ORDER = (actor?: DecisionActor): number => (actor === 'user' ? 0 : actor === 'agent' ? 2 : 1);

/**
 * Decisions grouped by who made them: people first, then unattributed entries, then agents, so the
 * decisions that carry a person's authority lead; within each, the most prolific decider first.
 */
export const groupByDecider = (decisions: readonly DecisionModel[]): DeciderGroup[] => {
  const groups = new Map<string, DeciderGroup>();
  for (const decision of decisions) {
    const key = `${decision.actor ?? ''}:${decision.handle ?? ''}`;
    const group = groups.get(key) ?? { actor: decision.actor, handle: decision.handle, decisions: [] };
    group.decisions.push(decision);
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (left, right) =>
      ACTOR_ORDER(left.actor) - ACTOR_ORDER(right.actor) || right.decisions.length - left.decisions.length,
  );
};
