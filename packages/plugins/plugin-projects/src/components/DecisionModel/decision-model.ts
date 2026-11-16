//
// Copyright 2026 DXOS.org
//

import { type ChangelogEntry, type ChangelogQuestion, parseChangelog } from '@dxos/deus/extension';

export type DecisionActor = 'user' | 'agent';

/**
 * How one entry relates to another: it builds on a decision it cites, replaces one it supersedes, or approves
 * one a person accepted, or answers a question; `affects` links a decision to a spec block it constrains.
 */
export type ChangelogEdgeKind = 'builds-on' | 'supersedes' | 'approves' | 'answers' | 'affects';

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
  /** Later decisions that replaced a part of this one, with the part as their prose names it. */
  replacedInPart: { id: string; part: string }[];
  /** User decisions that approved this one. */
  approvedBy: string[];
  /** How this decision's prose relates it to each decision it cites. */
  cites: Citation[];
};

/**
 * How a decision relates to one it cites, read from the clause that cites it: it fills in, replaces (wholly or a named
 * part of), refines or approves it, else builds on it.
 */
export type CitationKind = 'fills-in' | 'replaces' | 'refines' | 'approves' | 'builds-on';

export type Citation = {
  id: string;
  kind: CitationKind;
  /** The part replaced, as the prose names it, such as `the switch` in "Replaces the switch of [D-92]". */
  part?: string;
};

/** A `question` of the changelog: open until a decision `answers:` it. */
export type QuestionModel = {
  kind: 'question';
  id: string;
  entry: ChangelogQuestion;
  actor?: DecisionActor;
  /** The asker without its `user:` / `agent:` prefix. */
  handle?: string;
  /** The person an agent asked for, without its prefix. */
  principal?: string;
  /** The decision that answers it; only the first answer counts (`lang/changelog.mdl` rule 10). */
  answer?: DecisionModel;
};

export type SpecBlockModel = {
  kind: 'block';
  /** Node id; prefixed so a block id never collides with a decision id. */
  id: string;
  /** The block id as the spec writes it, e.g. `F-1.2`. */
  label: string;
};

export type ChangelogNodeModel = DecisionModel | QuestionModel | SpecBlockModel;

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

/** The prose before a citation, back to the start of its clause. */
const clauseBefore = (title: string, ref: string): string => {
  const at = title.indexOf(`[${ref}]`);
  const before = at === -1 ? '' : title.slice(0, at);
  return before.slice(Math.max(before.lastIndexOf('.'), before.lastIndexOf(';')) + 1);
};

const REPLACES_PART = /\breplaces\s+(.+?)\s+of\s*$/i;

/** How `entry` relates to the decision `ref` it cites. */
export const citationOf = (entry: ChangelogEntry, ref: string): Citation => {
  if (isApproval(entry)) {
    return { id: ref, kind: 'approves' };
  }
  if (entry.supersedes === ref) {
    return { id: ref, kind: 'replaces' };
  }
  const clause = clauseBefore(entry.title, ref);
  const part = REPLACES_PART.exec(clause);
  if (part) {
    return { id: ref, kind: 'replaces', part: part[1] };
  }
  if (/\breplaces\b/i.test(clause)) {
    return { id: ref, kind: 'replaces' };
  }
  if (/\bfills in\b/i.test(clause)) {
    return { id: ref, kind: 'fills-in' };
  }
  if (/\brefines\b/i.test(clause)) {
    return { id: ref, kind: 'refines' };
  }
  return { id: ref, kind: 'builds-on' };
};

/** The decisions of a spec's `## Changelog` and how they relate, ready to lay out as a graph. */
export const buildChangelogGraph = (
  text: string,
  { affects = false }: ChangelogGraphOptions = {},
): ChangelogGraphModel => {
  const { entries, questions: questionEntries } = parseChangelog(text);
  const ids = new Set(entries.map(({ id }) => id));
  const edges: ChangelogEdgeModel[] = [];
  const supersededBy = new Map<string, string>();
  const replacedInPart = new Map<string, { id: string; part: string }[]>();
  const approvedBy = new Map<string, string[]>();
  const cites = new Map<string, Citation[]>();

  for (const entry of entries) {
    const citations = [...new Set([...(entry.supersedes ? [entry.supersedes] : []), ...entry.refs])]
      .filter((ref) => ids.has(ref))
      .map((ref) => citationOf(entry, ref));
    cites.set(entry.id, citations);
    for (const { id, kind, part } of citations) {
      if (kind !== 'replaces') {
        continue;
      }
      if (part) {
        replacedInPart.set(id, [...(replacedInPart.get(id) ?? []), { id: entry.id, part }]);
      } else if (!supersededBy.has(id)) {
        // Prose that replaces a whole decision retires it as `supersedes:` would.
        supersededBy.set(id, entry.id);
      }
    }
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
      replacedInPart: replacedInPart.get(entry.id) ?? [],
      approvedBy: approvedBy.get(entry.id) ?? [],
      cites: cites.get(entry.id) ?? [],
    };
  });

  const questionIds = new Set(questionEntries.map(({ id }) => id));
  for (const { id, answers } of entries) {
    if (answers && questionIds.has(answers)) {
      edges.push({ id: `${id}:answers:${answers}`, kind: 'answers', from: answers, to: id });
    }
  }
  const questions = questionEntries.map((entry): QuestionModel => {
    const { actor, handle } = parseActor(entry.by);
    return {
      kind: 'question',
      id: entry.id,
      entry,
      actor,
      handle,
      principal: parseActor(entry.for).handle,
      answer: decisions.find((decision) => decision.entry.answers === entry.id),
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

  return { nodes: [...decisions, ...questions, ...blocks], edges };
};

/** The questions of a spec's `## Changelog`, open ones first, each in the order asked. */
export const buildQuestions = (text: string): QuestionModel[] => {
  const questions = buildChangelogGraph(text).nodes.filter((node): node is QuestionModel => node.kind === 'question');
  return [...questions.filter(({ answer }) => !answer), ...questions.filter(({ answer }) => answer)];
};

export type AnswerProps = {
  /** The question answered, `Q-n`. */
  question: string;
  answer: string;
  /** The person who answered, `user:<handle>`. */
  by: string;
  /** `YYYY-MM-DD`. */
  date: string;
};

/** A handle for `user:` from a display name: the dialect allows no whitespace in it. */
export const toUserHandle = (name: string): string => name.trim().replace(/\s+/g, '-');

export type TextEdit = { from: number; to: number; insert: string };

type AppendProps = { title: string; by: string; date: string; answers?: string };

/**
 * The edit that records the next decision of the spec's `## Changelog`: an insertion at the end of the section, so the
 * log stays append-only. Undefined when the spec has no changelog to append to.
 */
const appendDecision = (text: string, { title, by, date, answers }: AppendProps): TextEdit | undefined => {
  const heading = /^## Changelog[ \t]*$/m.exec(text);
  if (!heading) {
    return undefined;
  }
  const after = heading.index + heading[0].length;
  const next = /^#{1,2} /m.exec(text.slice(after));
  const end = next ? after + next.index : text.length;
  const { entries } = parseChangelog(text);
  const id = Math.max(0, ...entries.map(({ id }) => Number(/^D-(\d+)$/.exec(id)?.[1] ?? 0))) + 1;
  // The decision is its inline prose, which is one line.
  const prose = title.replace(/\s+/g, ' ').trim();
  const block = [
    '```mdl',
    `decision D-${id}: ${prose}`,
    `  date: ${date}`,
    `  by: ${by}`,
    ...(answers ? [`  answers: ${answers}`] : []),
    '```',
  ];
  // Replaces the whitespace that ends the section, so the entry sits one blank line after the last.
  const from = text.slice(0, end).trimEnd().length;
  return { from, to: end, insert: `\n\n${block.join('\n')}${next ? '\n\n' : '\n'}` };
};

/** The edit that records an answer to a question as the next decision. */
export const answerQuestion = (text: string, { question, answer, by, date }: AnswerProps): TextEdit | undefined =>
  appendDecision(text, { title: answer, by, date, answers: question });

export type ApproveProps = {
  /** The decisions approved, `D-n`, in log order. */
  ids: readonly string[];
  /** The person approving, `user:<handle>`. */
  by: string;
  /** `YYYY-MM-DD`. */
  date: string;
};

/** The edit that records a person's approval of `ids` as the next decision, worded as {@link isApproval} reads it. */
export const approveDecisions = (text: string, { ids, by, date }: ApproveProps): TextEdit | undefined => {
  if (ids.length === 0) {
    return undefined;
  }
  const cited = ids.map((id) => `[${id}]`);
  const list = cited.length === 1 ? cited[0] : `${cited.slice(0, -1).join(', ')} and ${cited[cited.length - 1]}`;
  return appendDecision(text, { title: `Approve ${list}.`, by, date });
};

/** Whether a decision still holds: nothing has replaced all of it. */
export const holds = (decision: DecisionModel): boolean => !decision.supersededBy;

/** Whether an agent made a decision that holds and no person has approved it. */
export const awaitsApproval = (decision: DecisionModel): boolean =>
  decision.actor === 'agent' && decision.approvedBy.length === 0 && holds(decision);
