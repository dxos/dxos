//
// Copyright 2026 DXOS.org
//

import { parseBlockHeaders } from '@dxos/deus/parse';
import { type SourceKey, type Verdict, declarationSnippet, parseSourceKey, walkthroughOf } from '@dxos/deus/review';

import { type Target, keyTarget } from './resolve.ts';
import { STATUS_LABEL } from './review.ts';
import { type Workspace } from './workspace.ts';

const LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  mts: 'typescript',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  rs: 'rust',
  py: 'python',
  json: 'json',
  md: 'markdown',
  mdl: 'mdl',
  yml: 'yaml',
  yaml: 'yaml',
  css: 'css',
  sql: 'sql',
};

const languageOf = (path: string): string => LANGUAGE[path.split('.').pop() ?? ''] ?? '';

/** A fence long enough that the code inside cannot close it. */
const fence = (code: string, language: string): string => {
  const ticks = '`'.repeat(Math.max(3, ...[...code.matchAll(/`+/g)].map(([run]) => run.length + 1)));
  return `${ticks}${language}\n${code}\n${ticks}`;
};

/** A markdown link that opens a target: the local file at its line, or the GitHub page. */
export const targetLink = (target: Target, label: string): string =>
  `[${label.replace(/[[\]]/g, '\\$&')}](${target.kind === 'file' ? `${target.uri}${target.line === undefined ? '' : `#L${target.line + 1}`}` : target.url})`;

/** The longest spec block a hover shows; a longer one ends with an ellipsis. */
const MAX_BLOCK_LINES = 16;

/** The `mdl` block that declares `item` in a spec text, as a fenced excerpt. */
const blockExcerpt = (text: string, item: string): string | undefined => {
  for (const { body } of parseBlockHeaders(text)) {
    const lines = body.replace(/\n$/, '').split('\n');
    const start = lines.findIndex((line) =>
      new RegExp(`^\\s*[a-z][\\w-]*\\s+${item.replace(/[.$]/g, '\\$&')}\\s*(?::|$)`).test(line),
    );
    if (start === -1) {
      continue;
    }
    // A nested `req` shows from its own line, a block from its header.
    const shown = lines.slice(start, start + MAX_BLOCK_LINES);
    return fence([...shown, ...(lines.length - start > MAX_BLOCK_LINES ? ['  ...'] : [])].join('\n'), 'mdl');
  }
  return undefined;
};

/**
 * The hover card of a `github:` key: the file name (a link) above the highlighted declaration the key names, as the
 * spec viewer's snippet card shows it. A key outside the checkout links to GitHub.
 */
export const keyCard = (workspace: Workspace, key: SourceKey): string => {
  const target = keyTarget(workspace, key);
  const title = `**${targetLink(target, `${key.path}${key.fragment ? `#${key.fragment}` : ''}`)}**`;
  if (target.kind === 'url') {
    return `${title}\n\nNot in this checkout.`;
  }
  const text = workspace.read(key.path) ?? '';
  if (key.path.endsWith('.mdl')) {
    const excerpt = key.fragment ? blockExcerpt(text, key.fragment) : undefined;
    return excerpt ? `${title}\n\n${excerpt}` : `${title}\n\n${key.fragment ? 'Item not found.' : ''}`.trimEnd();
  }
  const snippet = declarationSnippet(text, key.fragment);
  if (!snippet) {
    return `${title}\n\nSymbol not found.`;
  }
  const code = [...snippet.lines, ...(snippet.truncated ? ['...'] : [])].join('\n');
  return `${title} · line ${snippet.line}\n\n${fence(code, languageOf(key.path))}`;
};

/** The hover card of a spec reference: the item's block from the other spec. */
export const specCard = (
  workspace: Workspace,
  target: Target | { error: string },
  id: string,
  item?: string,
): string => {
  if ('error' in target) {
    return target.error;
  }
  const title = `**${targetLink(target, item ? `${id}#${item}` : id)}**`;
  if (target.kind === 'url') {
    return title;
  }
  const excerpt = item ? blockExcerpt(workspace.read(target.path) ?? '', item) : undefined;
  return excerpt ? `${title}\n\n${excerpt}` : `${title} · \`${target.path}\``;
};

const keyLine = (workspace: Workspace, raw: string): string => {
  const key = parseSourceKey(raw);
  return key ? targetLink(keyTarget(workspace, key), `${key.path}${key.fragment ? `#${key.fragment}` : ''}`) : raw;
};

/**
 * The hover card of a reviewed item: its status and summary, the reviewer's note, and the code and tests the verdict
 * cites. An item implemented in several places shows its walkthrough, each step above its code, as the viewer does.
 */
export const verdictCard = (workspace: Workspace, verdict: Verdict): string => {
  const sections = [`**${STATUS_LABEL[verdict.status]}** - ${verdict.summary ?? verdict.id}`];
  if (verdict.note) {
    sections.push(verdict.note);
  }
  const steps = walkthroughOf(verdict);
  if (steps) {
    sections.push(
      steps
        .map(({ text, key }, index) => {
          const parsed = parseSourceKey(key);
          const card = parsed ? keyCard(workspace, parsed) : key;
          return text ? `${index + 1}. ${text}.\n\n${card}` : card;
        })
        .join('\n\n'),
    );
  } else if (verdict.evidence.length > 0) {
    sections.push(`**Code:** ${verdict.evidence.map((raw) => keyLine(workspace, raw)).join(', ')}`);
  }
  if (verdict.tests.length > 0) {
    sections.push(`**Tests:** ${verdict.tests.map((raw) => keyLine(workspace, raw)).join(', ')}`);
  }
  return sections.join('\n\n---\n\n');
};
