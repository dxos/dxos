//
// Copyright 2024 DXOS.org
//

// @ts-ignore
import { testTree } from '@lezer/generator/test';
import { parser } from '@lezer/markdown';
import { describe, test } from 'vitest';

describe('parser', () => {
  // test.only('list-mark', () => {
  // const newParser = parser.configure({
  //   parseBlock: [
  //     {
  //       name: 'ListItem',
  //       parse: (cx, line) => {
  //         console.log(`[${line.text}]`, cx.lineStart, line.text.length);
  //         // line.skipSpace(1);
  //         return true;
  //       },
  //     },
  //   ],
  // });
  //
  // {
  //   const result = newParser.parse('  - ');
  //   testTree(result, 'Document(BulletList(ListItem(ListMark)))');
  // }
  // {
  //   const result = newParser.parse('-x');
  //   testTree(result, 'Document(Paragraph)');
  // }
  // {
  //   const result = newParser.parse('- x');
  //   testTree(result, 'Document(BulletList(ListItem(ListMark,Paragraph)))');
  // }
  // });

  // https://www.markdownguide.org/basic-syntax/#lists-1
  test('lists', () => {
    // Indented list must have 4 spaces.
    const result = parser.parse(
      [
        '# H1',
        '1. one',
        '2. two',
        '3. three',
        '    1. four',
        '',
        // TODO(burdon): Test list termination without heading as break.
        '# H2',
        '1. one',
      ].join('\n'),
    );

    testTree(
      result,
      [
        'Document(',
        'ATXHeading1(HeaderMark)',
        'OrderedList(',
        'ListItem(ListMark,Paragraph),',
        'ListItem(ListMark,Paragraph),',
        'ListItem(ListMark,Paragraph,OrderedList(ListItem(ListMark,Paragraph)))',
        ')',
        '',
        'ATXHeading1(HeaderMark)',
        'OrderedList(',
        'ListItem(ListMark,Paragraph),',
        ')',
        ')',
      ].join(''),
    );
  });
});
