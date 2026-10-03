//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

/**
 * A reader for `.mdl` documents: YAML frontmatter, a markdown body, and typed ```` ```mdl ````
 * fenced blocks whose first line is `<type> [<id>][: <title>]` followed by indented `key: value`
 * fields. Lenient by design — it must never choke on a document elsewhere in the repository.
 *
 * Belongs in `@dxos/deus` as a Node-usable subpath (the CodeMirror grammar there covers block
 * bodies only); it lives here until that export exists.
 */

export type Block = {
  readonly type: string;
  readonly id: string | undefined;
  readonly title: string | undefined;
  /** `key=value` for every field line, in order; nested keys keep their own name. */
  readonly fields: readonly string[];
  /** Every backticked identifier-like token in the body, in order, deduplicated. */
  readonly mentions: readonly string[];
  readonly body: string;
  /** 1-based line of the block's header. */
  readonly line: number;
};

export type Document = {
  readonly frontmatter: Readonly<Record<string, string>>;
  readonly blocks: readonly Block[];
};

const FENCE_OPEN = /^\s*```mdl\s*$/;
const FENCE_CLOSE = /^\s*```\s*$/;
const FIELD = /^\s*([A-Za-z_][\w-]*)\??\s*:\s*(.*)$/;
const MENTION = /`([A-Za-z_$][\w$.]*(?:\([^`)]*\))?)`/g;

/** The frontmatter as flat `key: value` strings — enough for `id`, `name`, `version`. */
export const parseFrontmatter = (text: string): Record<string, string> => {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return {};
  }
  const result: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === '---') {
      break;
    }
    const match = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (match) {
      result[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return result;
};

const parseHeader = (line: string): { type: string; id: string | undefined; title: string | undefined } => {
  const match = line.match(/^([^:]*?)(?::\s*(.*))?$/);
  const tokens = (match?.[1] ?? line).trim().split(/\s+/);
  return { type: tokens[0] ?? '', id: tokens[1], title: match?.[2]?.trim() || undefined };
};

const dedent = (lines: readonly string[]): string[] => {
  const indents = lines.filter((line) => line.trim() !== '').map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const min = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(min));
};

export const parse = (text: string): Document => {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let buffer: string[] | undefined;
  let openedAt = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (buffer === undefined) {
      if (FENCE_OPEN.test(line)) {
        buffer = [];
        openedAt = index;
      }
    } else if (FENCE_CLOSE.test(line)) {
      const headerIndex = buffer.findIndex((candidate) => candidate.trim() !== '');
      if (headerIndex !== -1) {
        const header = parseHeader(buffer[headerIndex].trim());
        const body = dedent(buffer.slice(headerIndex + 1));
        const fields = body.flatMap((candidate) => {
          const field = candidate.match(FIELD);
          return field ? [`${field[1]}=${field[2].trim()}`] : [];
        });
        const text = body.join('\n');
        const mentions = [...new Set([...text.matchAll(MENTION)].map((mention) => mention[1]))];
        blocks.push({ ...header, fields, mentions, body: text, line: openedAt + headerIndex + 2 });
      }
      buffer = undefined;
    } else {
      buffer.push(line);
    }
  }
  return { frontmatter: parseFrontmatter(text), blocks };
};
