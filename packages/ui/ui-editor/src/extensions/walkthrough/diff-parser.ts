//
// Copyright 2026 DXOS.org
//

/** One side of a {@link DiffRow}; absent where that column has no counterpart line. */
export type DiffCell = {
  /** 1-based line number in that version of the file. */
  number: number;
  text: string;
};

/**
 * A row of the side-by-side layout. `changed` pairs a removal with the addition that replaced it,
 * so the two columns stay aligned; a row missing a side renders that column as a filler.
 */
export type DiffRow = {
  kind: 'context' | 'added' | 'removed' | 'changed';
  before?: DiffCell;
  after?: DiffCell;
};

/** A `@@` hunk: a contiguous window of the file, and the size of the gap skipped before it. */
export type DiffChunk = {
  /** Trailing context of the `@@` header (the enclosing function, as git emits it). */
  section?: string;
  /** Lines of the file skipped immediately before this chunk, which the header reports. */
  gap?: number;
  rows: DiffRow[];
};

export type ParsedDiff = {
  /** Path as written on the fence or taken from the `+++` header. */
  file?: string;
  /** Language name for syntax highlighting, from the fence or inferred from the extension. */
  language?: string;
  /** Line range shown, as `66-99`; derived from the chunks when the fence does not say. */
  range?: string;
  added: number;
  removed: number;
  chunks: DiffChunk[];
};

/** Extensions worth naming; anything else falls back to the raw extension. */
const LANGUAGES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  html: 'html',
  md: 'markdown',
  mdl: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'shell',
  bash: 'shell',
  rs: 'rust',
  go: 'go',
  py: 'python',
  sql: 'sql',
  toml: 'toml',
};

/** Display names, since `typescript` on a file header reads as a slug. */
const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  tsx: 'TypeScript',
  javascript: 'JavaScript',
  jsx: 'JavaScript',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  markdown: 'Markdown',
  yaml: 'YAML',
  shell: 'Shell',
  rust: 'Rust',
  go: 'Go',
  python: 'Python',
  sql: 'SQL',
  toml: 'TOML',
};

export const languageLabel = (language?: string): string | undefined =>
  language ? (LANGUAGE_LABELS[language] ?? language) : undefined;

const languageFromFile = (file: string): string | undefined => {
  const extension = file.split('.').pop()?.toLowerCase();
  return extension ? (LANGUAGES[extension] ?? extension) : undefined;
};

/**
 * Attributes on a fence's info line: `diff file=src/x.ts lines=66-99 lang=typescript`. A bare token
 * is taken as the path, so `diff src/x.ts` works without the key.
 */
export type FenceInfo = {
  /** The word after the backticks; only `diff` is this extension's. */
  language: string;
  attributes: Record<string, string>;
  /** Tokens carrying no `=`, in order. */
  positional: string[];
};

export const parseFenceInfo = (info: string): FenceInfo => {
  const attributes: Record<string, string> = {};
  const positional: string[] = [];
  // Quoted values may contain spaces, so tokenise rather than splitting on whitespace.
  const tokens = info.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  const [language = '', ...rest] = tokens;
  for (const token of rest) {
    const separator = token.indexOf('=');
    if (separator > 0) {
      const key = token.slice(0, separator);
      const value = token.slice(separator + 1).replace(/^["']|["']$/g, '');
      attributes[key] = value;
    } else {
      positional.push(token.replace(/^["']|["']$/g, ''));
    }
  }

  return { language: language.toLowerCase(), attributes, positional };
};

/** `@@ -12,7 +12,9 @@ section` — counts are optional and default to one line. */
const HUNK_HEADER = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/;

/** Metadata git emits before a file's first hunk. */
const PREAMBLE = /^(index |new file mode |deleted file mode |old mode |new mode |similarity index |rename |copy )/;

/**
 * Parses a unified diff body into rows already paired for the side-by-side layout. Runs of removals
 * and additions are zipped positionally — the convention every review tool uses — so a replaced line
 * sits opposite the line that replaced it and a pure insertion leaves the left column empty.
 *
 * Headers git emits around the body (`diff --git`, `index`, `---`, `+++`) are consumed for the file
 * name rather than rendered, so a block pasted straight out of `git diff` reads the same as one
 * written by hand.
 */
export const parseDiff = (body: string, info?: FenceInfo): ParsedDiff => {
  const file = info?.attributes.file ?? info?.positional[0];
  const chunks: DiffChunk[] = [];
  let added = 0;
  let removed = 0;
  let headerFile: string | undefined;

  let chunk: DiffChunk | undefined;
  let beforeLine = 1;
  let afterLine = 1;
  /** Line after the previous chunk's last, so the skipped gap can be measured. */
  let beforeEnd: number | undefined;

  // Buffered runs, flushed as paired rows when the run ends.
  let removals: DiffCell[] = [];
  let additions: DiffCell[] = [];
  const flush = () => {
    if (!chunk) {
      return;
    }
    for (let index = 0; index < Math.max(removals.length, additions.length); index++) {
      const before = removals[index];
      const after = additions[index];
      chunk.rows.push({ kind: before && after ? 'changed' : before ? 'removed' : 'added', before, after });
    }
    removals = [];
    additions = [];
  };

  const openChunk = (next: DiffChunk) => {
    flush();
    chunks.push(next);
    chunk = next;
  };

  for (const raw of body.split('\n')) {
    // A diff saved or copied on Windows keeps its carriage returns; they are transport, not content,
    // and left in place they defeat every anchored match below.
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;

    const header = HUNK_HEADER.exec(line);
    if (header) {
      const [, beforeStart, , afterStart, , section] = header;
      beforeLine = Number(beforeStart);
      afterLine = Number(afterStart);
      openChunk({
        section: section.trim() || undefined,
        // Above the first chunk the skipped gap is everything before it, which the header states.
        gap: Math.max(0, beforeLine - (beforeEnd ?? 1)),
        rows: [],
      });
      continue;
    }

    // A new file's header ends whatever chunk was open; nothing inside a hunk starts unprefixed.
    // A fence holding more than one file is a misuse, but it must not then label every chunk with
    // the first file's name or measure the second file's gap from the first file's line numbers.
    if (line.startsWith('diff --git ')) {
      flush();
      chunk = undefined;
      headerFile = undefined;
      beforeEnd = undefined;
      continue;
    }

    // `---`, `+++` and friends are file headers ONLY before the first hunk. Inside one, `--- x` is a
    // removed line whose text begins `-- `, which every deleted SQL, Lua or Haskell comment does.
    if (!chunk) {
      if (line.startsWith('+++ ')) {
        headerFile ??= line.slice(4).replace(/^b\//, '').trim();
        continue;
      }
      if (line.startsWith('--- ') || PREAMBLE.test(line) || line.length === 0) {
        continue;
      }
      // A body with no `@@` header is still a diff; open an implicit chunk on the first content line.
      openChunk({ rows: [] });
    }

    // `\ No newline at end of file` annotates the preceding line and is a line of neither version.
    if (line.startsWith('\\')) {
      continue;
    }

    const current = chunk;
    if (current === undefined) {
      continue;
    }
    if (line.startsWith('+')) {
      additions.push({ number: afterLine++, text: line.slice(1) });
      added++;
    } else if (line.startsWith('-')) {
      removals.push({ number: beforeLine++, text: line.slice(1) });
      removed++;
    } else {
      flush();
      const text = line.startsWith(' ') ? line.slice(1) : line;
      current.rows.push({
        kind: 'context',
        before: { number: beforeLine++, text },
        after: { number: afterLine++, text },
      });
    }
    beforeEnd = beforeLine;
  }
  flush();

  // A trailing blank line is an artefact of the fence, not part of the diff.
  const last = chunks.at(-1);
  const lastRow = last?.rows.at(-1);
  if (last && lastRow?.kind === 'context' && lastRow.before?.text === '' && lastRow.after?.text === '') {
    last.rows.pop();
  }

  const resolvedFile = file ?? headerFile;
  return {
    file: resolvedFile,
    language: info?.attributes.lang ?? (resolvedFile ? languageFromFile(resolvedFile) : undefined),
    range: info?.attributes.lines ?? shownRange(chunks),
    added,
    removed,
    chunks: chunks.filter((chunk) => chunk.rows.length > 0),
  };
};

/** The `after` line span the block covers, for the header's `Lines 66-99`. */
const shownRange = (chunks: DiffChunk[]): string | undefined => {
  // `!== undefined`, not a truthiness test: a `@@ -0,0 +1,N @@` new-file hunk numbers a side 0.
  const numbers = chunks
    .flatMap((chunk) => chunk.rows.map((row) => row.after?.number))
    .filter((line): line is number => line !== undefined);
  if (numbers.length === 0) {
    return undefined;
  }
  const first = Math.min(...numbers);
  const last = Math.max(...numbers);
  return first === last ? `${first}` : `${first}-${last}`;
};
