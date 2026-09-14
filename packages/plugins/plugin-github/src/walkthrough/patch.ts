//
// Copyright 2026 DXOS.org
//

/** A `@@` hunk, kept as the verbatim lines git emitted so filling a chunk is lossless. */
export type PatchHunk = {
  /** The `@@ -a,b +c,d @@ section` line. */
  header: string;
  /** Body lines (context, additions, removals), without the header. */
  lines: string[];
  /** 1-based inclusive span in the file AFTER the change; `afterEnd < afterStart` for a pure removal. */
  afterStart: number;
  afterEnd: number;
  /** The same span in the file BEFORE it, which is all a pure removal has. */
  beforeStart: number;
  beforeEnd: number;
  added: number;
  removed: number;
};

export type PatchFile = {
  /** Path after the change, or the pre-image path when the file was deleted. */
  path: string;
  /** Headers git emitted before the first hunk (`diff --git`, `index`, `---`, `+++`). */
  preamble: string[];
  hunks: PatchHunk[];
  added: number;
  removed: number;
};

const FILE_HEADER = /^diff --git a\/(.+?) b\/(.+)$/;
const HUNK_HEADER = /^@@+\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/;

/**
 * Splits a multi-file unified diff — what `GET /repos/…/pulls/N` returns under the `diff` media type
 * — into files and hunks. Hunk bodies are carried verbatim rather than re-derived, so a chunk filled
 * from one is byte-identical to what git produced.
 */
export const parsePatch = (patch: string): PatchFile[] => {
  const files: PatchFile[] = [];
  let file: PatchFile | undefined;
  let hunk: PatchHunk | undefined;

  for (const raw of patch.split('\n')) {
    // A patch saved or served with CRLF keeps its carriage returns, and every match below is
    // anchored: left in place they make the whole parse return nothing at all.
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const header = FILE_HEADER.exec(line);
    if (header) {
      // `b/` is the post-image path and is `/dev/null` only in the `+++` line, never here.
      file = { path: header[2], preamble: [line], hunks: [], added: 0, removed: 0 };
      files.push(file);
      hunk = undefined;
      continue;
    }
    if (!file) {
      continue;
    }

    const hunkHeader = HUNK_HEADER.exec(line);
    if (hunkHeader) {
      const beforeStart = Number(hunkHeader[1]);
      const beforeCount = hunkHeader[2] === undefined ? 1 : Number(hunkHeader[2]);
      const afterStart = Number(hunkHeader[3]);
      const afterCount = hunkHeader[4] === undefined ? 1 : Number(hunkHeader[4]);
      hunk = {
        header: line,
        lines: [],
        afterStart,
        afterEnd: afterStart + afterCount - 1,
        beforeStart,
        beforeEnd: beforeStart + beforeCount - 1,
        added: 0,
        removed: 0,
      };
      file.hunks.push(hunk);
      continue;
    }

    if (!hunk) {
      file.preamble.push(line);
      continue;
    }

    // `\ No newline at end of file` annotates the preceding line and is not a line of either version.
    if (line.startsWith('\\')) {
      hunk.lines.push(line);
      continue;
    }
    if (line.startsWith('+')) {
      hunk.added++;
      file.added++;
    } else if (line.startsWith('-')) {
      hunk.removed++;
      file.removed++;
    }
    hunk.lines.push(line);
  }

  // Only the LAST hunk of the LAST file can carry the transport's trailing newline, and only one of
  // them: a blank line anywhere else is context the chunk has to keep showing.
  const trailing = files.at(-1)?.hunks.at(-1);
  if (trailing?.lines.at(-1) === '') {
    trailing.lines.pop();
  }

  // A patch may name one path twice (a rename reported as delete-then-add, a malformed paste). Their
  // hunks belong to one file, or the second silently hides the first from every fence.
  const merged = new Map<string, PatchFile>();
  for (const file of files) {
    const existing = merged.get(file.path);
    if (existing) {
      existing.hunks.push(...file.hunks);
      existing.added += file.added;
      existing.removed += file.removed;
    } else {
      merged.set(file.path, file);
    }
  }

  return [...merged.values()];
};

/** The hunk text a diff fence holds: the `@@` header and its body, as git wrote them. */
export const renderHunks = (hunks: PatchHunk[]): string =>
  hunks.map((hunk) => [hunk.header, ...hunk.lines].join('\n')).join('\n');

/**
 * Whether a hunk shows any of `[start, end]` of the post-change file.
 *
 * A pure removal spans nothing after the change (`afterEnd === afterStart - 1`), so it is treated as
 * occupying the single position the lines were removed from — otherwise no range could ever select
 * it, including the one this module's own {@link hunkRange} reports for it.
 */
export const hunkOverlaps = (hunk: PatchHunk, start: number, end: number): boolean =>
  hunk.afterStart <= end && Math.max(hunk.afterEnd, hunk.afterStart) >= start;

/**
 * The span a set of hunks covers, for a fence's `lines=` attribute.
 *
 * Measured after the change, except where nothing survives it: a deleted file's post-image is empty
 * and would otherwise read as `Lines 0`, so its range is quoted from the pre-image instead.
 */
export const hunkRange = (hunks: PatchHunk[]): string | undefined => {
  if (hunks.length === 0) {
    return undefined;
  }
  const survives = hunks.some((hunk) => hunk.afterEnd >= hunk.afterStart);
  const start = Math.min(...hunks.map((hunk) => (survives ? hunk.afterStart : hunk.beforeStart)));
  // `afterStart` for a pure removal, as `hunkOverlaps` does: its `afterEnd` is one BELOW its start,
  // so a set mixing one with a live hunk would end the range before the removal it contains.
  const end = Math.max(...hunks.map((hunk) => (survives ? Math.max(hunk.afterEnd, hunk.afterStart) : hunk.beforeEnd)));
  return start >= end ? `${start}` : `${start}-${end}`;
};
