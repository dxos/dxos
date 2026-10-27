//
// Copyright 2026 DXOS.org
//

import { parseMdlBlocks } from '@dxos/deus/extension';
import type * as Tag from '@dxos/react-ui/Tag';

import { formatSourceKey, parseSourceKey } from '#sync';

import { type Annotation, parseFields } from './spec-model.ts';

/**
 * A review's verdicts as annotations: the code that implements each item and the tests that exercise it. `done` means
 * tested by definition (see `VERDICT_STATUSES`); nothing is said about testing code that does not exist.
 */
export const reviewAnnotations = (review: ReviewModel | undefined): Annotation[] =>
  (review?.verdicts ?? []).map(({ id, status, evidence, tests }): Annotation => {
    const keys = evidence.map(parseSourceKey).filter((key) => key !== undefined);
    const testKeys = tests.map(parseSourceKey).filter((key) => key !== undefined);
    const testing = testKeys.length > 0 || status === 'done' ? 'tested' : status === 'missing' ? undefined : 'untested';
    return { id, keys, ...(testing && { testing }), ...(testKeys.length > 0 && { tests: testKeys }) };
  });

/**
 * How far the code meets one spec item, least severe first: `done` as specified, `untested` present but with no test
 * that covers it, `partial` in part, `diverged` implemented differently from what the spec says, `missing` not at all.
 */
export const VERDICT_STATUSES = ['done', 'untested', 'partial', 'diverged', 'missing'] as const;

export type VerdictStatus = (typeof VERDICT_STATUSES)[number];

export type Verdict = {
  /** The spec item judged: a block id (`Scene`, `F-1`) or a nested requirement (`F-1.2`). */
  id: string;
  status: VerdictStatus;
  summary?: string;
  /** `github:` keys of the code that supports the verdict. */
  evidence: string[];
  /** `github:` keys of the tests that exercise the item; empty when the review names none. */
  tests: string[];
  /** Where each part of the item is implemented, in reading order; empty when the review gives none. */
  walkthrough: WalkthroughStep[];
  note?: string;
};

/** One segment of a walkthrough: a sentence and the `github:` key of the code it describes. */
export type WalkthroughStep = { text: string; key: string };

/** At most this many segments: a walkthrough says where things are, it does not retell the code. */
export const MAX_WALKTHROUGH = 5;

/** `- a` items, a line without the dash continuing the item above it. */
const listItems = (lines: readonly string[]): string[] =>
  lines.reduce<string[]>(
    (items, line) =>
      line.startsWith('-')
        ? [...items, line.replace(/^-\s*/, '')]
        : items.length > 0
          ? [...items.slice(0, -1), `${items[items.length - 1]} ${line}`]
          : items,
    [],
  );

/** `- <sentence>. github:<key>`, the key last; a step with no key is dropped. */
const parseStep = (item: string): WalkthroughStep[] => {
  const match = item.match(/^(.*?)\s*(github:\S+)\s*$/);
  return match ? [{ text: match[1].replace(/[\s.:—-]+$/, '').trim(), key: match[2] }] : [];
};

/**
 * The walkthrough shown for a verdict: the reviewer's, or one segment per evidence key when the item is implemented
 * in more than one place. Undefined for a single implementation, whose code chip already shows its declaration.
 */
export const walkthroughOf = (verdict: Verdict): WalkthroughStep[] | undefined => {
  if (verdict.walkthrough.length > 0) {
    return verdict.walkthrough.slice(0, MAX_WALKTHROUGH);
  }
  return verdict.evidence.length > 1
    ? verdict.evidence.slice(0, MAX_WALKTHROUGH).map((key) => ({ text: '', key }))
    : undefined;
};

export type ReviewModel = {
  /** Frontmatter: the reviewed spec's key, the commit the code was read at, when, and by whom. */
  spec?: string;
  commit?: string;
  date?: string;
  by?: string;
  verdicts: Verdict[];
};

const severity = (status: VerdictStatus): number => VERDICT_STATUSES.indexOf(status);

export const STATUS_STYLE: Record<VerdictStatus, { icon: string; hue: Tag.TagHue; label: string }> = {
  done: { icon: 'ph--check-circle--regular', hue: 'success', label: 'Done' },
  untested: { icon: 'ph--question--regular', hue: 'info', label: 'Untested' },
  partial: { icon: 'ph--circle-half--regular', hue: 'warning', label: 'Partial' },
  diverged: { icon: 'ph--git-diff--regular', hue: 'orange', label: 'Diverged' },
  missing: { icon: 'ph--x-circle--regular', hue: 'error', label: 'Missing' },
};

const isStatus = (value?: string): value is VerdictStatus =>
  value !== undefined && (VERDICT_STATUSES as readonly string[]).includes(value);

const parseFrontmatter = (text: string): Record<string, string> => {
  const body = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  return Object.fromEntries(
    body.split('\n').flatMap((line) => {
      const match = line.match(/^([\w-]+):\s*(.*?)\s*$/);
      return match ? [[match[1], match[2]]] : [];
    }),
  );
};

/** The `verdict` blocks of a review document; a verdict with no known status is dropped. */
export const parseReview = (text: string): ReviewModel => {
  const { spec, commit, date, by } = parseFrontmatter(text);
  const verdicts = parseMdlBlocks(text)
    .filter(({ type, id }) => type === 'verdict' && id)
    .flatMap(({ id, title, body }): Verdict[] => {
      const fields = parseFields(body);
      const status = fields.get('status')?.inline;
      if (!isStatus(status)) {
        return [];
      }
      // A list may be inline (`[a, b]`), wrapped over several lines, or written as `- a` items.
      const list = (name: string) =>
        [fields.get(name)?.inline, ...(fields.get(name)?.lines ?? [])]
          .join(',')
          .split(',')
          .map((value) => value.replace(/^[\s[-]+|[\s\]]+$/g, ''))
          .filter(Boolean);
      const note = [fields.get('note')?.inline, ...(fields.get('note')?.lines ?? [])].filter(Boolean).join(' ');
      return [
        {
          id,
          status,
          ...(title && { summary: title }),
          evidence: list('evidence'),
          tests: list('tests'),
          walkthrough: listItems(fields.get('walkthrough')?.lines ?? []).flatMap(parseStep),
          ...(note && { note }),
        },
      ];
    });
  return { spec, commit, date, by, verdicts };
};

/**
 * The status shown for a spec item: its own verdict, else the worst verdict of the items nested under it
 * (`F-1` from `F-1.1`, `F-1.2`), so a feature reads as missing when any of its requirements is.
 */
export const statusOf = (review: ReviewModel | undefined, id: string): VerdictStatus | undefined => {
  if (!review) {
    return undefined;
  }
  const own = review.verdicts.find((verdict) => verdict.id === id);
  if (own) {
    return own.status;
  }
  const nested = review.verdicts.filter((verdict) => verdict.id.startsWith(`${id}.`));
  return nested.length > 0
    ? nested.reduce((worst, { status }) => (severity(status) > severity(worst) ? status : worst), nested[0].status)
    : undefined;
};

/** Verdict counts per status, in display order. */
export const summarizeReview = (review: ReviewModel): { status: VerdictStatus; count: number }[] =>
  VERDICT_STATUSES.map((status) => ({
    status,
    count: review.verdicts.filter((verdict) => verdict.status === status).length,
  })).filter(({ count }) => count > 0);

/** The files a review cites (evidence, tests and walkthrough steps), without fragments and in a stable order. */
export const citedFiles = (review: ReviewModel): string[] =>
  [
    ...new Set(
      review.verdicts
        .flatMap(({ evidence, tests, walkthrough }) => [...evidence, ...tests, ...walkthrough.map(({ key }) => key)])
        .map(parseSourceKey)
        .filter((key) => key !== undefined)
        .map((key) => formatSourceKey(key, false)),
    ),
  ].sort();
