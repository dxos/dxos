//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { escapeHtml, htmlTable } from './print.ts';

describe('print', () => {
  test('escapeHtml', () => {
    expect(escapeHtml('<a href="x">&</a>')).to.eq('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    expect(escapeHtml("it's")).to.eq('it&#39;s');
  });

  test('htmlTable', () => {
    expect(htmlTable([['1', '<b>']], { header: ['A'] })).to.eq(
      '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td><td>&lt;b&gt;</td></tr></tbody></table>',
    );
    expect(htmlTable([])).to.eq('<table><tbody></tbody></table>');
  });
});
