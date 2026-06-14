//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { computePatternReplacements } from './replace-patterns-extension';

// Gmail-style angle-bracket mailto: `<[rich@example.com](mailto:rich@example.com)\>`.
const ANGLED_MAILTO_PATTERN = /<\[([^\]]+)\]\(mailto:\1\)\\>/;

const applyReplacements = (text: string, patterns: RegExp[]): string => {
  let result = '';
  let position = 0;
  for (const { from, to, text: replacement } of computePatternReplacements(text, patterns)) {
    result += text.slice(position, from);
    result += replacement;
    position = to;
  }
  return result + text.slice(position);
};

describe('replacePatterns', () => {
  test('replaces angled mailto markdown with the bare email', ({ expect }) => {
    expect(
      applyReplacements('<[rich@braneframe.com](mailto:rich@braneframe.com)\\>', [ANGLED_MAILTO_PATTERN]),
    ).to.equal('rich@braneframe.com');
  });

  test('leaves a normal mailto link untouched', ({ expect }) => {
    const text = '[rich@braneframe.com](mailto:rich@braneframe.com)';
    expect(applyReplacements(text, [ANGLED_MAILTO_PATTERN])).to.equal(text);
  });

  test('replaces multiple occurrences in one line', ({ expect }) => {
    expect(
      applyReplacements('to <[a@example.com](mailto:a@example.com)\\> and <[b@example.com](mailto:b@example.com)\\>', [
        ANGLED_MAILTO_PATTERN,
      ]),
    ).to.equal('to a@example.com and b@example.com');
  });

  test('applies multiple patterns in document order', ({ expect }) => {
    const patterns = [/<wrap>([^<]+)<\/wrap>/, /\{\{([^}]+)\}\}/];
    expect(applyReplacements('hello <wrap>world</wrap> and {{there}}', patterns)).to.equal('hello world and there');
  });
});
