//
// Copyright 2026 DXOS.org
//

import {
  type Annotation,
  type ReviewModel,
  type SourceKey,
  type Verdict,
  type VerdictStatus,
  formatSourceKey,
  parseReview,
  reviewAnnotations,
} from '@dxos/deus/review';

import { declarations, reviewPathOf } from './resolve.ts';
import { type Workspace } from './workspace.ts';

/** Kinds that describe behaviour to exercise, so a review judges whether automation runs them (`lang/review.mdl`). */
const EXERCISE_KINDS = new Set(['scenario', 'test']);

/** The chip text of each status, as the spec viewer labels it. */
export const STATUS_LABEL: Record<VerdictStatus, string> = {
  done: 'Done',
  untested: 'Untested',
  partial: 'Partial',
  diverged: 'Diverged',
  missing: 'Missing',
};

/** A glyph per status, since an inlay hint or code lens has no colour of its own. */
export const STATUS_ICON: Record<VerdictStatus, string> = {
  done: '✓',
  untested: '?',
  partial: '◐',
  diverged: '≠',
  missing: '✗',
};

/** What a scenario or test is judged on: whether automation runs it. */
export const EXERCISE_LABEL: Record<VerdictStatus, string> = {
  done: 'tested',
  partial: 'partly tested',
  diverged: 'partly tested',
  missing: 'not tested',
  untested: 'not tested',
};

/** One reviewed item of the open spec: where it is declared and what its review says. */
export type ReviewedItem = {
  /** 0-based line of the item's declaration. */
  line: number;
  kind: string;
  verdict: Verdict;
  annotation?: Annotation;
  /** A scenario or test, judged on whether automation exercises it. */
  exercise: boolean;
};

/** The review beside a spec, when there is one. */
export const reviewOf = (workspace: Workspace, specPath: string): ReviewModel | undefined => {
  const reviewPath = reviewPathOf(specPath);
  const text = reviewPath ? workspace.read(reviewPath) : undefined;
  return text === undefined ? undefined : parseReview(text);
};

/**
 * Each item of the spec its review judges, at the item's first declaration; later mentions (a changelog's `affects:`)
 * are not the item itself. Mirrors plugin-code's `reviewGutter`.
 */
export const reviewedItems = (workspace: Workspace, specPath: string, text: string): ReviewedItem[] => {
  const review = reviewOf(workspace, specPath);
  if (!review) {
    return [];
  }
  const verdicts = new Map(review.verdicts.map((verdict) => [verdict.id, verdict]));
  const annotations = new Map(reviewAnnotations(review).map((annotation) => [annotation.id, annotation]));
  return declarations(text).flatMap(({ kind, id, line }) => {
    const verdict = verdicts.get(id);
    return verdict
      ? [{ line, kind, verdict, annotation: annotations.get(id), exercise: EXERCISE_KINDS.has(kind) }]
      : [];
  });
};

/** A key's short label: its symbol, else its file name. */
export const keyLabel = (key: SourceKey): string => key.fragment ?? key.path.split('/').pop() ?? key.path;

/** The chips a reviewed item shows, in the spec viewer's order. */
export type Chip =
  | { kind: 'status'; text: string; tooltip: string }
  | { kind: 'code' | 'test'; text: string; key: SourceKey }
  | { kind: 'more'; text: string; keys: SourceKey[] }
  | { kind: 'note'; text: string; tooltip: string };

/** More code chips than this collapse into a `+n` chip, as in the spec viewer. */
export const MAX_CODE_CHIPS = 3;

const codeChips = (keys: readonly SourceKey[], kind: 'code' | 'test'): Chip[] => [
  ...keys.slice(0, MAX_CODE_CHIPS).map((key): Chip => ({ kind, text: `</> ${keyLabel(key)}`, key })),
  ...(keys.length > MAX_CODE_CHIPS
    ? [{ kind: 'more', text: `+${keys.length - MAX_CODE_CHIPS}`, keys: keys.slice(MAX_CODE_CHIPS) } satisfies Chip]
    : []),
];

/** The status chip, the code and test chips, and the testing note of one reviewed item. */
export const chipsOf = ({ verdict, annotation, exercise }: ReviewedItem): Chip[] => {
  const { id, status, summary, note } = verdict;
  const label = STATUS_LABEL[status];
  const chips: Chip[] = [
    {
      kind: 'status',
      text: `${STATUS_ICON[status]} ${label}`,
      tooltip: [`${label}: ${summary ?? id}`, note].filter(Boolean).join('\n\n'),
    },
  ];
  const keys = annotation?.keys ?? [];
  const tests = annotation?.tests ?? [];
  if (exercise) {
    chips.push(...codeChips(tests, 'test'), ...codeChips(keys, 'code'));
    chips.push({ kind: 'note', text: EXERCISE_LABEL[status], tooltip: note ?? EXERCISE_LABEL[status] });
    return chips;
  }
  if (keys.length === 0) {
    chips.push({ kind: 'note', text: 'no code', tooltip: 'The review found no code for this item.' });
  } else {
    chips.push(...codeChips(keys, 'code'));
  }
  if (annotation?.testing) {
    chips.push(
      ...(tests.length > 0
        ? codeChips(tests, 'test')
        : [
            {
              kind: 'note',
              text: annotation.testing,
              tooltip:
                annotation.testing === 'tested'
                  ? 'Tested: the review judged the item done.'
                  : 'No test exercises this item.',
            } satisfies Chip,
          ]),
    );
  }
  return chips;
};

/** The keys a chip opens, for a tooltip listing them. */
export const chipKeys = (chip: Chip): string[] =>
  chip.kind === 'code' || chip.kind === 'test'
    ? [formatSourceKey(chip.key)]
    : chip.kind === 'more'
      ? chip.keys.map((key) => formatSourceKey(key))
      : [];
