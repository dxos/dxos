//
// Copyright 2026 DXOS.org
//

import { micromark } from 'micromark';
import { describe, test } from 'vitest';

import { findEmbeds, removeEmbeds, renderWithEmbeds } from './print-embeds.ts';

describe('print-embeds', () => {
  test('finds object embeds but not links or images', ({ expect }) => {
    expect(
      findEmbeds('Intro\n\n![Sheet|320](echo:/01ABC)\n\n[link](echo:/01DEF) ![pic](https://x.test/a.png)'),
    ).toEqual([{ label: 'Sheet|320', eid: 'echo:/01ABC' }]);
  });

  test('removes embeds leaving a single blank line', ({ expect }) => {
    expect(removeEmbeds('# A\n\n![x](echo:/1)\n\nB\n')).toEqual('# A\n\nB\n');
    expect(removeEmbeds('# A\n\n![x](echo:/1)\n\n\n![y](eid:2)\n\nB')).toEqual('# A\n\nB');
    expect(removeEmbeds('![x](echo:/1)\n\nB')).toEqual('B');
    expect(removeEmbeds('A\n\n![x](echo:/1)\n')).toEqual('A');
    expect(removeEmbeds('A\n![x](echo:/1)\nB')).toEqual('A\n\nB');
    expect(removeEmbeds('A ![x](echo:/1)\nB')).toEqual('A\nB');
    expect(removeEmbeds('A\n\n![pic](https://x.test/a.png)')).toEqual('A\n\n![pic](https://x.test/a.png)');
  });

  test('renders only printable embeds, in place', ({ expect }) => {
    const html = renderWithEmbeds('A\n\n![x](echo:/1)\n\n![y](echo:/2)\n\nB', [undefined, '<b>$&</b>'], micromark);
    expect(html).toEqual('<p>A</p>\n<b>$&</b>\n<p>B</p>');
  });

  test('document text never collides with a placeholder, even through a character reference', ({ expect }) => {
    const content = 'DXEMBED0N1X D&#88;EMBED1N1X\n\n![x](echo:/1)\n\n![y](echo:/2)';
    const html = renderWithEmbeds(content, [undefined, '<b>y</b>'], micromark);
    expect(html).toEqual('<p>DXEMBED0N1X DXEMBED1N1X</p>\n<b>y</b>\n');
  });
});
