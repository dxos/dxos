//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Pattern, computePatternReplacements } from './replace-patterns-extension';

// Gmail-style angle-bracket mailto: `<[rich@example.com](mailto:rich@example.com)\>`.
const ANGLED_MAILTO_PATTERN: Pattern = {
  pattern: /<\[([^\]]+)\]\(mailto:\1\)\\>/,
  classNames: '',
};

const DIAL_IN = String.raw`\+[\d][\d\s\-()]*,,[\d]+#`;

const DIAL_IN_WITH_TEL_LINK: Pattern = {
  pattern: new RegExp(`(${DIAL_IN})<tel:[^>]+>`),
  classNames: '',
};

const DIAL_IN_ANGLED_TEL: Pattern = {
  pattern: new RegExp(String.raw`<\[(${DIAL_IN})\]\(tel:[^)]+\)\\>`),
  classNames: '',
};

const DIAL_IN_BARE: Pattern = {
  pattern: new RegExp(`(${DIAL_IN})(?!<tel:)`),
  classNames: '',
};

const INBOX_DIAL_IN_PATTERNS: Pattern[] = [DIAL_IN_WITH_TEL_LINK, DIAL_IN_ANGLED_TEL, DIAL_IN_BARE];

const applyReplacements = (text: string, patterns: Pattern[]): string => {
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
    const patterns: Pattern[] = [
      { pattern: /<wrap>([^<]+)<\/wrap>/, classNames: '' },
      { pattern: /\{\{([^}]+)\}\}/, classNames: '' },
    ];
    expect(applyReplacements('hello <wrap>world</wrap> and {{there}}', patterns)).to.equal('hello world and there');
  });

  test('replaces Teams dial-in with trailing tel link', ({ expect }) => {
    expect(
      applyReplacements('+1 323-849-4874,,766918553#<tel:+13238494874,,766918553#> United States', [
        DIAL_IN_WITH_TEL_LINK,
      ]),
    ).to.equal('+1 323-849-4874,,766918553# United States');
  });

  test('replaces compact dial-in with trailing tel link', ({ expect }) => {
    expect(
      applyReplacements('+16469313860,,91535833310#<tel:+16469313860,,91535833310#>', [DIAL_IN_WITH_TEL_LINK]),
    ).to.equal('+16469313860,,91535833310#');
  });

  test('replaces angled tel markdown with the bare dial-in string', ({ expect }) => {
    expect(
      applyReplacements('<[+16469313860,,91535833310#](tel:+16469313860,,91535833310#)\\>', [DIAL_IN_ANGLED_TEL]),
    ).to.equal('+16469313860,,91535833310#');
  });

  test('highlights bare one-tap mobile dial-in lines', ({ expect }) => {
    const text = ['One tap mobile', '+16469313860,,91535833310# US', '+19294362866,,91535833310# US (New York)'].join(
      '\n',
    );
    expect(applyReplacements(text, INBOX_DIAL_IN_PATTERNS)).to.equal(text);
    expect(computePatternReplacements(text, INBOX_DIAL_IN_PATTERNS)).toEqual([
      { from: 15, to: 41, text: '+16469313860,,91535833310#', classNames: '' },
      { from: 45, to: 71, text: '+19294362866,,91535833310#', classNames: '' },
    ]);
  });

  test('returns replacements sorted by position across patterns', ({ expect }) => {
    const patterns: Pattern[] = [
      { pattern: /\{\{([^}]+)\}\}/, classNames: 'b' },
      { pattern: /<wrap>([^<]+)<\/wrap>/, classNames: 'a' },
    ];
    expect(computePatternReplacements('hello <wrap>world</wrap> and {{there}}', patterns)).toEqual([
      { from: 6, to: 24, text: 'world', classNames: 'a' },
      { from: 29, to: 38, text: 'there', classNames: 'b' },
    ]);
  });
});
