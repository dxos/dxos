//
// Copyright 2026 DXOS.org
//

import { diffLines, diffWordsWithSpace } from 'diff';

/**
 * Shared diff unit consumed by all diff renderings (inline, side-by-side, gutter).
 * Offsets index into the AFTER text; deletions are zero-width and carry the offset where
 * the removed text used to be, so widgets can render the removed content in place.
 */
export type DiffSpan = {
  kind: 'equal' | 'insert' | 'delete';
  from: number;
  to: number;
  text: string;
};

export const diffSpans = (before: string, after: string): DiffSpan[] => {
  const spans: DiffSpan[] = [];
  let offset = 0;
  for (const change of diffWordsWithSpace(before, after)) {
    const kind = change.added ? 'insert' : change.removed ? 'delete' : 'equal';
    const length = kind === 'delete' ? 0 : change.value.length;
    spans.push({ kind, from: offset, to: offset + length, text: change.value });
    offset += length;
  }
  return spans;
};

export type DiffStats = { insertions: number; deletions: number };

/** Character counts, used for the `+N −M` branch summaries. */
export const diffStats = (spans: DiffSpan[]): DiffStats =>
  spans.reduce(
    (stats, span) => {
      if (span.kind === 'insert') {
        stats.insertions += span.text.length;
      } else if (span.kind === 'delete') {
        stats.deletions += span.text.length;
      }
      return stats;
    },
    { insertions: 0, deletions: 0 },
  );

export type Merge3Props = { base: string; ours: string; theirs: string };
export type Merge3Result = { text: string; conflicts: number };

/**
 * Line-based 3-way merge. Non-overlapping hunks apply automatically; overlapping hunks
 * produce git-style conflict markers with the branch (theirs) side first, since the merge
 * flow is review-then-accept and the branch content is what was just reviewed.
 */
export const merge3 = ({ base, ours, theirs }: Merge3Props): Merge3Result => {
  if (ours === base) {
    return { text: theirs, conflicts: 0 };
  }
  if (theirs === base || ours === theirs) {
    return { text: ours, conflicts: 0 };
  }

  const baseLines = splitLines(base);
  const oursHunks = lineHunks(baseLines, splitLines(ours));
  const theirsHunks = lineHunks(baseLines, splitLines(theirs));

  const out: string[] = [];
  let conflicts = 0;
  let baseIndex = 0;
  let oursCursor = 0;
  let theirsCursor = 0;

  while (baseIndex < baseLines.length || oursCursor < oursHunks.length || theirsCursor < theirsHunks.length) {
    const oursHunk = oursHunks[oursCursor];
    const theirsHunk = theirsHunks[theirsCursor];
    const nextOurs = oursHunk?.baseStart ?? Infinity;
    const nextTheirs = theirsHunk?.baseStart ?? Infinity;
    const next = Math.min(nextOurs, nextTheirs);

    // Copy unchanged base lines up to the next hunk.
    while (baseIndex < Math.min(next, baseLines.length)) {
      out.push(baseLines[baseIndex]);
      baseIndex += 1;
    }
    if (next === Infinity) {
      break;
    }

    const oursActive = oursHunk !== undefined && oursHunk.baseStart === next;
    const theirsActive = theirsHunk !== undefined && theirsHunk.baseStart === next;
    const identical =
      oursActive &&
      theirsActive &&
      sameLines(oursHunk.lines, theirsHunk.lines) &&
      oursHunk.baseLength === theirsHunk.baseLength;
    // Hunks conflict when their consumed base intervals overlap — same start, or a staggered
    // hunk beginning inside the interval the active hunk consumes (e.g. [0,2) vs [1,2)).
    const overlap =
      !identical &&
      oursHunk !== undefined &&
      theirsHunk !== undefined &&
      (nextOurs === nextTheirs ||
        (oursActive && nextTheirs < hunkEnd(oursHunk)) ||
        (theirsActive && nextOurs < hunkEnd(theirsHunk)));

    if (overlap) {
      // The conflict region spans the union of both intervals; each side's content is its hunk
      // plus the base lines of the union it leaves unchanged.
      const unionEnd = Math.max(hunkEnd(oursHunk), hunkEnd(theirsHunk));
      out.push(
        '<<<<<<< branch',
        ...sideContent(baseLines, theirsHunk, next, unionEnd),
        '=======',
        ...sideContent(baseLines, oursHunk, next, unionEnd),
        '>>>>>>> current',
      );
      conflicts += 1;
      baseIndex = unionEnd;
      oursCursor += 1;
      theirsCursor += 1;
    } else if (identical) {
      out.push(...oursHunk.lines);
      baseIndex = next + oursHunk.baseLength;
      oursCursor += 1;
      theirsCursor += 1;
    } else if (oursActive) {
      out.push(...oursHunk.lines);
      baseIndex = next + oursHunk.baseLength;
      oursCursor += 1;
    } else if (theirsHunk !== undefined) {
      out.push(...theirsHunk.lines);
      baseIndex = next + theirsHunk.baseLength;
      theirsCursor += 1;
    }
  }

  return { text: joinLines(out, [base, ours, theirs]), conflicts };
};

type Hunk = { baseStart: number; baseLength: number; lines: string[] };

const hunkEnd = (hunk: Hunk) => hunk.baseStart + hunk.baseLength;

/** One side's content for a conflict region: its hunk plus the union's base lines it left unchanged. */
const sideContent = (baseLines: string[], hunk: Hunk, unionStart: number, unionEnd: number): string[] => [
  ...baseLines.slice(unionStart, hunk.baseStart),
  ...hunk.lines,
  ...baseLines.slice(hunkEnd(hunk), unionEnd),
];

/** Convert jsdiff line changes into base-anchored replacement hunks. */
const lineHunks = (baseLines: string[], sideLines: string[]): Hunk[] => {
  const hunks: Hunk[] = [];
  let baseIndex = 0;
  let pending: Hunk | undefined;
  for (const change of diffLines(joinForDiff(baseLines), joinForDiff(sideLines))) {
    const lines = splitLines(stripTrailingNewline(change.value));
    if (change.added) {
      pending = pending ?? { baseStart: baseIndex, baseLength: 0, lines: [] };
      pending.lines.push(...lines);
    } else if (change.removed) {
      pending = pending ?? { baseStart: baseIndex, baseLength: 0, lines: [] };
      pending.baseLength += lines.length;
      baseIndex += lines.length;
    } else {
      if (pending) {
        hunks.push(pending);
        pending = undefined;
      }
      baseIndex += lines.length;
    }
  }
  if (pending) {
    hunks.push(pending);
  }
  return hunks;
};

const sameLines = (a: string[], b: string[]) => a.length === b.length && a.every((line, index) => line === b[index]);

const splitLines = (text: string): string[] => (text === '' ? [] : stripTrailingNewline(text).split('\n'));

const stripTrailingNewline = (text: string) => (text.endsWith('\n') ? text.slice(0, -1) : text);

// diffLines needs a trailing newline so the last line compares as a whole line.
const joinForDiff = (lines: string[]) => (lines.length === 0 ? '' : `${lines.join('\n')}\n`);

const joinLines = (lines: string[], inputs: string[]) => {
  const text = lines.join('\n');
  // Preserve a trailing newline when every non-empty input has one.
  const nonEmpty = inputs.filter((input) => input.length > 0);
  const trailing = nonEmpty.length > 0 && nonEmpty.every((input) => input.endsWith('\n'));
  return trailing && text.length > 0 ? `${text}\n` : text;
};
