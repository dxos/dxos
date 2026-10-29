//
// Copyright 2026 DXOS.org
//

import { posix } from 'node:path';
import {
  type CodeLens,
  type CompletionItem,
  CompletionItemKind,
  type Diagnostic,
  DiagnosticSeverity,
  type DocumentLink,
  type DocumentSymbol,
  type Hover,
  type InlayHint,
  type InlayHintLabelPart,
  type Location,
  MarkupKind,
  type Position,
  SymbolKind,
} from 'vscode-languageserver';

import {
  BLOCK_TYPES,
  extensionTerms,
  fieldCompletionContext,
  lintMdl,
  parseBlockHeaders,
  parseMdlBlocks,
  scanFenceLines,
} from '@dxos/deus/parse';
import { VERDICT_STATUSES, findSourceKeys, findSymbolLine, parseReview } from '@dxos/deus/review';
import { frontmatter, reqs } from '@dxos/deus/spec-index';

import { keyCard, specCard, verdictCard } from './hover.ts';
import {
  type Reference,
  type Target,
  declarations,
  findReferences,
  githubUrl,
  itemLine,
  keyTarget,
  reviewedSpecPath,
} from './resolve.ts';
import { type Chip, type ReviewedItem, chipKeys, chipsOf, reviewedItems } from './review.ts';
import { LineIndex, lineRange } from './text.ts';
import { type Workspace, uriOfPath } from './workspace.ts';

/** One open document: its repo-relative path, text and line index. */
export type Document = { path: string; text: string; lines: LineIndex };

export const toDocument = (path: string, text: string): Document => ({ path, text, lines: new LineIndex(text) });

const isReview = (path: string): boolean => path.endsWith('.review.mdl');

const SEVERITY = {
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
  info: DiagnosticSeverity.Information,
  hint: DiagnosticSeverity.Hint,
} as const;

//
// Diagnostics.
//

/**
 * Diagnostics for a document: deus's lint (block types, decision attribution, nested headers, and spec references
 * against the workspace index), `github:` keys whose file or symbol this checkout lacks, and for a review, verdicts
 * that judge no item of the reviewed spec or carry no known status.
 */
export const diagnostics = (workspace: Workspace, { path, text, lines }: Document): Diagnostic[] => {
  const review = isReview(path);
  // The lint knows only the core types; a document's `## Extensions` table and `ext` blocks declare the rest.
  const declaredTypes = new Set([
    ...extensionTerms(text),
    ...parseMdlBlocks(text).flatMap(({ type, id }) => (type === 'ext' && id ? [id] : [])),
  ]);
  const headerTypes = new Map(parseBlockHeaders(text).map(({ from, type }) => [from, type]));
  // A review's frontmatter names its spec by key, which the reference rules would reject; it is no spec itself.
  const found: Diagnostic[] = lintMdl(text, review ? {} : { index: workspace.index })
    .filter(({ source, from }) => source !== 'mdl/block-type' || !declaredTypes.has(headerTypes.get(from) ?? ''))
    .map(({ from, to, severity, source, message }) => ({
      range: lines.range(from, to),
      severity: SEVERITY[severity],
      source: source ?? 'mdl',
      message,
    }));

  const warn = (from: number, to: number, source: string, message: string) =>
    found.push({ range: lines.range(from, to), severity: DiagnosticSeverity.Warning, source, message });

  for (const { from, to, key } of findSourceKeys(text)) {
    if (!workspace.repo || workspace.repo.owner !== key.owner || workspace.repo.repo !== key.repo) {
      continue;
    }
    const file = workspace.read(key.path);
    if (file === undefined) {
      warn(from, to, 'mdl/key', `No file \`${key.path}\` in this checkout.`);
    } else if (key.fragment) {
      const missing = key.path.endsWith('.mdl')
        ? itemLine(file, key.fragment) === undefined
        : findSymbolLine(file, key.fragment) === undefined;
      if (missing) {
        warn(from, to, 'mdl/key', `\`${key.fragment}\` is not declared in \`${key.path}\`.`);
      }
    }
  }

  if (review) {
    const specPath = reviewedSpecPath(workspace, path, text);
    const spec = workspace.read(specPath);
    const items = spec === undefined ? undefined : new Set(declarations(spec).map(({ id }) => id));
    for (const { type, id, to, body } of parseBlockHeaders(text)) {
      if (type !== 'verdict') {
        continue;
      }
      const header = to + 1;
      const headerEnd = header + body.split('\n', 1)[0].length;
      const status = body.match(/^\s+status:[ \t]*([\w-]*)/m)?.[1];
      if (!status) {
        found.push({
          range: lines.range(header, headerEnd),
          severity: DiagnosticSeverity.Error,
          source: 'mdl/verdict',
          message: 'Verdict has no `status:`.',
        });
      } else if (!(VERDICT_STATUSES as readonly string[]).includes(status)) {
        found.push({
          range: lines.range(header, headerEnd),
          severity: DiagnosticSeverity.Error,
          source: 'mdl/verdict',
          message: `Unknown status \`${status}\`; use one of ${VERDICT_STATUSES.join(', ')}.`,
        });
      }
      if (items && id && !items.has(id)) {
        warn(header, headerEnd, 'mdl/verdict', `\`${id}\` is not an item of \`${specPath}\`.`);
      }
    }
  }
  return found;
};

//
// Links and definitions.
//

const targetUri = (target: Target): string =>
  target.kind === 'url' ? target.url : `${target.uri}${target.line === undefined ? '' : `#L${target.line + 1}`}`;

/** A relative markdown link target, `[text](../lang/qa.mdl#anchor)`; URLs and in-page anchors are left to the editor. */
const MARKDOWN_LINK = /\]\((?![a-z][\w+.-]*:|#|\/)([^)\s#]+)(?:#[^)\s]*)?\)/g;

/** Relative markdown links in prose whose file exists, resolved against the document's folder. */
const markdownLinks = (workspace: Workspace, { path, text, lines }: Document): DocumentLink[] => {
  const links: DocumentLink[] = [];
  scanFenceLines(text, ({ line, offset, kind }) => {
    if (kind !== 'prose') {
      return;
    }
    for (const match of line.matchAll(MARKDOWN_LINK)) {
      const target = posix.normalize(posix.join(posix.dirname(path), decodeURIComponent(match[1])));
      if (!target.startsWith('..') && workspace.read(target) !== undefined) {
        const from = offset + match.index + 2;
        links.push({ range: lines.range(from, from + match[1].length), target: uriOfPath(workspace, target) });
      }
    }
  });
  return links;
};

/** Every `github:` key, resolvable spec reference and relative markdown link, as a clickable link. */
export const documentLinks = (workspace: Workspace, document: Document): DocumentLink[] => [
  ...findReferences(workspace, document.text).flatMap(({ from, to, target }): DocumentLink[] =>
    'error' in target
      ? []
      : [
          {
            range: document.lines.range(from, to),
            target: targetUri(target),
            tooltip: target.kind === 'url' ? 'Open on GitHub' : 'Open',
          },
        ],
  ),
  ...markdownLinks(workspace, document),
];

const referenceAt = (workspace: Workspace, { text }: Document, offset: number): Reference | undefined =>
  findReferences(workspace, text).find(({ from, to }) => offset >= from && offset <= to);

const ID_CHAR = /[\w.$-]/;

/** The identifier under an offset (`F-1.2`, `Scene`), without a trailing sentence period. */
const wordAt = (text: string, offset: number): { word: string; from: number; to: number } | undefined => {
  let from = offset;
  let to = offset;
  while (from > 0 && ID_CHAR.test(text[from - 1])) {
    from--;
  }
  while (to < text.length && ID_CHAR.test(text[to])) {
    to++;
  }
  const word = text.slice(from, to).replace(/[.-]+$/, '');
  return /^[A-Za-z]/.test(word) ? { word, from, to: from + word.length } : undefined;
};

const location = (target: Target): Location | undefined =>
  target.kind === 'file' ? { uri: target.uri, range: lineRange(target.line ?? 0) } : undefined;

/**
 * Go-to-definition: a `github:` key opens its file at the symbol, a spec reference or dependency opens the other spec
 * at the item, and an item id (`[F-1.2]`, `affects: [F-1]`) jumps to its declaration - in this spec, or for a review,
 * in the spec it judges.
 */
export const definition = (workspace: Workspace, document: Document, position: Position): Location | undefined => {
  const offset = document.lines.offsetAt(position);
  const reference = referenceAt(workspace, document, offset);
  if (reference) {
    return 'error' in reference.target ? undefined : location(reference.target);
  }
  const word = wordAt(document.text, offset);
  if (!word) {
    return undefined;
  }
  const own = itemLine(document.text, word.word);
  const declaredHere = own !== undefined && own !== position.line;
  if (declaredHere && !isReview(document.path)) {
    return { uri: uriOfPath(workspace, document.path), range: lineRange(own) };
  }
  if (isReview(document.path)) {
    const specPath = reviewedSpecPath(workspace, document.path, document.text);
    const line = itemLine(workspace.read(specPath) ?? '', word.word);
    if (line !== undefined) {
      return { uri: uriOfPath(workspace, specPath), range: lineRange(line) };
    }
  }
  return declaredHere ? { uri: uriOfPath(workspace, document.path), range: lineRange(own) } : undefined;
};

//
// Hover.
//

/**
 * Hover cards: a key shows the declaration it names, a spec reference the other spec's block, and an item's
 * declaration line its review verdict with the code and tests it cites.
 */
export const hover = (workspace: Workspace, document: Document, position: Position): Hover | undefined => {
  const offset = document.lines.offsetAt(position);
  const markdown = (value: string, from?: number, to?: number): Hover => ({
    contents: { kind: MarkupKind.Markdown, value },
    ...(from !== undefined && to !== undefined && { range: document.lines.range(from, to) }),
  });
  const reference = referenceAt(workspace, document, offset);
  if (reference) {
    const { ref, target, from, to } = reference;
    return markdown(
      ref.kind === 'key' ? keyCard(workspace, ref.key) : specCard(workspace, target, ref.id, ref.item),
      from,
      to,
    );
  }
  const item = reviewedItems(workspace, document.path, document.text).find(({ line }) => line === position.line);
  if (item) {
    return markdown(verdictCard(workspace, item.verdict));
  }
  if (isReview(document.path)) {
    const verdict = parseReview(document.text).verdicts.find(({ id }) => {
      const line = itemLine(document.text, id);
      return line === position.line;
    });
    if (verdict) {
      return markdown(verdictCard(workspace, verdict));
    }
  }
  return undefined;
};

//
// Review verdicts.
//

const chipTooltip = (chip: Chip): string | undefined =>
  chip.kind === 'status' || chip.kind === 'note' ? chip.tooltip : chipKeys(chip).join('\n');

/** The verdict of each reviewed item as inlay hints at the end of its declaration line; code chips link to the code. */
export const inlayHints = (workspace: Workspace, document: Document): InlayHint[] =>
  reviewedItems(workspace, document.path, document.text).map((item) => {
    const parts = chipsOf(item).flatMap((chip, index): InlayHintLabelPart[] => {
      const target = chip.kind === 'code' || chip.kind === 'test' ? chipTarget(workspace, chip) : undefined;
      const part: InlayHintLabelPart = {
        value: `${index > 0 ? ' · ' : ''}${chip.text}`,
        ...(chipTooltip(chip) && { tooltip: chipTooltip(chip) }),
        ...(target && { location: target }),
      };
      return [part];
    });
    return {
      position: { line: item.line, character: document.lines.line(item.line).length },
      label: parts,
      paddingLeft: true,
    };
  });

/** The command a client runs to open a location; arguments are `(uri, line)`. */
export const OPEN_COMMAND = 'mdl.open';

const chipTarget = (workspace: Workspace, chip: Extract<Chip, { kind: 'code' | 'test' }>): Location | undefined =>
  location(keyTarget(workspace, chip.key));

/** One code lens per chip above each reviewed item; a code or test chip opens its file. */
export const codeLenses = (workspace: Workspace, document: Document): CodeLens[] =>
  reviewedItems(workspace, document.path, document.text).flatMap((item) =>
    chipsOf(item).map((chip): CodeLens => {
      const range = lineRange(item.line);
      if (chip.kind === 'code' || chip.kind === 'test') {
        const target = chipTarget(workspace, chip);
        return {
          range,
          command: {
            title: chip.text,
            command: OPEN_COMMAND,
            arguments: target ? [target.uri, target.range.start.line] : [githubUrl(chip.key), 0],
          },
        };
      }
      return { range, command: { title: chip.text, command: '' } };
    }),
  );

/** Each reviewed item's line and status, for clients that colour the margin as the spec viewer does. */
export const verdictLines = (
  workspace: Workspace,
  document: Document,
): { line: number; status: ReviewedItem['verdict']['status'] }[] =>
  reviewedItems(workspace, document.path, document.text).map(({ line, verdict }) => ({ line, status: verdict.status }));

//
// Completion.
//

/** The `mdl` fence a line sits in, as the 0-based line of its header, when it is inside one. */
const fenceHeaderLine = (text: string, line: number): number | undefined => {
  let current = -1;
  let header: number | undefined;
  let result: number | undefined;
  scanFenceLines(text, ({ kind, mdl }) => {
    current++;
    if (current > line) {
      return;
    }
    if (kind === 'open') {
      header = mdl ? current + 1 : undefined;
    } else if (kind === 'close') {
      header = undefined;
    }
    if (current === line) {
      result = kind === 'body' ? header : undefined;
    }
  });
  return result;
};

/**
 * Completions: block types on a fence's header line (core types plus the `## Extensions` table), field names in a
 * block body, spec ids after `uses`, a spec's items after `<id>#`, and for a review, verdict ids and statuses.
 */
export const completions = (workspace: Workspace, document: Document, position: Position): CompletionItem[] => {
  const { text, lines } = document;
  const offset = lines.offsetAt(position);
  const before = lines.line(position.line).slice(0, position.character);

  const ref = before.match(/([a-z][a-z0-9-]*(?:\.[a-zA-Z0-9-]+)+)#[\w$.-]*$/);
  if (ref) {
    const entry = workspace.index.specs[ref[1]];
    return (entry?.items ?? []).map((item) => ({
      label: item,
      kind: CompletionItemKind.Reference,
      detail: entry?.path,
    }));
  }

  const header = fenceHeaderLine(text, position.line);
  if (header === position.line) {
    const usesId = before.match(/^\s*uses\s+[\w.-]*$/);
    if (usesId) {
      return Object.entries(workspace.index.specs).map(([id, { path }]) => ({
        label: id,
        kind: CompletionItemKind.Module,
        detail: path,
      }));
    }
    const verdictId = before.match(/^\s*verdict\s+[\w.-]*$/);
    if (verdictId && isReview(document.path)) {
      const spec = workspace.read(reviewedSpecPath(workspace, document.path, text)) ?? '';
      return declarations(spec).map(({ kind, id }) => ({
        label: id,
        kind: CompletionItemKind.Reference,
        detail: kind,
      }));
    }
    if (/^\s*[\w-]*$/.test(before)) {
      return [...new Set([...BLOCK_TYPES, ...extensionTerms(text)])].map((type) => ({
        label: type,
        kind: CompletionItemKind.Keyword,
      }));
    }
    return [];
  }
  if (header !== undefined) {
    if (/^\s+status:\s*\w*$/.test(before)) {
      return VERDICT_STATUSES.map((status) => ({ label: status, kind: CompletionItemKind.EnumMember }));
    }
    const fields = fieldCompletionContext(text, offset);
    if (fields && /^\s+[\w-]*$/.test(before)) {
      return fields.fields.map((field) => ({
        label: field,
        kind: CompletionItemKind.Property,
        insertText: `${field}: `,
      }));
    }
  }
  return [];
};

//
// Outline.
//

/** The outline: markdown headings, each holding the blocks under it, each block holding its `req` items. */
export const documentSymbols = ({ text, lines }: Document): DocumentSymbol[] => {
  const roots: DocumentSymbol[] = [];
  const stack: { level: number; symbol: DocumentSymbol }[] = [];
  const add = (symbol: DocumentSymbol, level: number) => {
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    (stack.length > 0 ? (stack[stack.length - 1].symbol.children ??= []) : roots).push(symbol);
    stack.push({ level, symbol });
  };

  const blocks = new Map(parseMdlBlocks(text).map((block) => [block.from, block]));
  let line = -1;
  let inFrontmatter = text.startsWith('---\n');
  scanFenceLines(text, ({ line: content, offset, kind }) => {
    line++;
    if (inFrontmatter) {
      inFrontmatter = !(line > 0 && content === '---');
      return;
    }
    const heading = kind === 'prose' ? content.match(/^(#{1,6})\s+(.+?)\s*#*$/) : undefined;
    if (heading) {
      const range = lineRange(line, content.length);
      add({ name: heading[2], kind: SymbolKind.Namespace, range, selectionRange: range }, heading[1].length);
      return;
    }
    const block = kind === 'open' ? blocks.get(offset) : undefined;
    if (!block || !block.type) {
      return;
    }
    const bodyLines = block.body.split('\n').length;
    const range = { start: { line, character: 0 }, end: { line: line + bodyLines + 1, character: 0 } };
    const selectionRange = lineRange(line + 1, lines.line(line + 1).length);
    const children = reqs(block.body).map(({ id, title, offset: index }): DocumentSymbol => {
      const reqRange = lineRange(line + 2 + index, lines.line(line + 2 + index).length);
      return { name: id, detail: title, kind: SymbolKind.Field, range: reqRange, selectionRange: reqRange };
    });
    add(
      {
        name: [block.type, block.id].filter(Boolean).join(' '),
        ...(block.title && { detail: block.title }),
        kind: SymbolKind.Class,
        range,
        selectionRange,
        ...(children.length > 0 && { children }),
      },
      7,
    );
  });
  return roots;
};

/** The spec id of a document, for clients that show it. */
export const specId = ({ text }: Document): string | undefined => frontmatter(text).id;
