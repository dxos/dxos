//
// Copyright 2026 DXOS.org
//

import { type PatchFile, type PatchHunk, hunkOverlaps, hunkRange, parsePatch, renderHunks } from './patch.ts';

/** A diff fence the model emitted, located in the walkthrough body. */
type Placeholder = {
  /** Offsets of the whole fence, opening and closing lines included. */
  from: number;
  to: number;
  /** The run of backticks or tildes that opened it, so the rewrite closes it the same way. */
  fence: string;
  /** Leading whitespace, which the replacement has to reproduce or it breaks its enclosing list. */
  indent: string;
  attributes: Record<string, string>;
  /** Whether the model left the fence empty, which is the contract it is asked to follow. */
  empty: boolean;
};

export type WalkthroughFill = {
  body: string;
  /** Hunks no fence claimed, in patch order — what the appended section covers. */
  missed: { path: string; hunks: PatchHunk[] }[];
  /** Files the patch changed without changing any line: renames, mode changes, binaries. */
  textless: string[];
  /** Fences naming a file the patch does not contain; left in place with a note. */
  unresolved: string[];
  /** Hunks the body accounts for, over the patch's total. */
  covered: number;
  total: number;
};

/**
 * Opening fence plus its info line; the body is whatever follows up to the matching close. Built per
 * call rather than shared: a `/g` regex carries `lastIndex` between uses.
 *
 * At most three spaces of indent, because four makes it an indented code block in CommonMark rather
 * than a fence.
 */
const fencePattern = () => /^( {0,3})(`{3,}|~{3,})[ \t]*diff\b([^\n]*)$/gm;

const parseAttributes = (info: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const token of info.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []) {
    const separator = token.indexOf('=');
    if (separator > 0) {
      attributes[token.slice(0, separator)] = token.slice(separator + 1).replace(/^["']|["']$/g, '');
    } else if (!attributes.file) {
      // A bare token is the path, matching what the editor's fence parser accepts.
      attributes.file = token.replace(/^["']|["']$/g, '');
    }
  }

  return attributes;
};

const findPlaceholders = (body: string): Placeholder[] => {
  const placeholders: Placeholder[] = [];
  const pattern = fencePattern();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) {
    const [opening, indent, fence, info] = match;
    const bodyStart = match.index + opening.length + 1;
    // A fence closes on a line of at least as many of the same marker, per CommonMark.
    const close = new RegExp(`^[ \\t]*${fence[0]}{${fence.length},}[ \\t]*$`, 'm');
    close.lastIndex = 0;
    const rest = body.slice(bodyStart);
    const closeMatch = close.exec(rest);
    const contents = closeMatch ? rest.slice(0, closeMatch.index) : rest;
    const to = closeMatch ? bodyStart + closeMatch.index + closeMatch[0].length : body.length;
    placeholders.push({
      // Starts AT the indent, not after it: the replacement re-emits it on every line, so leaving it
      // in the preceding slice would indent the opening fence twice.
      from: match.index,
      to,
      fence,
      indent,
      attributes: parseAttributes(info),
      empty: contents.trim().length === 0,
    });
    pattern.lastIndex = to;
  }

  return placeholders;
};

/** The hunks a fence asks for: those overlapping its `lines=`, or the whole file without one. */
const selectHunks = (file: PatchFile, lines: string | undefined): PatchHunk[] => {
  const range = lines?.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!range) {
    return file.hunks;
  }
  const start = Number(range[1]);
  const end = range[2] === undefined ? start : Number(range[2]);
  const selected = file.hunks.filter((hunk) => hunkOverlaps(hunk, start, end));
  // A range that matches nothing is the model guessing; the file's hunks are better than an empty chunk.
  return selected.length > 0 ? selected : file.hunks;
};

const buildFence = (fence: string, attributes: Record<string, string>, contents: string, indent = ''): string => {
  const info = Object.entries(attributes)
    // An attribute with no value would emit a dangling `lines=`, which is not a fence the editor reads.
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => `${key}=${/\s/.test(value) ? `"${value}"` : value}`)
    .join(' ');
  // Every line carries the opening fence's indent, or a fence inside a list item closes outside it.
  const lines = [`${fence}diff${info ? ` ${info}` : ''}`, ...contents.split('\n'), fence];
  return lines.map((line) => (line.length > 0 ? indent + line : line)).join('\n');
};

/**
 * Fills the walkthrough's empty diff fences from the pull request's own patch, then reports what the
 * prose never mentioned.
 *
 * The model is asked for placeholders — a path and a line range — rather than diff content, because
 * a model that transcribes a diff gets lines subtly wrong and the result is a review artefact that
 * lies about the change. Here the bytes come from git and only the selection is the model's.
 */
export const fillWalkthrough = (body: string, patch: string): WalkthroughFill => {
  const files = parsePatch(patch);
  const byPath = new Map(files.map((file) => [file.path, file]));
  const used = new Set<PatchHunk>();
  const unresolved: string[] = [];

  let filled = '';
  let cursor = 0;
  for (const placeholder of findPlaceholders(body)) {
    const { file: path, ...rest } = placeholder.attributes;
    const file = path ? byPath.get(path) : undefined;
    const verbatim = body.slice(placeholder.from, placeholder.to);
    filled += body.slice(cursor, placeholder.from);
    cursor = placeholder.to;

    // A fence the model filled itself is NOT counted as covering anything: its content is the
    // model's own words, so the real hunks still have to reach the reader below.
    if (!placeholder.empty) {
      filled += verbatim;
      continue;
    }

    // Kept verbatim rather than dropped: whatever the prose was pointing at is still worth seeing,
    // and a fence naming nothing is the likeliest mistake a model makes.
    if (!path) {
      unresolved.push('(a fence with no file)');
      filled += verbatim;
      continue;
    }
    if (!file) {
      unresolved.push(path);
      filled += verbatim;
      continue;
    }

    // A rename, a mode change or a binary file has no hunks; there is nothing to splice, and an
    // empty fence would render as a bare code block.
    const hunks = selectHunks(file, rest.lines);
    if (hunks.length === 0) {
      unresolved.push(path);
      filled += verbatim;
      continue;
    }

    for (const hunk of hunks) {
      used.add(hunk);
    }
    filled += buildFence(
      placeholder.fence,
      { file: path, ...rest, lines: hunkRange(hunks) ?? rest.lines ?? '' },
      renderHunks(hunks),
      placeholder.indent,
    );
  }
  filled += body.slice(cursor);

  const missed = files
    .map((file) => ({ path: file.path, hunks: file.hunks.filter((hunk) => !used.has(hunk)) }))
    .filter((file) => file.hunks.length > 0);
  // A rename, a mode change or a binary file has no hunks to show, but the reader still has to learn
  // it changed — counting it nowhere would report full coverage of a pull request nobody saw.
  const textless = files.filter((file) => file.hunks.length === 0).map((file) => file.path);
  const total = files.reduce((count, file) => count + file.hunks.length, 0);
  const appendix = renderMissed(missed, textless);

  return {
    body: appendix ? filled.trimEnd() + '\n' + appendix : filled,
    missed,
    textless,
    unresolved,
    covered: used.size,
    total,
  };
};

/** The trailing section: everything the walkthrough did not account for, so the diff stays whole. */
const renderMissed = (missed: { path: string; hunks: PatchHunk[] }[], textless: string[]): string => {
  if (missed.length === 0 && textless.length === 0) {
    return '';
  }

  const hunks = missed.reduce((count, file) => count + file.hunks.length, 0);
  const lines = ['', '## Also changed', ''];
  if (missed.length > 0) {
    lines.push(
      `${hunks} ${hunks === 1 ? 'hunk' : 'hunks'} across ${missed.length} ${missed.length === 1 ? 'file' : 'files'} the walkthrough above does not describe.`,
      '',
    );
  }
  for (const file of missed) {
    lines.push(buildFence('```', { file: file.path, lines: hunkRange(file.hunks) ?? '' }, renderHunks(file.hunks)), '');
  }
  if (textless.length > 0) {
    lines.push(`Changed with no lines to show (renamed, mode-only or binary): ${textless.join(', ')}.`, '');
  }

  return lines.join('\n');
};
