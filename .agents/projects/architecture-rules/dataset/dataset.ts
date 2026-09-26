//
// Copyright 2026 DXOS.org
//

// The labelled examples calibration reads: every rule cites the review comments it was mined from,
// and each comment carries the diff hunk its reviewer flagged, so those hunks are positives for
// that rule. A hunk cited by an unrelated rule is a presumed negative.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Rule } from '../../../skills/agentic-review/lib/mdl.ts';

/** One review comment record, cut to the fields calibration reads. */
export type Comment = {
  url: string;
  path: string;
  diff_hunk?: string;
  original_commit_id?: string;
  /** Line the reviewer commented on, in the file at `original_commit_id`. */
  original_line?: number | null;
};

/** A hunk and the rules that cite it. */
export type LabelledHunk = { comment: Comment; rules: Set<string> };

/** The examples for a set of rules: each rule's own hunks, and every hunk with its citing rules. */
export type Labels = { positives: Map<string, Comment[]>; hunks: Map<string, LabelledHunk> };

const COMMENT_URL_RE = /https:\/\/github\.com\/\S+?discussion_r\d+/g;

/**
 * Label hunks for `rules` from the clusters (whose sections list example comments) and the
 * chunked comments `chunk.ts` writes.
 *
 * @param dir The dataset directory.
 */
export const loadLabels = (dir: string, rules: readonly Rule[]): Labels => {
  // Cluster sections carry their example comment URLs; a rule's `Source:` line names one of them.
  const clusterExamples: string[][] = [];
  for (const name of readdirSync(join(dir, 'clusters'))) {
    for (const section of readFileSync(join(dir, 'clusters', name), 'utf8').split(/\n(?=## \d+\.)/)) {
      const urls = section.match(/^- examples:(.*)$/m)?.[1].match(COMMENT_URL_RE);
      if (urls) {
        clusterExamples.push(urls);
      }
    }
  }
  const comments = new Map<string, Comment>();
  for (const name of readdirSync(join(dir, 'chunks'))) {
    for (const line of readFileSync(join(dir, 'chunks', name), 'utf8')
      .split('\n')
      .filter(Boolean)) {
      const comment: Comment = JSON.parse(line);
      comments.set(comment.url, comment);
    }
  }

  const positives = new Map<string, Comment[]>();
  for (const rule of rules) {
    const source = rule.instructions.match(COMMENT_URL_RE)?.[0];
    const urls = clusterExamples.find((examples) => examples.includes(source ?? '')) ?? (source ? [source] : []);
    const own = urls
      .map((url) => comments.get(url))
      .filter((comment): comment is Comment => Boolean(comment?.diff_hunk));
    if (own.length > 0) {
      positives.set(rule.id, own);
    }
  }
  const hunks = new Map<string, LabelledHunk>();
  for (const [ruleId, list] of positives) {
    for (const comment of list) {
      const entry = hunks.get(comment.url) ?? { comment, rules: new Set<string>() };
      entry.rules.add(ruleId);
      hunks.set(comment.url, entry);
    }
  }
  return { positives, hunks };
};

/** Median of a non-empty list. */
export const median = (list: readonly number[]): number => {
  const sorted = [...list].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Mean, NaN for an empty list. */
export const mean = (list: readonly number[]): number =>
  list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : NaN;

/** Share of `list` at or above `threshold`, NaN for an empty list. */
export const rate = (list: readonly number[], threshold: number): number =>
  list.length ? list.filter((value) => value >= threshold).length / list.length : NaN;

/** A share as a whole percentage, `n/a` for NaN. */
export const pct = (value: number): string => (Number.isNaN(value) ? 'n/a' : `${Math.round(value * 100)}%`);
