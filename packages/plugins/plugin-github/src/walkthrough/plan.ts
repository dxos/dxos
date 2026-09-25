//
// Copyright 2026 DXOS.org
//

import { isGeneratedFile } from './generated.ts';
import { type PatchFile, parsePatch } from './patch.ts';

/**
 * Two-stage generation for a pull request whose diff does not fit one prompt.
 *
 * One-shot generation over a trimmed diff fails in a specific way on a large change: the model
 * writes the first two sections in full, then runs out of room and leaves the rest to the appended
 * `## Also changed` section — so the bigger the pull request, the less of it the walkthrough
 * actually covers. Here a planner sees only the file list and decides the chapters, then each
 * chapter is narrated against its own files, and the chapters are concatenated.
 */

/** A chapter the planner assigned files to. */
export type Chapter = {
  title: string;
  /** Paths from the file list, exactly as given. */
  files: string[];
  /** Why this chapter exists, handed to the chapter writer as its brief. */
  summary?: string;
};

export type Plan = {
  /** The H1 for the whole document. */
  title: string;
  /** Two or three sentences opening the document, before the first chapter. */
  overview: string;
  chapters: Chapter[];
};

/**
 * Diffs longer than this get the two-stage treatment.
 *
 * Twice the one-shot budget: below that, trimming drops a file or two and the single prompt still
 * sees the shape of the change, and a second model call would buy nothing.
 */
export const DEFAULT_CHAPTER_THRESHOLD_CHARS = 32_000;

export const PLANNER_SYSTEM_PROMPT = [
  'You plan the chapters of a walkthrough: the document that takes a reviewer through a pull',
  'request in the order it is best understood.',
  '',
  'You see the files and their sizes, never their contents. Decide the ORDER a reviewer should meet',
  'this change in, and which files belong together.',
  '',
  'Rules:',
  '- The core of the change comes first. Mechanical consequences (call sites, tests, docs) come',
  '  after the thing that forced them.',
  '- A chapter is a reason, not a directory. Files that change for the same reason belong together',
  '  however far apart they sit in the tree.',
  '- Every file in the list belongs to exactly one chapter. Do not invent files.',
  '- Between three and seven chapters. Fewer on a change with one idea, more on a change that',
  '  genuinely does several things.',
  '',
  'Answer with JSON and nothing else:',
  '{"title": "…", "overview": "…", "chapters": [{"title": "…", "summary": "…", "files": ["…"]}]}',
  '',
  '`title` is the H1 for the document: what the change does, in one line. `overview` is two or',
  'three sentences on what it does and why, for the reader who has not seen the diff. Each',
  "chapter's `summary` is one sentence telling that chapter's writer what to explain.",
].join('\n');

/** The file list the planner sees: path, size of change, and nothing else. */
export const buildPlannerPrompt = (
  facts: { owner: string; repo: string; number: number; title: string; description?: string },
  diff: string,
): string => {
  const files = parsePatch(diff).filter((file) => !isGeneratedFile(file));
  const lines = [`Repository: ${facts.owner}/${facts.repo}`, `Pull request: #${facts.number}`, `Title: ${facts.title}`];
  if (facts.description?.trim()) {
    lines.push('', 'Description as written by the author:', facts.description.trim());
  }
  lines.push('', `Files changed (${files.length}):`, '');
  for (const file of files) {
    lines.push(`${file.path} (+${file.added}/-${file.removed}, ${file.hunks.length} hunks)`);
  }

  return lines.join('\n');
};

/**
 * Reads the planner's answer.
 *
 * Tolerant of a fenced block or surrounding prose, because a refusal to parse costs the whole run
 * and the recovery — falling back to one-shot — is worse than reading a fence.
 */
export const parsePlan = (response: string, paths: readonly string[]): Plan | undefined => {
  // A closer is its own line of at least as many backticks: a `​``text` sequence inside a JSON
  // string would otherwise end the block early and leave `JSON.parse` a truncated payload.
  const fenced = response.match(/^[ \t]*(`{3,})[^\n]*\n([\s\S]*?)^[ \t]*\1`*[ \t]*$/m);
  const text = (fenced?.[2] ?? response).trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }

  const decoded = decodePlan(parsed);
  if (!decoded) {
    return undefined;
  }

  const known = new Set(paths);
  const claimed = new Set<string>();
  const chapters: Chapter[] = [];
  for (const chapter of decoded.chapters) {
    // A path the patch does not contain, or one a previous chapter already took, would make a
    // chapter prompt carrying no diff — an invented file is the planner's likeliest mistake.
    const files = chapter.files.filter((path) => known.has(path) && !claimed.has(path));
    for (const path of files) {
      claimed.add(path);
    }
    if (files.length > 0) {
      chapters.push({ title: chapter.title, files, summary: chapter.summary });
    }
  }
  if (chapters.length === 0) {
    return undefined;
  }

  // Files the planner forgot still have to reach the reader, and the last chapter is where the
  // mechanical remainder belongs.
  const unclaimed = paths.filter((path) => !claimed.has(path));
  if (unclaimed.length > 0) {
    chapters.push({ title: 'The rest of the change', files: [...unclaimed] });
  }

  return { title: decoded.title, overview: decoded.overview, chapters };
};

/** Fields of the shape the planner was asked for; anything else is dropped rather than carried. */
const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * Reads the model's JSON into the typed shape, field by field.
 *
 * Every value is checked, `summary` included: a non-string there would reach `buildChapterPrompt`
 * and be interpolated into the next prompt as `[object Object]`.
 */
const decodePlan = (value: unknown): (Omit<Plan, 'chapters'> & { chapters: Chapter[] }) | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (!isString(record.title) || !Array.isArray(record.chapters)) {
    return undefined;
  }

  const chapters = record.chapters.flatMap((entry): Chapter[] => {
    if (typeof entry !== 'object' || entry === null) {
      return [];
    }
    const chapter = entry as Record<string, unknown>;
    if (!isString(chapter.title) || !Array.isArray(chapter.files)) {
      return [];
    }
    return [
      {
        title: chapter.title,
        files: chapter.files.filter(isString),
        ...(isString(chapter.summary) ? { summary: chapter.summary } : {}),
      },
    ];
  });

  return { title: record.title, overview: isString(record.overview) ? record.overview : '', chapters };
};

/** The diff of one chapter's files, in patch order. */
export const chapterDiff = (files: readonly PatchFile[], chapter: Chapter): string => {
  const wanted = new Set(chapter.files);
  return files
    .filter((file) => wanted.has(file.path))
    .map((file) => [...file.preamble, ...file.hunks.flatMap((hunk) => [hunk.header, ...hunk.lines])].join('\n'))
    .join('\n');
};

export const CHAPTER_SYSTEM_PROMPT = [
  'You write ONE chapter of a walkthrough of a pull request: the section a reviewer reads to',
  'understand this part of the change.',
  '',
  'You are given the chapter you are writing, the document it belongs to, and the diff of this',
  "chapter's files only. Other chapters cover the rest; do not describe them.",
  '',
  'Output:',
  '- Open with the H2 heading you are given, exactly as given. No H1, no other H2.',
  '- Under it, a short paragraph saying what this part does and what constraint it satisfies, then',
  '  the code it refers to.',
  '- Reference a change with an EMPTY fenced block, exactly like this, and nothing inside it:',
  '',
  '  ```diff file=path/to/file.ts lines=66-99',
  '  ```',
  '',
  '- `file` is the path exactly as the diff gives it. `lines` is the range in the file AFTER the',
  '  change, from the `@@` header. NEVER put diff content inside the fence: it is filled in for you',
  '  from the real patch, and anything you write there is discarded.',
  '- A mechanical change repeated across files is one point: fence the instance that shows the',
  '  shape and say how many others take it.',
  '- EVERY file listed in your chapter appears in at least one fence. A file whose hunks do not',
  '  each earn a paragraph still gets one fence, grouped with the others that change for its reason.',
  '',
  'Write for a reviewer reading once. The sentence rule is the one that matters most:',
  '- ONE IDEA PER SENTENCE, under thirty words. No semicolons joining two clauses, no dashes',
  '  carrying a second thought, no sentence that needs a comma-separated list of parentheticals.',
  '  Where you would write a long sentence, write two short ones.',
  '- Name the mechanism, not the feeling. Prose explains WHY the change is the way it is: the',
  '  constraint, the failure it avoids, the alternative rejected. Do not narrate what the diff shows.',
  '- Active voice with the actor named. Plain words. Sentence case headings. No emoji.',
  '- Output the markdown for this chapter and nothing else. No preamble, no closing summary.',
].join('\n');

export const buildChapterPrompt = (plan: Plan, chapter: Chapter, diff: string): string =>
  [
    `Document: ${plan.title}`,
    plan.overview ? `Overview: ${plan.overview}` : '',
    '',
    `Your chapter: ## ${chapter.title}`,
    chapter.summary ? `What it must explain: ${chapter.summary}` : '',
    '',
    `Other chapters, for context only: ${plan.chapters
      .filter((other) => other.title !== chapter.title)
      .map((other) => other.title)
      .join('; ')}`,
    '',
    'Diff:',
    '',
    diff,
  ]
    .filter((line) => line !== '')
    .join('\n');

/** Stitches the planner's opening and the chapter bodies into one document. */
export const assembleWalkthrough = (plan: Plan, chapters: string[]): string =>
  [`# ${plan.title}`, '', plan.overview, '', ...chapters.map((chapter) => chapter.trim())]
    .filter((part, index) => part !== '' || index < 3)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd() + '\n';
