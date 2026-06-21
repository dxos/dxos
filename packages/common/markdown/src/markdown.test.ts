//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { normalizeText } from './markdown';

describe('markdown', () => {
  test('stripNewlines', ({ expect }) => {
    const text = '<p>aaa</p><p><br></p><p><br></p><p>bbb</p>';
    expect(normalizeText(text)).to.equal('aaa\n\nbbb');
  });

  test('markdown', ({ expect }) => {
    const text =
      '<p>Another quick reminder to kindly complete this short questionnaire <a href="https://blueyard.typeform.com/to/OLmO8o4k">link</a> to indicate your preferred Day.</p>';
    const markdown = normalizeText(text);
    expect(markdown).to.equal(
      'Another quick reminder to kindly complete this short questionnaire [link](https://blueyard.typeform.com/to/OLmO8o4k) to indicate your preferred Day.',
    );
  });

  test('strip html (full)', ({ expect }) => {
    const text = '<html><body><p>test</p></body></html>';
    const markdown = normalizeText(text);
    expect(markdown).to.equal('test');
  });

  test('strip html', ({ expect }) => {
    const text = '<p>test</p>';
    const markdown = normalizeText(text);
    expect(markdown).to.equal('test');
  });

  test('converts setext underlines / horizontal rules to markdown HR', ({ expect }) => {
    expect(normalizeText('Heading\n===\n\nbody')).to.equal('Heading\n---\n\nbody');
    expect(normalizeText('Title\n---\n\nbody')).to.equal('Title\n---\n\nbody');
    expect(normalizeText('above\n\n---\n\nbelow')).to.equal('above\n\n---\n\nbelow');
    // Mixed and longer runs (3+) also normalize to `---`.
    expect(normalizeText('above\n\n=====\n\nbelow')).to.equal('above\n\n---\n\nbelow');
    expect(normalizeText('above\n\n-=-=-\n\nbelow')).to.equal('above\n\n---\n\nbelow');
    // Fewer than 3 characters → not an HR; removed by the no-word-char rule instead.
    expect(normalizeText('above\n\n--\n\nbelow')).to.equal('above\n\nbelow');
  });

  test('removes lines without word characters', ({ expect }) => {
    // Junk separator lines collapse; paragraphs remain separated by one blank line.
    expect(normalizeText('above\n\n****\n\nbelow')).to.equal('above\n\nbelow');
    expect(normalizeText('above\n,,,,\n~~~~\nbelow')).to.equal('above\n\nbelow');
    // The `---` HR we insert is preserved through the no-word-char pass.
    expect(normalizeText('above\n\n---\n\n***\n\nbelow')).to.equal('above\n\n---\n\nbelow');
  });

  test('trims trailing whitespace from each line', ({ expect }) => {
    expect(normalizeText('aaa   \nbbb\t\nccc')).to.equal('aaa\nbbb\nccc');
    expect(normalizeText('aaa  \nbbb')).to.equal('aaa\nbbb');
  });

  test('trims trailing invisible padding from a content line', ({ expect }) => {
    // Newsletter padding tacked onto the end of a real content line must be stripped, leaving the
    // text intact: combining grapheme joiner, ZWNJ, figure space, NBSP, soft hyphen.
    const CGJ = '͏';
    const ZWNJ = '‌';
    const FIG = ' ';
    const NBSP = ' ';
    const SHY = '­';
    const padding = `${CGJ}${FIG}${ZWNJ}${NBSP}${SHY}`.repeat(20);
    expect(normalizeText(`Delivered: 3 more items${padding}`)).to.equal('Delivered: 3 more items');
    // Each listed character, alone at end-of-line, is trimmed.
    for (const ch of [CGJ, ZWNJ, FIG, NBSP, SHY]) {
      expect(normalizeText(`text${ch}`)).to.equal('text');
    }
  });

  test('strips trailing invisible characters from each line', ({ expect }) => {
    // Zero-width space, soft hyphen, word joiner, combining grapheme joiner, ZWNBSP — the invisible
    // chars that `.trim()` and the visible-whitespace pass leave behind when they trail visible text.
    expect(normalizeText('aaa​​\nbbb')).to.equal('aaa\nbbb');
    expect(normalizeText('word­')).to.equal('word');
    expect(normalizeText('a⁠﻿\nb͏')).to.equal('a\nb');
    expect(normalizeText('mixed ​  \nnext')).to.equal('mixed\nnext');
  });

  test('collapses multiple blank lines in plain text', ({ expect }) => {
    // Three or more blank lines between text → one blank line.
    expect(normalizeText('aaa\n\n\n\nbbb')).to.equal('aaa\n\nbbb');
    // Whitespace-only lines also count as blank.
    expect(normalizeText('aaa\n   \n\n   \nbbb')).to.equal('aaa\n\nbbb');
    // One blank line is preserved unchanged.
    expect(normalizeText('aaa\n\nbbb')).to.equal('aaa\n\nbbb');
    // No blank line is preserved unchanged.
    expect(normalizeText('aaa\nbbb')).to.equal('aaa\nbbb');
  });

  describe('anchors', () => {
    test('keeps a normal inline link', ({ expect }) => {
      expect(normalizeText('<p>see <a href="https://example.com/docs">the docs</a> now</p>')).to.equal(
        'see [the docs](https://example.com/docs) now',
      );
    });

    test('keeps a single-line anchor as a link even when the href is an opaque redirect', ({ expect }) => {
      // CTA buttons (e.g. "Go to Notion →") link through ESP tracking redirects; the link must be
      // preserved — the opaque URL is hidden in rendered Markdown.
      const html = '<p><a href="https://mg.mail.notion.so/c/eJxMj01uwyAQ_DROUS">Go to Notion</a></p>';
      expect(normalizeText(html)).to.equal('[Go to Notion](https://mg.mail.notion.so/c/eJxMj01uwyAQ_DROUS)');
    });

    test('escapes link-breaking characters in text and href', ({ expect }) => {
      // `]` in the label and `)` in the URL would otherwise terminate the link syntax early.
      const html = '<p><a href="https://example.com/a(b)c">label [x]</a></p>';
      expect(normalizeText(html)).to.equal('[label \\[x\\]](https://example.com/a\\(b\\)c)');
    });

    test('unwraps an anchor that wraps block-level content', ({ expect }) => {
      // Notion wraps each "card" in an <a> containing block divs; an inline link cannot represent
      // multi-paragraph content, so the wrapper is dropped and the content preserved.
      const html = '<a href="https://example.com/x"><div><p>First line.</p><p>Second line.</p></div></a>';
      expect(normalizeText(html)).to.equal('First line.\n\nSecond line.');
    });

    test('unwraps an empty anchor', ({ expect }) => {
      expect(normalizeText('<p>a<a href="https://example.com/x"></a>b</p>')).to.equal('ab');
    });

    test('unwraps an anchor with no href', ({ expect }) => {
      expect(normalizeText('<p><a>bare text</a></p>')).to.equal('bare text');
    });

    test('puts adjacent display:block anchors on their own lines', ({ expect }) => {
      // Stacked email CTA rows are inline <a> with display:block; without forced line breaks turndown
      // concatenates them into one run.
      const html =
        '<a href="https://example.com/1" style="display: block">First</a>' +
        '<a href="https://example.com/2" style="display: block">Second</a>';
      expect(normalizeText(html)).to.equal('[First](https://example.com/1)\n\n[Second](https://example.com/2)');
    });
  });

  describe('images', () => {
    test('keeps a content image', ({ expect }) => {
      expect(normalizeText('<p><img src="https://example.com/a.png" alt="logo"/></p>')).to.equal(
        '![logo](https://example.com/a.png)',
      );
    });

    test('drops a 1x1 tracking beacon', ({ expect }) => {
      const html = '<p>body</p><img width="1" height="1" alt="" src="https://mg.mail.notion.so/o/eJxMz0tqwz"/>';
      expect(normalizeText(html)).to.equal('body');
    });
  });

  describe('residual tags', () => {
    test('strips MS Office namespaced tags', ({ expect }) => {
      // <o:p>...</o:p> is the most common turndown leftover from Outlook emails.
      expect(normalizeText('<p>Hello<o:p></o:p>world</p>')).to.equal('Helloworld');
      // Self-closing namespaced tag (VML shape).
      expect(normalizeText('<p>before<v:shape id="x"/>after</p>')).to.equal('beforeafter');
      // <w:...> (Word) and <m:...> (math) variants.
      expect(normalizeText('<p>a<w:WordDocument/>b<m:mathPr/>c</p>')).to.equal('abc');
    });

    test('strips MS Office conditional comments', ({ expect }) => {
      expect(normalizeText('<!--[if mso]><p>hidden</p><![endif]-->visible')).to.equal('visible');
      expect(normalizeText('before<!--[if gte mso 9]>junk<![endif]-->after')).to.equal('beforeafter');
    });

    test('strips stray inline tags that survive turndown', ({ expect }) => {
      // turndown leaves attribute-laden spans/fonts in some edge cases.
      expect(normalizeText('<p>hello <span style="color:red">world</span></p>')).to.equal('hello world');
      expect(normalizeText('<p><font face="Arial">text</font></p>')).to.equal('text');
    });

    test('preserves text when stripping tags', ({ expect }) => {
      // The closing tag without a matching opener must not eat surrounding text.
      expect(normalizeText('keep this </o:p> and this')).to.equal('keep this  and this');
    });

    test('preserves literal angle-bracketed inline tags in plaintext', ({ expect }) => {
      // Plaintext bodies that mention <font>/<u> literally must NOT be stripped — they're
      // meaningful content, not residual HTML noise. The generic inline-tag pass only runs on
      // HTML-converted text. Note: <div>/<span> trigger HTML detection upstream so they hit
      // the HTML pipeline; this test covers tags that escape isHTML().
      expect(normalizeText('Set <font> tags are deprecated.')).to.equal('Set <font> tags are deprecated.');
      expect(normalizeText('Press <u>OK</u> to confirm.')).to.equal('Press <u>OK</u> to confirm.');
    });

    test('handles namespaced tags inside plaintext (non-HTML) input', ({ expect }) => {
      // Some Gmail plaintext bodies contain HTML fragments inline; we still want them cleaned.
      // Input has no recognized HTML tags so isHTML() is false, but residual tags must still be stripped.
      // Trailing whitespace from the stripped tag location is trimmed by stripWhitespace().
      expect(normalizeText('Meeting reminder <o:p></o:p>\n\nDetails below.')).to.equal(
        'Meeting reminder\n\nDetails below.',
      );
    });
  });

  describe('blank line collapsing (extended)', () => {
    test('collapses blank lines that appear after residual-tag removal', ({ expect }) => {
      // The <o:p></o:p> sits between content, leaving an effectively-empty line after strip.
      // Pipeline must end with exactly one blank line between the two paragraphs.
      expect(normalizeText('aaa\n<o:p></o:p>\n\n\nbbb')).to.equal('aaa\n\nbbb');
    });

    test('HTML <br><br><br> sequence collapses to a single blank line', ({ expect }) => {
      // Outlook-style "many <br>" between paragraphs must end up as one blank line, not several.
      expect(normalizeText('<p>a</p><br><br><br><p>b</p>')).to.equal('a\n\nb');
    });

    test('strips leading and trailing blank lines from whole document', ({ expect }) => {
      // Leading/trailing blank lines (with whitespace) must be removed entirely.
      expect(normalizeText('\n\n   \naaa\nbbb\n\n   \n\n')).to.equal('aaa\nbbb');
    });

    test('a single blank line is preserved across HTML pipeline', ({ expect }) => {
      // Two paragraphs separated by a single empty paragraph → one blank line.
      expect(normalizeText('<p>a</p><p></p><p>b</p>')).to.equal('a\n\nb');
    });

    test('strips newsletter preheader padding (invisible whitespace)', ({ expect }) => {
      // Substack-style preheader: a real preview line followed by a line of
      // U+00AD (soft hyphen), U+034F (combining grapheme joiner), and spaces
      // used to push preview text out of the inbox list view.
      const padding = '­͏     '.repeat(10);
      expect(normalizeText(`Watch now\n\n${padding}\n\nForwarded this email?`)).to.equal(
        'Watch now\n\nForwarded this email?',
      );
    });

    test('blanks lines containing only zero-width characters', ({ expect }) => {
      // ZWSP, ZWNJ, ZWJ, word joiner, BOM/ZWNBSP — all invisible padding.
      // The blanked middle line collapses with its neighboring newlines into
      // a single blank line between aaa and bbb.
      expect(normalizeText('aaa\n​‌‍⁠﻿\nbbb')).to.equal('aaa\n\nbbb');
    });
  });

  describe('blockquotes stay contiguous', () => {
    test('HTML blockquote paragraphs do not gain blank lines between quoted lines', ({ expect }) => {
      // Turndown prefixes every blockquote line with `> `; the paragraph break must not become a
      // blank line between the two quoted lines.
      const html = '<blockquote><p>Hello Hello.</p><p>I am resending this since you missed it.</p></blockquote>';
      expect(normalizeText(html)).to.equal('> Hello Hello.\n> I am resending this since you missed it.');
    });

    test('plaintext quotes separated by blank lines are rejoined', ({ expect }) => {
      expect(normalizeText('> Hello Hello.\n\n> I am resending this since you missed it.')).to.equal(
        '> Hello Hello.\n> I am resending this since you missed it.',
      );
    });

    test('blank line between a quote and following body text is preserved', ({ expect }) => {
      // Only blank lines *between* two quoted lines collapse; a quote→body break stays.
      expect(normalizeText('> quoted line\n\nMy reply.')).to.equal('> quoted line\n\nMy reply.');
    });

    test('non-quoted paragraphs keep their blank-line separation', ({ expect }) => {
      expect(normalizeText('above\n\nbelow')).to.equal('above\n\nbelow');
    });
  });
});
