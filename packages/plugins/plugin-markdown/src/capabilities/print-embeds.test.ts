//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { findEmbeds, placeEmbeds, removeEmbeds } from './print-embeds.ts';

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

  test('places and inserts only printable embeds', ({ expect }) => {
    const rendered = [undefined, '<b>$&</b>'];
    const { source, insert } = placeEmbeds('A\n\n![x](echo:/1)\n\n![y](echo:/2)\n\nB', rendered);
    expect(source.match(/DXEMBED\w+/g)).toEqual(['DXEMBED0N1X']);
    expect(insert('<p>A</p>\n<p>DXEMBED0N1X</p>\n<p>B</p>')).toEqual('<p>A</p>\n<b>$&</b>\n<p>B</p>');
  });

  test('document text never collides with a placeholder', ({ expect }) => {
    const { source, insert } = placeEmbeds('DXEMBED0N1X\n\n![x](echo:/1)\n\n![y](echo:/2)', [undefined, '<b>y</b>']);
    expect(source.match(/DXEMBED\w+/g)).toEqual(['DXEMBED0N1X', 'DXEMBED1N1X']);
    expect(insert('<p>DXEMBED0N1X</p>\n<p>DXEMBED1N1X</p>')).toEqual('<p>DXEMBED0N1X</p>\n<b>y</b>');
  });
});
