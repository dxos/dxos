//
// Copyright 2026 DXOS.org
//

// Parse and render the strict diagnostic format subagents emit into group
// fragments:
//
//   # WARN `path/to/file.ts:42:7`
//
//   Body explaining the violation and the fix.
//
// Column is optional. Body is everything until the next header or EOF.

const HEADER_RE = /^#\s+(WARN|ERROR)\s+`([^`:]+):(\d+)(?::(\d+))?`\s*$/;

/**
 * Parse diagnostics out of a group fragment.
 *
 * @param {string} text Fragment contents.
 * @returns {Array<{ severity: 'warn'|'error', file: string, line: number, col: number|null, body: string }>}
 */
export const parseDiagnostics = (text) => {
  const lines = text.split(/\r?\n/);
  const diagnostics = [];
  let current = null;

  const flush = () => {
    if (current) {
      current.body = current.body.join('\n').trim();
      diagnostics.push(current);
      current = null;
    }
  };

  for (const line of lines) {
    const match = line.match(HEADER_RE);
    if (match) {
      flush();
      current = {
        severity: match[1].toLowerCase(),
        file: match[2],
        line: Number.parseInt(match[3], 10),
        col: match[4] != null ? Number.parseInt(match[4], 10) : null,
        body: [],
      };
    } else if (current) {
      current.body.push(line);
    }
    // Lines before the first header (stub comments, blank lines) are ignored.
  }
  flush();
  return diagnostics;
};

/** Stable key for de-duplicating identical diagnostics. */
export const diagnosticKey = (diagnostic) =>
  `${diagnostic.severity} ${diagnostic.file} ${diagnostic.line} ${diagnostic.col ?? ''} ${diagnostic.body}`;

/** Render a single diagnostic back to the canonical header + body form. */
export const renderDiagnostic = (diagnostic) => {
  const location = `${diagnostic.file}:${diagnostic.line}${diagnostic.col != null ? `:${diagnostic.col}` : ''}`;
  return `# ${diagnostic.severity.toUpperCase()} \`${location}\`\n\n${diagnostic.body}`;
};

/** Sort by file, then line, then column, then severity (error before warn). */
export const compareDiagnostics = (a, b) =>
  a.file.localeCompare(b.file) ||
  a.line - b.line ||
  (a.col ?? 0) - (b.col ?? 0) ||
  a.severity.localeCompare(b.severity);
