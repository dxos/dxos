//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { parseBoard, parseInline } from './parse.ts';
import { SAMPLE_MARKDOWN } from './testing/sample.ts';

const messages = (markdown: string) => parseBoard(markdown).errors.map(({ line, message }) => `${line}: ${message}`);

describe('parseBoard', () => {
  test('parses the sample', ({ expect }) => {
    const { board, errors } = parseBoard(SAMPLE_MARKDOWN, { updated: '2026-11-21T12:00:00.000Z' });
    expect(errors).toEqual([]);
    expect(board?.title).toBe('Session board skill');
    expect(board?.sections.map((section) => [section.kind, section.items.length])).toEqual([
      ['questions', 2],
      ['goals', 5],
      ['prs', 2],
    ]);
    const publish = board?.sections[1].items[1];
    expect(publish?.state).toBe('doing');
    expect(publish?.details[0].children?.[0].spans).toEqual([{ text: 'An unchanged board does not block.' }]);
  });

  test('accepts checkbox aliases and free sections', ({ expect }) => {
    const { board, errors } = parseBoard('# Title\n\n## Goals\n- [x] One.\n- [ ] Two.\n\n## Notes\n- A note.\n');
    expect(errors).toEqual([]);
    expect(board?.sections[0].items.map((item) => item.state)).toEqual(['done', 'todo']);
    expect(board?.sections[1]).toMatchObject({ kind: 'list', items: [{ spans: [{ text: 'A note.' }] }] });
  });

  test('joins a wrapped line to its bullet', ({ expect }) => {
    const { board } = parseBoard('# Title\n\n## Notes\n- One line\n  that wraps.\n');
    expect(board?.sections[0].items[0].spans).toEqual([{ text: 'One line that wraps.' }]);
  });

  test('reports the line of each error', () => {
    expect(messages('# Title\n\n## Goals\n- [later] One.\n- Two.\n')).toEqual([
      '4: "later" is not a state of "Goals"; use todo, doing, done, blocked, dropped',
      '5: start the item with a state: todo, doing, done, blocked, dropped',
    ]);
    expect(messages('No title.\n')).toEqual([
      '1: text must be a list item; write one line under the title as the summary',
      '1: the file has no `#` title',
      '1: the file has no `##` sections',
    ]);
    expect(messages('# Title\n\n## Notes\n   - Odd indent.\n')).toEqual(['4: indent list items by 0, 2 or 4 spaces']);
  });

  test('enforces the word budgets', () => {
    const long = Array.from({ length: 13 }, () => 'word').join(' ');
    expect(messages(`# Title\n\n## Notes\n- ${long}\n`)).toEqual(['4: 13 words; the limit is 12']);
    const details = Array.from({ length: 7 }, (_, index) => `  - Detail ${index}.`).join('\n');
    expect(messages(`# Title\n\n## Notes\n- Item.\n${details}\n`)).toEqual(['11: an item has more than 6 details']);
  });

  test('ignores HTML comments but keeps line numbers', () => {
    expect(messages('# Title\n<!--\nnote\n-->\n## Goals\n- [nope] One.\n')).toEqual([
      '6: "nope" is not a state of "Goals"; use todo, doing, done, blocked, dropped',
    ]);
  });
});

describe('parseInline', () => {
  test('splits code, bold, links, URLs and PR references', () => {
    expect(
      parseInline('Run `cli.ts` on **main**, see [the docs](https://x.dev) or https://y.dev. Also a/b#12.'),
    ).toEqual([
      { text: 'Run ' },
      { text: 'cli.ts', code: true },
      { text: ' on ' },
      { text: 'main', strong: true },
      { text: ', see ' },
      { text: 'the docs', href: 'https://x.dev' },
      { text: ' or ' },
      { text: 'y.dev', href: 'https://y.dev' },
      { text: '. Also ' },
      { text: 'a/b#12', href: 'https://github.com/a/b/pull/12' },
      { text: '.' },
    ]);
  });
});
