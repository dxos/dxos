//
// Copyright 2024 DXOS.org
//

import { markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState, type StateCommand } from '@codemirror/state';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { setHeading, getFormatting, emptyFormatting, type Formatting } from './formatting';

const createState = (doc: string) => {
  const selStart = doc.indexOf('{');
  const selEnd = doc.indexOf('}') - 1;
  return EditorState.create({
    doc: doc.replace(/[{}]/g, ''),
    selection: { anchor: selStart, head: selEnd },
    extensions: markdownLanguage,
  });
};

const testCommand = (name: string, doc: string, command: StateCommand, result: string | null) => {
  test(name, () => {
    let state = createState(doc);
    const status = command({ state, dispatch: (tr) => (state = tr.state) });
    if (!status || result === null) {
      expect(status).to.equal(result !== null);
    } else {
      expect(state.doc.toString()).to.equal(result);
    }
  });
};

describe('setHeading', () => {
  testCommand('can create a heading', 'Hello {}', setHeading(1), '# Hello ');

  testCommand('can create a level 2 heading', 'One\n\nTw{o}', setHeading(2), 'One\n\n## Two');

  testCommand('can increase change the depth of a heading', '# One{}', setHeading(3), '### One');

  testCommand('can decrease change the depth of a heading', '## One{}', setHeading(1), '# One');

  testCommand('can remove a heading', '### A{}', setHeading(0), 'A');

  testCommand(
    'can make multiple blocks a heading',
    '{One\n\nTwo}\n\nThree',
    setHeading(3),
    '### One\n\n### Two\n\nThree',
  );

  testCommand(
    "doesn't affect code blocks",
    '{One\n\n```\nTwo\n```\nThree}',
    setHeading(1),
    '# One\n\n```\nTwo\n```\n# Three',
  );

  testCommand('can remove a setext heading', 'One{}\n===', setHeading(0), 'One');

  testCommand('can change a setext heading to ATX', 'One{}\n---', setHeading(1), '# One');

  testCommand('can add a heading inside block markup', '> - {one\n> - two}\n', setHeading(1), '> - # one\n> - # two\n');

  testCommand('can remove a heading inside block markup', '1. # one{}', setHeading(0), '1. one');
});

describe('getFormatting', () => {
  const t = (name: string, doc: string, result: Partial<Formatting>) => {
    test(name, () => {
      const formatting = getFormatting(createState(doc));
      const expected = Object.assign({}, emptyFormatting, result);
      expect(formatting).to.deep.equal(expected);
    });
  };

  t('returns nothing special for regular content', 'hello {world}', {});

  t('can see emphasis', 'hello *{world}*', { emphasis: true });

  t('can see strong emphasis', 'hello **{world}**', { strong: true });

  t('can see strikethrough', 'hello ~~{world}~~', { strikethrough: true });

  t('can see inline code', 'hello `{world}`', { code: true });

  t("doesn't enable inline styles when only part of selection is styled", 'he{llo **wor}ld**', {});

  t('can handle adjacent styled spans', '**he{llo**\n**wor}ld**', { strong: true });

  t('ignores markers for inline style purposes', '{***o***}', { strong: true, emphasis: true });

  t('handles multi-paragraph inline styles', '~~*fo{o*~~\n\n~~ba}r~~', { strikethrough: true });

  t('activates for cursor selections', '~~*fo{}o*~~', { strikethrough: true, emphasis: true });

  t('spots a heading', '# Hello{}', { blockType: 'heading1' });

  t('spots a heading', '# Hello{}', { blockType: 'heading1' });

  t('spots a setext heading', 'Hello{}\n---', { blockType: 'heading2' });

  t('spots a code block', '    {code}', { blockType: 'codeblock' });

  t('spots a fenced code block', '```\n{code}\n```', { blockType: 'codeblock' });

  t('reports null for mixed block types', '# on{e\n\ntwo}', { blockType: null });

  t('reports heading for multiple selected headings', '# on{e\n\n# two}', { blockType: 'heading1' });

  t('notices blockquotes', '> {one}', { blockquote: true });

  t('notices multi-block blockquotes', '> {one\n>\n> two}', { blockquote: true });

  t('disables blockquote when not all blocks are quoted', '{one\n\n> two}', {});

  t('notices ordered lists', ' 1. Hi{}', { listStyle: 'ordered' });

  t('notices bullet lists', ' - Hi{}', { listStyle: 'bullet' });

  t('notices task lists', ' - [x] {Hi}', { listStyle: 'task' });

  t('uses the innermost list style', ' - 1. Ok{}', { listStyle: 'ordered' });

  t('notices multi-block lists', '1. {one\n2. two}', { listStyle: 'ordered' });

  t("disables list style when a block isn't a list", '1. {one\n\ntwo}', {});
});
