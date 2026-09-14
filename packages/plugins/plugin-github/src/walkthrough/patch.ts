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

  for (const line of patch.split('\n')) {
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
      const afterStart = Number(hunkHeader[3]);
      const afterCount = hunkHeader[4] === undefined ? 1 : Number(hunkHeader[4]);
      hunk = { header: line, lines: [], afterStart, afterEnd: afterStart + afterCount - 1, added: 0, removed: 0 };
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

  // A trailing blank line belongs to the transport, not to the last hunk.
  for (const parsed of files) {
    const last = parsed.hunks.at(-1);
    while (last && last.lines.at(-1) === '') {
      last.lines.pop();
    }
  }

  return files;
};

/** The hunk text a diff fence holds: the `@@` header and its body, as git wrote them. */
export const renderHunks = (hunks: PatchHunk[]): string =>
  hunks.map((hunk) => [hunk.header, ...hunk.lines].join('\n')).join('\n');

/** Whether a hunk shows any of `[start, end]` of the post-change file. */
export const hunkOverlaps = (hunk: PatchHunk, start: number, end: number): boolean =>
  hunk.afterStart <= end && hunk.afterEnd >= start;

/** The span a set of hunks covers, for a fence's `lines=` attribute. */
export const hunkRange = (hunks: PatchHunk[]): string | undefined => {
  if (hunks.length === 0) {
    return undefined;
  }
  const start = Math.min(...hunks.map((hunk) => hunk.afterStart));
  const end = Math.max(...hunks.map((hunk) => hunk.afterEnd));
  return start >= end ? `${start}` : `${start}-${end}`;
};
