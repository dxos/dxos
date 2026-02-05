//
// Copyright 2024 DXOS.org
//

import { markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState, type StateCommand } from '@codemirror/state';
import { describe, expect, test } from 'vitest';

import {
  type Formatting,
  Inline,
  List,
  addBlockquote,
  addCodeblock,
  addLink,
  addList,
  addStyle,
  getFormatting,
  removeBlockquote,
  removeCodeblock,
  removeLink,
  removeList,
  removeStyle,
  setHeading,
} from './formatting';

export const emptyFormatting: Formatting = {
  blankLine: false,
  blockType: 'paragraph',
  strong: false,
  emphasis: false,
  strikethrough: false,
  code: false,
  link: false,
  listStyle: null,
  blockQuote: false,
};

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
      let resultSel = null;
      if (result.includes('{')) {
        const resultState = createState(result);
        result = resultState.doc.toString();
        resultSel = resultState.selection.main;
      }
      expect(state.doc.toString()).to.equal(result);
      if (resultSel) {
        expect([state.selection.main.from, state.selection.main.to]).to.deep.equal([resultSel.from, resultSel.to]);
      }
    }
  });
};

describe('setHeading', () => {
  testCommand('can create a heading', 'Hello {}', setHeading(1), '# Hello ');

  testCommand('can create a level 2 heading', 'One\n\nTw{o}', setHeading(2), 'One\n\n## Two');

  testCommand('can increase the depth of a heading', '# One{}', setHeading(3), '### One');

  testCommand('can decrease the depth of a heading', '## One{}', setHeading(1), '# One');

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

  testCommand('can add a heading to a blank line', 'one\n\n{}', setHeading(1), 'one\n\n# {}');
});

describe('addStyle', () => {
  const em = addStyle(Inline.Emphasis);
  const str = addStyle(Inline.Strong);
  const code = addStyle(Inline.Code);

  testCommand('can add emphasis', 'one {two}', em, 'one *{two}*');

  testCommand('can add emphasis around cursor', 'one {}', em, 'one *{}*');

  testCommand('can add strong style', '{one\n\ntwo}', str, '**{one**\n\n**two}**');

  testCommand('can add strikethrough', '{hey}', addStyle(Inline.Strikethrough), '~~{hey}~~');

  testCommand('can add code style', 'a {variable}', code, 'a `{variable}`');

  testCommand('clears styles inside added code', '{some **bold** text}', code, '`some bold text`');

  testCommand(
    'clears styles partially inside added code',
    '**some {bold** and *emphasized} text*',
    code,
    '**some** `bold and emphasized` *text*',
  );

  testCommand(
    'inserts markers at same position in the right order',
    '{some **bold,}text**',
    code,
    '`some bold,`**text**',
  );

  testCommand('remove existing markers inside', '{one *two* three}', em, '*{one two three}*');

  testCommand(
    'removes existing markers overlapping boundaries',
    '*one {two* *three} four*',
    em,
    '*one {two three} four*',
  );

  testCommand(
    'can style headers',
    '{one\n\n# two\n\nthree\n---\n\nfour} five',
    str,
    '**{one**\n\n# **two**\n\n**three**\n---\n\n**four}** five',
  );

  testCommand('moves the insert position out of markup', 'one ~{~two~}~ three', em, 'one ~~*two*~~ three');

  testCommand(
    'moves the range to cover partially covered links and images',
    '[one {two](x) ![three} four](y) five',
    em,
    '*[one {two](x) ![three} four](y)* five',
  );

  testCommand('can add a style to an empty line', '{}', em, '*{}*');
});

describe('removeStyle', () => {
  const em = removeStyle(Inline.Emphasis);
  const str = removeStyle(Inline.Strong);
  const code = removeStyle(Inline.Code);
  const strike = removeStyle(Inline.Strikethrough);

  testCommand('can remove emphasis', 'one *{two}*', em, 'one {two}');

  testCommand('can remove emphasis around cursor', 'one *{}*', em, 'one {}');

  testCommand('can remove strong style', '{**one**\n\n**two**}', str, '{one\n\ntwo}');

  testCommand('can remove strikethrough', '~~{hey}~~', strike, '{hey}');

  testCommand('can remove strikethrough around cursor', 'one ~~{}~~', strike, 'one {}');

  testCommand('can remove strikethrough around cursor with inner emphasis', 'one ~~*{}*~~', strike, 'one *{}*');

  testCommand('can remove code style', 'a `{variable}`', code, 'a {variable}');

  // TODO(dmaretskyi): Flaky on CI.
  // testCommand(
  //   'can remove emphasis across multiple blocks',
  //   '{*one*\n\n# *two*\n\n> 1. *three} four*\n',
  //   em,
  //   '{one\n\n# two\n\n> 1. three} *four*\n',
  // );

  testCommand('can shrink existing styles', '*one {two three} four*', em, '*one* {two three} *four*');

  testCommand('can remove strong from a partially emphasized text', '**{one*two*}**', str, '{one*two*}');

  testCommand(
    'can remove strong from a partially emphasized text with markers outside',
    '***{o*ne*two}***',
    str,
    '*{o*ne*two}*',
  );
});

describe('addLink', () => {
  testCommand('adds a link', '{}', addLink(), '[]({})');

  testCommand('adds a link around text', 'hello {world}', addLink(), 'hello [world]({})');

  testCommand('clears existing links', '[hello {world}](foo)', addLink(), 'hello [world]({})');

  testCommand('does nothing across blocks', '{one\n\ntwo}', addLink(), null);

  testCommand('does nothing in code blocks', '```\n{one}\n```', addLink(), null);

  testCommand('patches up overlapping styles before', '*foo {bar* baz}', addLink(), '*foo* [*bar* baz]({})');

  testCommand(
    'patches up overlapping styles after',
    'one {two ~~three} four~~',
    addLink(),
    'one [two ~~three~~]({}) ~~four~~',
  );
});

describe('removeLink', () => {
  testCommand('removes a link', '[hi{}](x)', removeLink, 'hi{}');

  testCommand('removes multiple links', '{[hi](x)\n\none [two](y)}', removeLink, '{hi\n\none two}');

  testCommand('removes label links', '[hi{}][hi]', removeLink, 'hi{}');

  testCommand('removes titles in links', '[hi{}](a "title" )', removeLink, 'hi{}');
});

describe('addList', () => {
  const bullet = addList(List.Bullet);
  const ordered = addList(List.Ordered);

  testCommand('can add a bullet list', 'Hi{}', bullet, '- Hi');

  testCommand('can add an ordered list', 'Hi{}', ordered, '1. Hi');

  testCommand('can add a task list', 'Hi{}', addList(List.Task), '- [ ] Hi');

  testCommand(
    'can wrap multiple blocks in a bullet list',
    '{One\n\n# Two\n\nThree}',
    bullet,
    '- One\n\n- # Two\n\n- Three',
  );

  testCommand('continues an existing numbered list', '1. Hello\n\nHi{}', ordered, '1. Hello\n\n2. Hi');

  testCommand(
    'can wrap multi-line blocks',
    'Hello this\nis a three-line\nparagraph.{}',
    bullet,
    '- Hello this\n  is a three-line\n  paragraph.',
  );

  testCommand(
    'can wrap fenced code blocks',
    '```javascript\ntrue{}\n```',
    ordered,
    '1. ```javascript\n   true\n   ```',
  );

  testCommand(
    'can wrap blocks inside markup',
    '> 1. Hello\n     {World\n>\n> Again}',
    bullet,
    '> 1. - Hello\n       World\n>\n> - Again',
  );

  testCommand('restarts numbering on outer block markup boundaries', '> {one\n\ntwo}', ordered, '> 1. one\n\n1. two');

  testCommand('aligns with above bullet list', '  - one\n\ntwo{}', bullet, '  - one\n\n  - two');

  testCommand('aligns with above ordered list', '  1. One\n\nTwo{}', ordered, '  1. One\n\n  2. Two');

  testCommand('compensates for number size when aligning', '  9. One\n\nTwo{}', ordered, '  9. One\n\n 10. Two');

  testCommand(
    'anticipates number size of other items',
    '{a\n\nb\n\nc\n\nd\n\ne\n\nf\n\ng\n\nh\n\ni\n\nj}',
    ordered,
    ' 1. a\n\n 2. b\n\n 3. c\n\n 4. d\n\n 5. e\n\n 6. f\n\n 7. g\n\n 8. h\n\n 9. i\n\n10. j',
  );

  testCommand(
    'renumbers lists after the selection',
    'one{}\n\n1. two\n\n2. three',
    ordered,
    '1. one\n\n2. two\n\n3. three',
  );

  testCommand("doesn't renumber lists with a different parent", '> one{}\n\n1. two', ordered, '> 1. one\n\n1. two');

  testCommand('can add a list to an empty line', '{}', ordered, '1. {}');
});

describe('removeList', () => {
  const bullet = removeList(List.Bullet);
  const ordered = removeList(List.Ordered);

  testCommand('can remove a bullet list', ' - Hi{}', bullet, 'Hi');

  testCommand('can remove an ordered list', '1. Hi{}', ordered, 'Hi');

  testCommand('can remove a task list', '- [x] Hi{}', removeList(List.Task), 'Hi');

  testCommand(
    'can remove a bullet list from multiple blocks',
    '- {One\n\n- # Two\n\n- Three}',
    bullet,
    'One\n\n# Two\n\nThree',
  );

  testCommand(
    'can unwrap multi-line blocks',
    '1. Hello this\n   is a three-line\nparagraph.{}',
    ordered,
    'Hello this\nis a three-line\nparagraph.',
  );

  testCommand('can unwrap fenced code blocks', '- ```javascript\n  true{}\n  ```', bullet, '```javascript\ntrue\n```');

  testCommand(
    'can unwrap blocks inside markup',
    '> 1. - Hello\n       {World\n>\n> - Again}',
    bullet,
    '> 1. Hello\n     World\n>\n> Again',
  );

  testCommand("doesn't unwrap other types of lists", '1. foo{}', bullet, null);

  testCommand(
    'renumbers lists after the selection',
    '1. one\n\n2. {two\n\n3. three}\n\n4. four\n\n5. five',
    ordered,
    '1. one\n\ntwo\n\nthree\n\n1. four\n\n2. five',
  );
});

describe('addBlockquote', () => {
  testCommand('can add a blockquote', 'Hi{}', addBlockquote, '> Hi');

  testCommand(
    'can add a blockquote to multi-line paragraph',
    'One\ntwo\nthree{}',
    addBlockquote,
    '> One\n> two\n> three',
  );

  testCommand(
    'can add a blockquote to multiple blocks',
    '{one\ntwo\n\n# three\n}\nfour',
    addBlockquote,
    '> one\n> two\n>\n> # three\n\nfour',
  );

  testCommand('can add a blockquote to an empty line', '{}', addBlockquote, '>{}');
});

describe('removeBlockquote', () => {
  testCommand('can remove a blockquote', '> Hi{}', removeBlockquote, 'Hi');

  testCommand('can remove a blockquote from a multi-line paragraph', '> A\n> B\n> C{}', removeBlockquote, 'A\nB\nC');

  testCommand('can remove a nested blockquote', '>> A\n>> B\n>> C{}', removeBlockquote, '> A\n> B\n> C');

  testCommand(
    'removes markers from adjacent blank lines',
    '> one\n>\n> two{}\n>\n> three',
    removeBlockquote,
    '> one\n\ntwo\n\n> three',
  );

  testCommand(
    'can remove quotes nested in lists',
    ' - 1. > foo\n      > {bar\n - > baz}',
    removeBlockquote,
    ' - 1. foo\n      bar\n - baz',
  );
});

describe('addCodeblock', () => {
  testCommand('add a code block to a blank line', '{}', addCodeblock, '```{}\n\n```');

  testCommand(
    'can turn a paragraph into a code block',
    'one\ntwo{}\nthree',
    addCodeblock,
    '```\none\ntwo{}\nthree\n```',
  );

  testCommand(
    'can turn an indented paragraph into a code block',
    '1. one\n   two{}',
    addCodeblock,
    '1. ```\n   one\n   two{}\n   ```',
  );

  testCommand(
    'can turn multiple paragraphs into a code block',
    "{10 print 'hello'\n\n20 goto 10}",
    addCodeblock,
    "```\n10 print 'hello'\n\n20 goto 10\n```",
  );
});

describe('removeCodeblock', () => {
  testCommand('removes fenced code blocks', '```\ncode{}\n```', removeCodeblock, 'code{}');

  testCommand('removes indented code blocks', '    code{}', removeCodeblock, 'code{}');

  testCommand('does nothing on regular text', 'not code{}', removeCodeblock, null);

  testCommand('can remove multiple code block', '{```\none\n```\n\n    two}', removeCodeblock, 'one\n\ntwo');

  testCommand(
    'can remove code in other block markup',
    '> 1. ```\n>    {one\n>    ```\n>\n> 2.     two}',
    removeCodeblock,
    '> 1. one\n>\n> 2. two',
  );
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

  t('notices blockquotes', '> {one}', { blockQuote: true });

  t('notices multi-block blockquotes', '> {one\n>\n> two}', { blockQuote: true });

  t('disables blockquote when not all blocks are quoted', '{one\n\n> two}', {});

  t('notices ordered lists', ' 1. Hi{}', { listStyle: 'ordered' });

  t('notices bullet lists', ' - Hi{}', { listStyle: 'bullet' });

  t('notices task lists', ' - [x] {Hi}', { listStyle: 'task' });

  t('uses the innermost list style', ' - 1. Ok{}', { listStyle: 'ordered' });

  t('notices multi-block lists', '1. {one\n2. two}', { listStyle: 'ordered' });

  t("disables list style when a block isn't a list", '1. {one\n\ntwo}', {});

  t('sees markup directly around cursor even if not valid', 'q **{}**', { strong: true });

  t('sees multiple types of markup directly around cursor', 'q ~~***{}***~~', {
    strong: true,
    emphasis: true,
    strikethrough: true,
  });
});
