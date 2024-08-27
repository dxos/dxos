//
// Copyright 2024 DXOS.org
//

// @ts-ignore
import { testTree } from '@lezer/generator/test';
import { parser } from '@lezer/markdown';

import { describe, test } from '@dxos/test';

describe.only('parser', () => {
  test('basic', () => {
    // Indented list must have 4 spaces.
    const result = parser.parse(['1. one', '2. two', '3. three', '    1. four'].join('\n'));
    testTree(
      result,
      [
        'Document(',
        'OrderedList(',
        'ListItem(ListMark,Paragraph),',
        'ListItem(ListMark,Paragraph),',
        'ListItem(ListMark,Paragraph,OrderedList(ListItem(ListMark,Paragraph)))',
        ')',
        ')',
      ].join(''),
    );
  });
});
