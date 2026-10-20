//
// Copyright 2026 DXOS.org
//

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import textmate, { type IGrammar, type StateStack } from 'vscode-textmate';

import { PACKAGE_ROOT, loadMdlGrammar } from './testing/registry.ts';

const FIXTURES = join(PACKAGE_ROOT, 'src', '__fixtures__');

const ROOT_SCOPE = 'text.html.markdown.mdl';

/** Scopes that only say which region a token sits in; a token whose innermost scope is one of these is prose. */
const CONTAINER_SCOPES = new Set([
  'meta.paragraph.markdown',
  'markup.fenced_code.block.markdown',
  'meta.embedded.block.mdl',
]);

type Token = { text: string; scopes: string[] };

const tokenize = (grammar: IGrammar, source: string): Token[][] => {
  let state: StateStack = textmate.INITIAL;
  return source.split('\n').map((line) => {
    const result = grammar.tokenizeLine(line, state);
    state = result.ruleStack;
    return result.tokens.map(({ startIndex, endIndex, scopes }) => ({
      text: line.slice(startIndex, endIndex),
      scopes: scopes.filter((scope) => scope !== ROOT_SCOPE),
    }));
  });
};

/**
 * One `> line` per source line, then one row per highlighted token: the token text and its scopes, innermost
 * last. Prose emits no rows, so the snapshot stays readable.
 */
const renderSnapshot = (source: string, lines: Token[][]): string =>
  source
    .split('\n')
    .flatMap((line, index) => [
      `> ${line}`,
      ...lines[index]
        .filter(
          ({ text, scopes }) =>
            text.trim().length > 0 && scopes.length > 0 && !CONTAINER_SCOPES.has(scopes.at(-1) ?? ''),
        )
        .map(({ text, scopes }) => `  ${JSON.stringify(text)} ${scopes.join(' ')}`),
    ])
    .join('\n') + '\n';

/** Scopes at the first occurrence of `text` on the first line containing `marker`. */
const scopesOf = (grammar: IGrammar, source: string, marker: string, text: string): string[] => {
  const sourceLines = source.split('\n');
  const index = sourceLines.findIndex((line) => line.includes(marker));
  const offset = index < 0 ? -1 : sourceLines[index].indexOf(text);
  if (offset < 0) {
    throw new Error(`no "${text}" on a line containing "${marker}"`);
  }

  let start = 0;
  for (const token of tokenize(grammar, source)[index]) {
    if (offset < start + token.text.length) {
      return token.scopes;
    }
    start += token.text.length;
  }

  return [];
};

const fence = (...body: string[]) => ['```mdl', ...body, '```', ''].join('\n');

describe('mdl grammar', () => {
  let grammar: IGrammar;

  beforeAll(async () => {
    grammar = await loadMdlGrammar();
  });

  describe('snapshots', () => {
    const fixtures = readdirSync(FIXTURES).filter((name) => name.endsWith('.mdl'));

    test.each(fixtures)('%s', async (name) => {
      const source = readFileSync(join(FIXTURES, name), 'utf8');
      await expect(renderSnapshot(source, tokenize(grammar, source))).toMatchFileSnapshot(
        join(FIXTURES, `${name}.snap`),
      );
    });
  });

  test('frontmatter is YAML', ({ expect }) => {
    const source = ['---', 'id: org.dxos.spec.core', '---', ''].join('\n');
    expect(scopesOf(grammar, source, 'id:', 'id')).toContain('entity.name.tag.yaml');
  });

  test('a known block type is a keyword named after the type', ({ expect }) => {
    const source = fence('decision D-1: Bounds are derived.', '  date: 2026-10-02');
    expect(scopesOf(grammar, source, 'D-1', 'decision')).toContain('keyword.control.block.decision.mdl');
    expect(scopesOf(grammar, source, 'D-1', 'D-1')).toContain('entity.name.function.id.mdl');
    expect(scopesOf(grammar, source, 'D-1', 'Bounds are derived.')).toContain('entity.name.section.title.mdl');
  });

  test('an unknown block type is still a type', ({ expect }) => {
    const source = fence('diagram-rule DR-1: Edges route around nodes');
    expect(scopesOf(grammar, source, 'DR-1', 'diagram-rule')).toContain('entity.name.type.block.mdl');
  });

  test('only the first line is a header', ({ expect }) => {
    const source = fence('type Piece', 'note: at column zero');
    expect(scopesOf(grammar, source, 'note', 'note')).not.toContain('entity.name.type.block.mdl');
  });

  test('field keys, optional marker and nested ids', ({ expect }) => {
    const source = fence('feat F-1: Start', '  color?: Color', '  req F-1.1: White moves first.');
    expect(scopesOf(grammar, source, 'color', 'color')).toContain('variable.other.property.mdl');
    expect(scopesOf(grammar, source, 'color', '?')).toContain('keyword.operator.optional.mdl');
    expect(scopesOf(grammar, source, 'req', 'F-1.1')).toContain('entity.name.function.id.mdl');
  });

  test('type expressions, unions and lists', ({ expect }) => {
    const source = fence(
      'type Piece',
      '  kind: King | Queen',
      '  tags: [smoke, nightly]',
      '  desc: A Board holds Pieces',
    );
    expect(scopesOf(grammar, source, 'kind', 'King')).toContain('entity.name.type.mdl');
    expect(scopesOf(grammar, source, 'kind', '|')).toContain('keyword.operator.union.mdl');
    expect(scopesOf(grammar, source, 'tags', 'smoke')).toContain('variable.other.reference.mdl');
    expect(scopesOf(grammar, source, 'tags', '[')).toContain('punctuation.definition.list.begin.mdl');
    // Prose is not a type expression, so its capitalised words are left alone.
    expect(scopesOf(grammar, source, 'desc', 'Board')).not.toContain('entity.name.type.mdl');
    expect(scopesOf(grammar, source, 'desc', 'Pieces')).not.toContain('entity.name.type.mdl');
  });

  test('comments, whole-line and trailing', ({ expect }) => {
    const source = fence('type Piece', '  # whole line', '  kind: King   # trailing');
    expect(scopesOf(grammar, source, 'whole', '# whole line')).toContain('comment.line.number-sign.mdl');
    expect(scopesOf(grammar, source, 'trailing', ' trailing')).toContain('comment.line.number-sign.mdl');
  });

  test('cross-references and op:/type: references', ({ expect }) => {
    const source = fence('decision D-2: Fills in [D-1].', '  context: see [op:Move] and type:Board.');
    expect(scopesOf(grammar, source, 'D-2', 'D-1')).toContain('variable.other.reference.mdl');
    expect(scopesOf(grammar, source, 'context', 'op')).toContain('storage.type.reference.op.mdl');
    expect(scopesOf(grammar, source, 'context', 'type')).toContain('storage.type.reference.type.mdl');
    expect(scopesOf(grammar, source, 'context', 'Board')).toContain('variable.other.reference.mdl');
  });

  test('user: and agent: actors are told apart', ({ expect }) => {
    const source = fence('decision D-2: x', '  by: agent:claude-code', '  for: user:alice');
    expect(scopesOf(grammar, source, 'by:', 'agent')).toContain('support.function.actor.agent.mdl');
    expect(scopesOf(grammar, source, 'for:', 'user')).toContain('support.class.actor.user.mdl');
    expect(scopesOf(grammar, source, 'for:', 'alice')).toContain('string.unquoted.actor.user.mdl');
  });

  test('a block scalar is prose, not fields', ({ expect }) => {
    const source = fence('type Piece', '  desc: |', '    key: value is prose here', '  kind: King');
    expect(scopesOf(grammar, source, 'desc', '|')).toContain('keyword.operator.block-scalar.mdl');
    expect(scopesOf(grammar, source, 'prose here', '    key: value is prose here')).toContain('meta.block-scalar.mdl');
    expect(scopesOf(grammar, source, 'King', 'kind')).toContain('variable.other.property.mdl');
  });

  test('other fences are left to markdown', ({ expect }) => {
    const source = ['```', 'type Piece', '```', ''].join('\n');
    expect(scopesOf(grammar, source, 'Piece', 'type Piece')).not.toContain('keyword.control.block.type.mdl');
  });
});
