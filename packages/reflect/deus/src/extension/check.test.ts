//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { indexSpecs } from '../spec-index/index.ts';
import { parseMdlBlocks } from './blocks.ts';
import { MISSING_DECISION, checkChangelogChange, isTrivialEdit, lintMdl, parseChangelog } from './check.ts';

const block = (body: string) => ['```mdl', body, '```', ''].join('\n');

const messages = (text: string) => lintMdl(text).map(({ message }) => message);

describe('mdl lint', () => {
  test('unknown block type', ({ expect }) => {
    expect(messages(block('widget W-1'))).toEqual([
      'Unknown block type "widget". Declare it in the Extensions table or define it with an `ext` block.',
    ]);
  });

  describe('one block per fence', () => {
    const lint = (text: string) =>
      lintMdl(text)
        .filter(({ source }) => source === 'mdl/block')
        .map(({ from, message }) => ({ line: text.slice(0, from).split('\n').length, message }));

    test('a second block header inside one fence', ({ expect }) => {
      expect(lint(block('op create: Create.\n  input: A\n\nop convert: Convert.\n  input: B'))).toEqual([
        {
          line: 5,
          message: 'A second block header (`op convert`) inside one fence; give each block its own ```mdl fence.',
        },
      ]);
    });

    test('a body line at column 0 that is not a block type', ({ expect }) => {
      expect(lint(block('type T\n  desc: |\n    text\nsurface prompt -> RoutineArticle'))).toEqual([]);
    });

    test('a block type inside an indented body', ({ expect }) => {
      expect(lint(block('feat F-1: Feature.\n  req:\n    test the thing works\n  type T'))).toEqual([]);
    });

    test('a term declared in the Extensions table', ({ expect }) => {
      const extensions =
        '## Extensions\n\n| Term | URI |\n|---|---|\n| `capability` | `org.dxos.mdl.capability@1.0` |\n\n';
      expect(lint(extensions + block('capability A\n  desc: x\n\ncapability B\n  desc: y'))).toEqual([
        {
          line: 11,
          message: 'A second block header (`capability B`) inside one fence; give each block its own ```mdl fence.',
        },
      ]);
    });
  });

  describe('decision', () => {
    test('user decision', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  date: 2026-10-20\n  by: user:a@b.org'))).toEqual([]);
    });

    test('agent decision with principal', ({ expect }) => {
      expect(
        messages(block('decision D-2: Use Y.\n  by: agent:claude-code  # ran the migration\n  for: user:bob')),
      ).toEqual([]);
    });

    test('missing decider', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  date: 2026-10-20'))).toEqual([
        'Decision is missing `by:` - name the user: or agent: that made it.',
      ]);
    });

    test('untyped decider', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: bob'))).toEqual([
        'Decision `by: bob` must be `user:<handle>` or `agent:<name>`.',
      ]);
    });

    test('agent decision without principal', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: agent:claude-code'))).toEqual([
        'Agent decision is missing `for:` - name the user: the agent acted for.',
      ]);
    });

    test('principal on a user decision', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: user:bob\n  for: user:alice'))).toEqual([
        '`for:` applies only to agent decisions.',
      ]);
    });

    test('principal must be a user', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: agent:a\n  for: agent:b'))).toEqual([
        '`for: agent:b` must be `user:<handle>`.',
      ]);
    });

    test('unclosed block at the end of the text', ({ expect }) => {
      expect(messages('```mdl\ndecision D-1: Use X.\n  by: user:bob\n')).toEqual([]);
    });

    test('unclosed block does not read the next block', ({ expect }) => {
      expect(messages('```mdl\ndecision D-1: Use X.\n  by: user:bob\n' + block('type T\n  for: x'))).toEqual([]);
    });

    test('fields of a later block are not read', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: user:bob') + block('type T\n  for: x'))).toEqual([]);
    });
  });

  describe('question', () => {
    test('agent question with principal', ({ expect }) => {
      expect(messages(block('question Q-1: X or Y?\n  by: agent:claude-code\n  for: user:bob'))).toEqual([]);
    });

    test('agent question without principal', ({ expect }) => {
      expect(messages(block('question Q-1: X or Y?\n  by: agent:claude-code'))).toEqual([
        'Agent question is missing `for:` - name the user: the agent acted for.',
      ]);
    });

    test('missing asker', ({ expect }) => {
      expect(messages(block('question Q-1: X or Y?'))).toEqual([
        'Question is missing `by:` - name the user: or agent: that made it.',
      ]);
    });
  });

  describe('changelog change', () => {
    const decision = (id: string, prose: string, extra = '') =>
      block(`decision ${id}: ${prose}\n  date: 2026-10-20\n  by: user:bob${extra}`);
    const spec = (body: string, ...entries: string[]) => `# Spec\n\n${body}\n\n## Changelog\n\n${entries.join('\n')}`;
    const d1 = decision('D-1', 'Use X.');
    const d2 = decision('D-2', 'Use Y.');

    test('body change with a new decision', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('X and Y', d1, d2))).toEqual([]);
    });

    test('body change without a decision', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('X and Y', d1))).toEqual([MISSING_DECISION]);
    });

    test('typo fix without a decision', ({ expect }) => {
      expect(checkChangelogChange(spec('The bord is drawn.', d1), spec('The board is  drawn.\n', d1))).toEqual([]);
    });

    test('spec without a changelog section', ({ expect }) => {
      expect(checkChangelogChange('# Spec\n\nX\n', '# Spec\n\nY\n')).toEqual([MISSING_DECISION]);
    });

    test('adding a changelog to an existing spec', ({ expect }) => {
      expect(checkChangelogChange('# Spec\n\nX\n', spec('Y', d1))).toEqual([]);
    });

    test('decision only, such as an approval', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('X', d1, decision('D-2', 'Approve [D-1].')))).toEqual([]);
    });

    test('new spec', ({ expect }) => {
      expect(checkChangelogChange(undefined, spec('X', d1))).toEqual([]);
      expect(checkChangelogChange(undefined, '# Spec\n')).toEqual([
        'A new spec needs a `## Changelog` with at least one decision.',
      ]);
    });

    test('edited decision', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('X', decision('D-1', 'Use Z.'), d2))).toEqual([
        'Decision D-1 was edited - the changelog is append-only; supersede it instead.',
      ]);
    });

    test('removed decision', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1, d2), spec('Y', d2, decision('D-3', 'Use Z.')))).toEqual([
        'Decision D-1 was removed - the changelog is append-only; supersede it instead.',
      ]);
    });

    test('decision inserted before an existing one', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('Y', d2, d1))).toEqual([
        'Decisions must stay in order, with new ones appended last.',
      ]);
    });

    test('out of sequence id', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('Y', d1, decision('D-3', 'Use Z.')))).toEqual([
        'Decision D-3 is out of sequence - the next id is D-2.',
      ]);
    });

    test('supersedes an unknown decision', ({ expect }) => {
      expect(
        checkChangelogChange(spec('X', d1), spec('Y', d1, decision('D-2', 'Use Z.', '\n  supersedes: D-9'))),
      ).toEqual(['Decision D-2 supersedes D-9, which is not in the changelog.']);
    });

    describe('questions', () => {
      const question = (id: string, prose: string) =>
        block(`question ${id}: ${prose}\n  date: 2026-10-20\n  by: agent:claude-code\n  for: user:bob`);
      const q1 = question('Q-1', 'X or Y?');

      test('asking a question needs no decision', ({ expect }) => {
        expect(checkChangelogChange(spec('X', d1), spec('X', d1, q1))).toEqual([]);
      });

      test('answering a question', ({ expect }) => {
        expect(
          checkChangelogChange(spec('X', d1, q1), spec('X', d1, q1, decision('D-2', 'Y.', '\n  answers: Q-1'))),
        ).toEqual([]);
      });

      test('edited question', ({ expect }) => {
        expect(checkChangelogChange(spec('X', d1, q1), spec('X', d1, question('Q-1', 'X or Z?')))).toEqual([
          'Question Q-1 was edited - the changelog is append-only; ask a new question instead.',
        ]);
      });

      test('removed question', ({ expect }) => {
        expect(checkChangelogChange(spec('X', d1, q1), spec('X', d1, d2))).toEqual([
          'Question Q-1 was removed - the changelog is append-only; answer it with a decision instead.',
        ]);
      });

      test('out of sequence id', ({ expect }) => {
        expect(checkChangelogChange(spec('X', d1, q1), spec('X', d1, q1, question('Q-3', 'Z?')))).toEqual([
          'Question Q-3 is out of sequence - the next id is Q-2.',
        ]);
      });

      test('answers an unknown question', ({ expect }) => {
        expect(checkChangelogChange(spec('X', d1), spec('X', d1, decision('D-2', 'Y.', '\n  answers: Q-9')))).toEqual([
          'Decision D-2 answers Q-9, which is not in the changelog.',
        ]);
      });

      test('a second answer must supersede the first', ({ expect }) => {
        const a1 = decision('D-2', 'Y.', '\n  answers: Q-1');
        expect(
          checkChangelogChange(spec('X', d1, q1, a1), spec('X', d1, q1, a1, decision('D-3', 'Z.', '\n  answers: Q-1'))),
        ).toEqual(['Decision D-3 answers Q-1, which D-2 already answered - supersede D-2 instead.']);
        expect(
          checkChangelogChange(
            spec('X', d1, q1, a1),
            spec('X', d1, q1, a1, decision('D-3', 'Z.', '\n  answers: Q-1\n  supersedes: D-2')),
          ),
        ).toEqual([]);
      });
    });

    test('decisions outside the changelog are examples', ({ expect }) => {
      expect(
        checkChangelogChange(spec(decision('D-7', 'Example.'), d1), spec(decision('D-7', 'Example.'), d1, d2)),
      ).toEqual([]);
    });
  });

  describe('trivial edit', () => {
    test('whitespace only', ({ expect }) => {
      expect(isTrivialEdit('a  b\nc', 'a b c\n')).toBe(true);
    });

    test('up to three small typo fixes', ({ expect }) => {
      expect(isTrivialEdit('teh bord is recieved', 'the board is received')).toBe(true);
    });

    test('too many fixes', ({ expect }) => {
      expect(isTrivialEdit('aa bb cc dd', 'ab bc cd de')).toBe(false);
    });

    test('a word added or removed', ({ expect }) => {
      expect(isTrivialEdit('must move', 'must not move')).toBe(false);
    });

    test('a different word', ({ expect }) => {
      expect(isTrivialEdit('white moves first', 'black moves first')).toBe(false);
    });

    test('normative words', ({ expect }) => {
      expect(isTrivialEdit('you must move', 'you most move')).toBe(false);
      expect(isTrivialEdit('it can move', "it can't move")).toBe(false);
    });

    test('short words', ({ expect }) => {
      expect(isTrivialEdit('is on', 'in no')).toBe(false);
    });

    test('ids and numbers', ({ expect }) => {
      expect(isTrivialEdit('see F-1.2', 'see F-1.3')).toBe(false);
      expect(isTrivialEdit('max 8', 'max 9')).toBe(false);
    });
  });

  describe('parse changelog', () => {
    test('reads the fields of each decision', ({ expect }) => {
      const text = [
        '# Spec',
        '',
        '## Changelog',
        '',
        block(
          [
            'decision D-1: The canvas grows.',
            '  date: 2026-10-02',
            '  by: user:alice',
            '  quote: |',
            '    canvas should grow',
            '',
            '    past the edge',
            '  affects: [Scene, F-2.1]',
          ].join('\n'),
        ),
        block(
          [
            'decision D-2: Bounds grow to the major grid. Fills in [D-1].',
            '  date: 2026-10-02',
            '  by: agent:claude-code',
            '  for: user:alice',
            '  why: Keeps [D-1] cheap; see [D-1] and [D-2].',
            '  supersedes: D-1',
            '  rejected:',
            '    - Fixed padding: clips large nodes.',
            '    - Minor grid: re-lays on every drag.',
          ].join('\n'),
        ),
        '## Appendix',
      ].join('\n');

      const { entries } = parseChangelog(text);
      expect(entries).toHaveLength(2);
      expect(entries[0]).toMatchObject({
        id: 'D-1',
        title: 'The canvas grows.',
        date: '2026-10-02',
        by: 'user:alice',
        quote: 'canvas should grow\n\npast the edge',
        affects: ['Scene', 'F-2.1'],
        refs: [],
        rejected: [],
      });
      expect(entries[0].for).toBeUndefined();
      expect(entries[1]).toMatchObject({
        id: 'D-2',
        by: 'agent:claude-code',
        for: 'user:alice',
        supersedes: 'D-1',
        refs: ['D-1'],
        rejected: ['Fixed padding: clips large nodes.', 'Minor grid: re-lays on every drag.'],
      });
    });
  });
});

describe('parse changelog questions', () => {
  test('reads the fields of each question and the answer of a decision', ({ expect }) => {
    const text = [
      '## Changelog',
      '',
      block(
        [
          'question Q-1: Does the canvas shrink?',
          '  date: 2026-10-06',
          '  by: agent:claude-code',
          '  for: user:alice',
          '  affects: [Scene]',
          '  context: Nothing says whether bounds shrink.',
          '  options:',
          '    - Never: the view never jumps.',
          '    - On drop',
        ].join('\n'),
      ),
      block('decision D-1: Never.\n  date: 2026-10-07\n  by: user:alice\n  answers: Q-1'),
    ].join('\n');
    const { entries, questions } = parseChangelog(text);
    expect(questions).toEqual([
      expect.objectContaining({
        id: 'Q-1',
        title: 'Does the canvas shrink?',
        by: 'agent:claude-code',
        for: 'user:alice',
        affects: ['Scene'],
        context: 'Nothing says whether bounds shrink.',
        options: [{ title: 'Never', description: 'the view never jumps.' }, { title: 'On drop' }],
      }),
    ]);
    expect(entries[0]).toMatchObject({ id: 'D-1', answers: 'Q-1' });
  });
});

describe('parseMdlBlocks', () => {
  test('reads type, id, title and body of every block', ({ expect }) => {
    const text = [
      '# Spec',
      '',
      '```mdl',
      'type Call',
      '  fields:',
      '    name?: string',
      '```',
      '',
      '```mdl',
      'feat F-1: Start a call',
      '  req F-1.1: A Channel shows a call action.',
      '```',
    ].join('\n');
    const blocks = parseMdlBlocks(text);
    expect(blocks.map(({ type, id, title }) => ({ type, id, title }))).toEqual([
      { type: 'type', id: 'Call', title: undefined },
      { type: 'feat', id: 'F-1', title: 'Start a call' },
    ]);
    expect(blocks[0].body).toBe('  fields:\n    name?: string\n');
  });

  test('ignores mdl fences inside an enclosing four-backtick or tilde fence', ({ expect }) => {
    const text = [
      '````md',
      '```mdl',
      'feat F-1: Example',
      '```',
      '````',
      '',
      '~~~md',
      '```mdl',
      'feat F-2: Example',
      '```',
      '~~~',
      '',
      '```mdl',
      'feat F-3: Real',
      '  req F-3.1: A requirement.',
      '```',
    ].join('\n');
    const blocks = parseMdlBlocks(text);
    expect(blocks.map(({ type, id }) => ({ type, id }))).toEqual([{ type: 'feat', id: 'F-3' }]);
    expect(blocks[0].body).toBe('  req F-3.1: A requirement.\n');
  });

  test('a fence line with an info string does not end a block', ({ expect }) => {
    const text = ['```mdl', 'feat F-1: Start', '```ts', 'code', '```'].join('\n');
    const blocks = parseMdlBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toBe('```ts\ncode\n');
  });

  test('an unclosed block runs to the end of the text', ({ expect }) => {
    const blocks = parseMdlBlocks(['```mdl', 'feat F-1: Start', '  req F-1.1: Open.'].join('\n'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toBe('  req F-1.1: Open.');
  });
});

describe('mdl references and dependencies', () => {
  const other = (id: string, items: string) => ['---', `id: ${id}`, '---', '', block(items), ''].join('\n');
  const index = indexSpecs([
    { path: 'a/SPEC.mdl', text: other('org.test.alpha', 'feat F-1: One\n  req F-1.1: Do it') },
    { path: 'b/SPEC.mdl', text: other('org.test.beta', 'feat G-1: Other') },
    { path: 'c/SPEC.mdl', text: other('org.test.twice', 'feat T-1: Same') },
    { path: 'd/SPEC.mdl', text: other('org.test.twice', 'feat T-1: Same') },
  ]);
  const spec = (body: string, frontmatter = 'id: org.test.self') => `---\n${frontmatter}\n---\n\n${body}\n`;
  const uses = (id: string) => block(`uses ${id}: Why.`);
  const lint = (text: string) => lintMdl(text, { index }).map(({ source, message }) => ({ source, message }));

  test('unknown spec in a reference', ({ expect }) => {
    expect(lint(spec('See org.test.nope#F-1.'))).toEqual([
      { source: 'mdl/ref', message: 'Unknown spec `org.test.nope`.' },
    ]);
  });

  test('missing item', ({ expect }) => {
    expect(lint(spec(`${uses('org.test.alpha')}\nSee org.test.alpha#F-9.`))).toEqual([
      { source: 'mdl/ref', message: '`org.test.alpha` has no item `F-9`.' },
    ]);
  });

  test('item that exists', ({ expect }) => {
    expect(lint(spec(`${uses('org.test.alpha')}\nSee org.test.alpha#F-1.1 and org.test.alpha#F-1.`))).toEqual([]);
  });

  test('reference to a spec that is not a dependency', ({ expect }) => {
    expect(lint(spec('See org.test.alpha#F-1.'))).toEqual([
      {
        source: 'mdl/ref',
        message: '`org.test.alpha` is not a dependency; add `uses org.test.alpha: ...` under ## Dependencies.',
      },
    ]);
  });

  test('github key to a spec', ({ expect }) => {
    const message = 'Refer to a spec by id (`<id>#<item>`), not by a github: key.';
    expect(lint(spec('See github:dxos/dxos/a/SPEC.mdl#F-1 and github:dxos/dxos/a/SPEC.mdl.'))).toEqual([
      { source: 'mdl/ref', message },
      { source: 'mdl/ref', message },
    ]);
  });

  test('github key to a spec in the changelog is kept', ({ expect }) => {
    const message = 'Refer to a spec by id (`<id>#<item>`), not by a github: key.';
    const text = spec(
      [
        'See github:dxos/dxos/a/SPEC.mdl#F-1.',
        '',
        '## Changelog',
        '',
        block('decision D-1: Uses github:dxos/dxos/a/SPEC.mdl#F-1.\n  date: 2026-10-27\n  by: user:alice'),
        '',
        '## Appendix',
        '',
        'See github:dxos/dxos/a/SPEC.mdl#F-1.',
      ].join('\n'),
    );
    expect(lint(text)).toEqual([
      { source: 'mdl/ref', message },
      { source: 'mdl/ref', message },
    ]);
  });

  test('github key to code is allowed', ({ expect }) => {
    expect(lint(spec('See github:dxos/dxos/a/file.ts#Foo.'))).toEqual([]);
  });

  test('spec id declared by more than one file', ({ expect }) => {
    const message = 'Spec id `org.test.twice` is declared by more than one file.';
    expect(lint(spec(`${uses('org.test.twice')}\nSee org.test.twice#T-1.`))).toEqual([
      { source: 'mdl/uses', message },
      { source: 'mdl/ref', message },
    ]);
  });

  test('uses of an unknown spec', ({ expect }) => {
    expect(lint(spec(uses('org.test.nope')))).toEqual([
      { source: 'mdl/uses', message: 'Unknown spec `org.test.nope`.' },
    ]);
  });

  test('uses declared twice', ({ expect }) => {
    expect(lint(spec(`${uses('org.test.alpha')}\n${uses('org.test.alpha')}`))).toEqual([
      { source: 'mdl/uses', message: '`org.test.alpha` is declared twice.' },
    ]);
  });

  test('uses of itself', ({ expect }) => {
    expect(lint(spec(uses('org.test.self')))).toEqual([{ source: 'mdl/uses', message: 'A spec cannot use itself.' }]);
  });

  test('uses an id already in dependsOn', ({ expect }) => {
    const text = spec(`${block('plugin P: x\n  dependsOn: [org.test.alpha]')}\n${uses('org.test.alpha')}`);
    expect(lint(text)).toEqual([
      { source: 'mdl/uses', message: '`org.test.alpha` is in dependsOn; do not repeat it under uses.' },
    ]);
  });

  test('an id in dependsOn admits references to it', ({ expect }) => {
    const text = spec(`${block('plugin P: x\n  dependsOn: [org.test.alpha]')}\nSee org.test.alpha#F-1.`);
    expect(lint(text)).toEqual([]);
  });

  test('a reference to an item of the spec itself is allowed', ({ expect }) => {
    expect(lint(spec(`${block('feat X: One\n  req X.1: Do it')}\nSee org.test.self#X and org.test.self#X.1.`))).toEqual(
      [],
    );
  });

  test('a reference to a missing item of the spec itself', ({ expect }) => {
    expect(lint(spec('See org.test.self#X.'))).toEqual([
      { source: 'mdl/ref', message: '`org.test.self` has no item `X`.' },
    ]);
  });

  test('a cycle is allowed', ({ expect }) => {
    const first = spec(`${uses('org.test.beta')}\nSee org.test.beta#G-1.`, 'id: org.test.alpha');
    const second = spec(`${uses('org.test.alpha')}\nSee org.test.alpha#F-1.`, 'id: org.test.beta');
    expect(lint(first)).toEqual([]);
    expect(lint(second)).toEqual([]);
  });

  const dependsOn = (id: string) => block(`plugin P: x\n  dependsOn: [${id}]`);

  test('dependsOn of an unknown spec', ({ expect }) => {
    expect(lint(spec(dependsOn('org.test.nope')))).toEqual([
      { source: 'mdl/uses', message: 'Unknown spec `org.test.nope`.' },
    ]);
  });

  test('dependsOn of itself', ({ expect }) => {
    expect(lint(spec(dependsOn('org.test.self')))).toEqual([
      { source: 'mdl/uses', message: 'A spec cannot use itself.' },
    ]);
  });

  test('dependsOn declared twice', ({ expect }) => {
    expect(lint(spec(dependsOn('org.test.alpha, org.test.alpha')))).toEqual([
      { source: 'mdl/uses', message: '`org.test.alpha` is declared twice.' },
    ]);
  });

  test('dependsOn of an ambiguous spec', ({ expect }) => {
    expect(lint(spec(dependsOn('org.test.twice')))).toEqual([
      { source: 'mdl/uses', message: 'Spec id `org.test.twice` is declared by more than one file.' },
    ]);
  });

  test('github key boundary', ({ expect }) => {
    expect(lint(spec('See github:o/r/a/file.mdl.ts#X and github:o/r/a/file.mdlx.'))).toEqual([]);
  });

  test('a candidate outside the indexed namespaces is prose', ({ expect }) => {
    expect(lint(spec('See gmail-sync.test.ts#Foo and app.bsky.feed.defs#post.'))).toEqual([]);
  });

  test('a typo in an indexed namespace is an unknown spec', ({ expect }) => {
    expect(lint(spec('See org.test.typo#X.'))).toEqual([
      { source: 'mdl/ref', message: 'Unknown spec `org.test.typo`.' },
    ]);
  });

  test('a spec whose own id is declared by more than one file', ({ expect }) => {
    const text = spec('Body.', 'id: org.test.twice');
    const [diagnostic] = lintMdl(text, { index });
    expect(diagnostic).toMatchObject({
      source: 'mdl/uses',
      message: 'Spec id `org.test.twice` is declared by more than one file.',
    });
    expect(text.slice(diagnostic.from, diagnostic.to)).toBe('id: org.test.twice');
  });

  test('emits no ref or uses diagnostics without an index', ({ expect }) => {
    expect(lintMdl(spec(`${uses('org.test.nope')}\nSee org.test.nope#F-1 and github:a/b.mdl.`))).toEqual([]);
  });
});
