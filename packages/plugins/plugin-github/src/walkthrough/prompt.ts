//
// Copyright 2026 DXOS.org
//

import { parsePatch } from './patch.ts';

/** What the model is told about the change. */
export type WalkthroughInput = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  description?: string;
  baseBranch?: string;
  headBranch?: string;
  /** The whole unified diff, as git wrote it. */
  diff: string;
};

export type PromptOptions = {
  /**
   * Character budget for the diff. Files are dropped smallest-budget-first when it is exceeded;
   * anything dropped still reaches the reader, because the postprocess appends every hunk the prose
   * does not claim.
   */
  maxDiffChars?: number;
};

/**
 * Measured against Sonnet, whose 16k output budget covers reasoning AND the answer. A whole
 * 75k-character diff is ~33k input tokens, and the model then spends the entire output budget
 * reasoning: the response comes back `finishReason: 'length'` carrying a reasoning block and NO
 * text at all. At ~19k characters the same request answers in full with room to spare.
 *
 * Trimming costs nothing a reader sees, because every hunk the prose does not claim is appended
 * verbatim by {@link fillWalkthrough}.
 */
const DEFAULT_MAX_DIFF_CHARS = 16_000;

/**
 * What the model is for: the ORDER and the REASONS, never the diff content.
 *
 * Every chunk is emitted as an empty fence carrying a path and a line range, which a postprocess
 * fills from the patch itself. A model asked to transcribe a diff gets lines subtly wrong, and a
 * review artefact that misquotes the change is worse than no artefact.
 */
export const SYSTEM_PROMPT = [
  'You write walkthroughs of pull requests: one markdown document that takes a reviewer through a',
  'change in the order it is best understood, rather than in the order the files happen to sort.',
  '',
  'Structure:',
  '- Open with an H1 naming the change, then two or three sentences on what it does and why.',
  '- Group the change into sections with H2 headings, ordered so each one builds on the last.',
  '  Put the core of the change first and the mechanical consequences after it.',
  '- Under a heading, write a short paragraph saying what this part does and what constraint it',
  '  satisfies, then show the code it refers to.',
  '',
  'Showing code — this is the part to get right:',
  '- Reference a change with an EMPTY fenced block, exactly like this, and nothing inside it:',
  '',
  '  ```diff file=path/to/file.ts lines=66-99',
  '  ```',
  '',
  '- `file` is the path exactly as the diff gives it, after the change. `lines` is the range in the',
  '  file AFTER the change, taken from the `@@` header. Omit `lines` to show the whole file.',
  '- NEVER put diff content, code, `@@` headers or `+`/`-` lines inside the fence. It is filled in',
  '  for you from the real patch. Anything you write there is discarded.',
  '- One fence per point being made. Several fences under one heading is normal.',
  '',
  'Style:',
  '- Prose explains WHY the change is the way it is: the constraint, the failure it avoids, the',
  '  alternative that was rejected. Do not narrate what the diff already shows.',
  '- Do not describe every file. Cover what a reviewer must understand; the rest is appended for',
  '  you under a separate heading.',
  '- No preamble, no "this PR", no closing summary. Output the markdown document and nothing else.',
].join('\n');

/** Trims the patch to the budget, keeping as many files as fit and naming what was left out. */
const budgetDiff = (diff: string, maxChars: number): { diff: string; omitted: string[] } => {
  if (diff.length <= maxChars) {
    return { diff, omitted: [] };
  }

  // Whole files, smallest first: a walkthrough of many small files is more useful than one of a
  // single generated blob, and the lockfiles this drops are exactly what a reviewer skips anyway.
  const files = parsePatch(diff).map((file) => ({
    path: file.path,
    text: [...file.preamble, ...file.hunks.flatMap((hunk) => [hunk.header, ...hunk.lines])].join('\n'),
  }));
  const order = [...files].sort((left, right) => left.text.length - right.text.length);
  const kept = new Set<string>();
  let used = 0;
  for (const file of order) {
    if (used + file.text.length > maxChars) {
      continue;
    }
    used += file.text.length + 1;
    kept.add(file.path);
  }

  return {
    diff: files
      .filter((file) => kept.has(file.path))
      .map((file) => file.text)
      .join('\n'),
    omitted: files.filter((file) => !kept.has(file.path)).map((file) => file.path),
  };
};

/** The user-side content: what the change is, followed by the diff the fences will be filled from. */
export const buildPrompt = (input: WalkthroughInput, options: PromptOptions = {}): string => {
  const { diff, omitted } = budgetDiff(input.diff, options.maxDiffChars ?? DEFAULT_MAX_DIFF_CHARS);
  const lines = [`Repository: ${input.owner}/${input.repo}`, `Pull request: #${input.number}`, `Title: ${input.title}`];
  if (input.headBranch && input.baseBranch) {
    lines.push(`Branch: ${input.headBranch} into ${input.baseBranch}`);
  }
  if (input.description?.trim()) {
    lines.push('', 'Description as written by the author:', input.description.trim());
  }
  if (omitted.length > 0) {
    lines.push('', `Omitted from the diff below for length, and not yours to describe: ${omitted.join(', ')}.`);
  }
  lines.push('', 'Diff:', '', diff);

  return lines.join('\n');
};

/** Chunks the model cannot have claimed, because the diff never showed them. */
export const promptOmissions = (input: WalkthroughInput, options: PromptOptions = {}): string[] =>
  budgetDiff(input.diff, options.maxDiffChars ?? DEFAULT_MAX_DIFF_CHARS).omitted;
