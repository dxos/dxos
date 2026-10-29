//
// Copyright 2026 DXOS.org
//

// V8 stores a module's source at one byte per character only while every character fits Latin-1; one character
// above U+00FF makes it store the whole module at two bytes per character, and workerd keeps every uploaded module's
// source in memory for the isolate's life. Comments, display strings, templates and JSX get the ASCII spelling of their
// punctuation, which reads the same. A literal that is compared or matched against other text (`===`, `split`,
// `replace`, a Map key) keeps its exact value through an escape, as does a character with no ASCII spelling (a
// substitution in a tagged template, whose tag may read the raw text). Regular expressions always get escapes, since
// `-` or `.` would change what they match.

const WIDE = /[\u{100}-\u{10FFFF}]/u;
const WIDE_ALL = /[\u{100}-\u{10FFFF}]/gu;

const hex = (code) => code.toString(16).toUpperCase().padStart(4, '0');

/** ASCII spellings for comments, by code point. */
const COMMENT_ASCII = new Map([
  ...[0x2014, 0x2013, 0x2012, 0x2011, 0x2010, 0x2212, 0x2015, 0x2043, 0x2e3a].map((code) => [code, '-']),
  ...[0x2018, 0x2019, 0x201a, 0x201b, 0x2032].map((code) => [code, "'"]),
  ...[0x201c, 0x201d, 0x201e, 0x201f, 0x2033].map((code) => [code, '"']),
  ...[0x2022, 0x25cf, 0x25c6, 0x25c7, 0x25aa, 0x22c5, 0x2219].map((code) => [code, '*']),
  ...[0x2009, 0x200a, 0x2002, 0x2003, 0x202f, 0x2007, 0x2008].map((code) => [code, ' ']),
  ...[0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0xfe0f, 0xfe0e].map((code) => [code, '']),
  [0x2026, '...'],
  [0x2192, '->'],
  [0x2190, '<-'],
  [0x2194, '<->'],
  [0x21d2, '=>'],
  [0x21d0, '<='],
  [0x21d4, '<=>'],
  [0x27f6, '-->'],
  [0x27f5, '<--'],
  [0x21a6, '|->'],
  [0x21b3, '->'],
  [0x21c4, '<->'],
  [0x2191, '^'],
  [0x2193, 'v'],
  [0x2196, '^'],
  [0x2197, '^'],
  [0x2198, 'v'],
  [0x2199, 'v'],
  [0x27eb, '>>'],
  [0x27ea, '<<'],
  [0x203a, '>'],
  [0x2039, '<'],
  [0x2264, '<='],
  [0x2265, '>='],
  [0x2260, '!='],
  [0x2248, '~'],
  [0x223c, '~'],
  [0x2272, '<~'],
  [0x2273, '>~'],
  [0x2261, '=='],
  [0x221e, 'infinity'],
  [0x2208, 'in'],
  [0x2209, 'not in'],
  [0x2227, 'and'],
  [0x2228, 'or'],
  [0x2200, 'for all'],
  [0x2205, 'empty'],
  [0x2211, 'sum'],
  [0x221a, 'sqrt'],
  [0x2229, 'intersect'],
  [0x222a, 'union'],
  [0x2282, 'subset of'],
  [0x2286, 'subset of'],
  [0x2218, 'o'],
  [0x2295, '(+)'],
  [0x2296, '(-)'],
  [0x229e, '[+]'],
  [0x22ee, ':'],
  [0x25cb, 'o'],
  [0x25a0, '#'],
  [0x25a1, '[ ]'],
  [0x2588, '#'],
  [0x2591, '.'],
  [0x2592, ':'],
  [0x2593, '#'],
  [0x25b6, '>'],
  [0x25b8, '>'],
  [0x25ba, '>'],
  [0x25c0, '<'],
  [0x25c2, '<'],
  [0x25b2, '^'],
  [0x25b4, '^'],
  [0x25bc, 'v'],
  [0x25be, 'v'],
  [0x2713, 'OK'],
  [0x2714, 'OK'],
  [0x2705, 'OK'],
  [0x2717, 'X'],
  [0x2718, 'X'],
  [0x274c, 'X'],
  [0x2715, 'x'],
  [0x2716, 'x'],
  [0x26a0, 'Warning:'],
  [0x2139, 'Note:'],
  [0x2318, 'Cmd'],
  [0x21e7, 'Shift'],
  [0x2325, 'Alt'],
  [0x2303, 'Ctrl'],
  [0x21b5, 'Enter'],
  [0x23ce, 'Enter'],
  [0x232b, 'Backspace'],
  [0x21e5, 'Tab'],
  [0x2423, 'Space'],
  [0x23f1, 'timer'],
  [0x23e9, '>>'],
  [0x23bf, '|_'],
  [0x0394, 'Delta'],
  [0x03b4, 'delta'],
  [0x03b1, 'alpha'],
  [0x03b2, 'beta'],
  [0x03b3, 'gamma'],
  [0x0393, 'Gamma'],
  [0x03bb, 'lambda'],
  [0x03bc, 'u'],
  [0x03c0, 'pi'],
  [0x03c3, 'sigma'],
  [0x03a3, 'Sigma'],
  [0x03b5, 'epsilon'],
  [0x03b8, 'theta'],
  [0x03c9, 'omega'],
  [0x207f, '^n'],
  [0x1d40, '^T'],
  [0x2116, 'No.'],
  [0x2122, '(TM)'],
  [0x2030, 'per mille'],
  [0x2020, '+'],
  [0x2021, '++'],
]);

/** Box drawing (U+2500-U+257F) keeps its one-column width, so a diagram in a comment stays aligned. */
const HORIZONTAL = new Set([
  0x2500, 0x2501, 0x2504, 0x2505, 0x2508, 0x2509, 0x254c, 0x254d, 0x2550, 0x2574, 0x2576, 0x2578, 0x257a, 0x257c,
  0x257e,
]);
const VERTICAL = new Set([
  0x2502, 0x2503, 0x2506, 0x2507, 0x250a, 0x250b, 0x254e, 0x254f, 0x2551, 0x2575, 0x2577, 0x2579, 0x257b, 0x257d,
  0x257f,
]);

const stringEscape = (char) => {
  const code = char.codePointAt(0);
  return code > 0xffff ? `\\u{${hex(code)}}` : `\\u${hex(code)}`;
};

/** The ASCII spelling of a symbol, or undefined for text in another script or an emoji. */
const symbolAscii = (char) => {
  const code = char.codePointAt(0);
  if (code >= 0x2500 && code <= 0x257f) {
    return HORIZONTAL.has(code) ? '-' : VERTICAL.has(code) ? '|' : '+';
  }
  if (code >= 0x2460 && code <= 0x2473) {
    return `(${code - 0x245f})`;
  }
  if (code === 0x24ea) {
    return '(0)';
  }
  return COMMENT_ASCII.get(code);
};

// Example text in another script, or an emoji, keeps its meaning spelled as an escape.
const commentAscii = (char) => symbolAscii(char) ?? stringEscape(char);

/** ASCII spellings of typographic punctuation in prose literals, where the reader sees the same text. */
const PROSE_ASCII = new Map([
  ...[0x2014, 0x2013, 0x2012, 0x2011, 0x2010, 0x2212, 0x2015, 0x2043].map((code) => [code, '-']),
  ...[0x2018, 0x2019, 0x201a, 0x201b, 0x2032].map((code) => [code, "'"]),
  ...[0x201c, 0x201d, 0x201e, 0x201f, 0x2033].map((code) => [code, '"']),
  ...[0x2022, 0x25cf].map((code) => [code, '*']),
  ...[0x2009, 0x200a, 0x2002, 0x2003, 0x202f, 0x2007, 0x2008].map((code) => [code, ' ']),
  [0x2026, '...'],
  [0x2192, '->'],
  [0x2190, '<-'],
  [0x2194, '<->'],
  [0x21d2, '=>'],
  [0x2264, '<='],
  [0x2265, '>='],
  [0x2260, '!='],
  [0x2248, '~'],
]);

/** Positions that hold text a person reads; a regular expression is never one, since `-` or `.` changes the match. */
const PROSE_MODES = new Set(['comment', 'string', 'substitution', 'jsx-text', 'jsx-attr']);

/**
 * Prose spelling; JSX text cannot hold `<`, `>`, `{` or `}` raw, so there it goes in an expression container. `...` is
 * longer than the character it replaces, so it is not used where `measured` marks truncation code that counts it.
 */
const proseAscii = (char, mode, measured, loose) => {
  const code = char.codePointAt(0);
  if (code === 0x2026 && measured) {
    return undefined;
  }
  const ascii = loose ? symbolAscii(char) : PROSE_ASCII.get(code);
  return ascii !== undefined && mode === 'jsx-text' && /[<>{}]/.test(ascii) ? `{'${ascii}'}` : ascii;
};

const regexEscape = (char, unicodeFlag) => {
  const code = char.codePointAt(0);
  if (code <= 0xffff) {
    return `\\u${hex(code)}`;
  }
  if (unicodeFlag) {
    return `\\u{${hex(code)}}`;
  }
  // Without the u flag a pattern matches UTF-16 code units, so the surrogate pair is the same pattern.
  return `\\u${hex(char.charCodeAt(0))}\\u${hex(char.charCodeAt(1))}`;
};

const REPLACE = {
  'comment': commentAscii,
  'string': stringEscape,
  'substitution': (char) => `\${'${stringEscape(char)}'}`,
  'regex': (char) => regexEscape(char, false),
  'regex-u': (char) => regexEscape(char, true),
  'jsx-text': (char) => `&#x${hex(char.codePointAt(0))};`,
  'jsx-attr': (char) => `&#x${hex(char.codePointAt(0))};`,
};

/** An object key spelled as an identifier is quoted, so it can carry escapes and still name the same property. */
const quoteKey = (name) => `'${name.replace(WIDE_ALL, stringEscape)}'`;

const KIND = {
  'comment': 'a comment',
  'string': 'a string',
  'substitution': 'a tagged template',
  'regex': 'a regular expression',
  'regex-u': 'a regular expression',
  'jsx-text': 'JSX text',
  'jsx-attr': 'a JSX attribute',
  'key': 'a property name',
};

/** Keeps an ASCII spelling from closing the literal it sits in. */
const guardQuote = (ascii, mode, quote) => {
  if (!quote || !ascii.includes(quote)) {
    return ascii;
  }
  // JSX attributes have no backslash escapes, only entities.
  return ascii.replaceAll(quote, mode === 'jsx-attr' ? (quote === '"' ? '&quot;' : '&apos;') : `\\${quote}`);
};

/**
 * Rewrites every character above U+00FF in `text` for its position. Display text takes ASCII punctuation; `exact`
 * marks a literal that is compared or matched against other text, which keeps its value through an escape, and
 * `measured` marks text that truncation code counts. `loose` marks code outside production, where every symbol takes
 * its ASCII spelling. `quote` is the delimiter of the enclosing string literal or JSX attribute.
 */
export const toLatin1 = (text, mode, { exact = false, measured = false, loose = false, quote } = {}) =>
  text.replace(WIDE_ALL, (char) => {
    const ascii =
      (exact && !loose) || !PROSE_MODES.has(mode) ? undefined : proseAscii(char, mode, measured && !loose, loose);
    return ascii === undefined ? REPLACE[mode](char) : guardQuote(ascii, mode, quote);
  });

/** Methods whose string argument is matched against other text, so its exact characters matter. */
const MATCHING_METHODS = new Set([
  'replace',
  'replaceAll',
  'split',
  'includes',
  'startsWith',
  'endsWith',
  'indexOf',
  'lastIndexOf',
  'match',
  'matchAll',
  'search',
  'has',
  'get',
  'set',
  'delete',
]);

/** The text of a string literal or of a template's fixed parts. */
const textOf = (node) =>
  node.type === 'TemplateLiteral'
    ? node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('')
    : String(node.value);

/** Whether a literal (or template) is compared or matched against other text, or is a glyph, rather than prose. */
const isExact = (node) => {
  // Text without a letter or digit is a glyph (a key label, a status icon), not a sentence; a template with
  // substitutions, or a `join` separator, is part of a sentence assembled around them.
  // A dash or a quote has a one-character ASCII twin, so only a symbol whose spelling differs (an arrow) is kept.
  const separator =
    node.parent?.type === 'CallExpression' &&
    node.parent.callee.type === 'MemberExpression' &&
    node.parent.callee.property.name === 'join';
  const assembled = separator || (node.type === 'TemplateLiteral' && node.expressions.length > 0);
  const glyph = (value) =>
    !/[A-Za-z0-9]/.test(value) &&
    [...value].some((char) => WIDE.test(char) && PROSE_ASCII.get(char.codePointAt(0))?.length !== 1);
  if (!assembled && glyph(textOf(node))) {
    return true;
  }
  const parent = node.parent;
  if (!parent) {
    return false;
  }
  switch (parent.type) {
    case 'BinaryExpression':
      return ['===', '!==', '==', '!='].includes(parent.operator);
    case 'SwitchCase':
      return parent.test === node;
    case 'Property':
      return parent.key === node;
    case 'CallExpression':
    case 'NewExpression': {
      if (!parent.arguments.includes(node)) {
        return false;
      }
      const callee = parent.callee;
      return (
        (callee.type === 'Identifier' && callee.name === 'RegExp') ||
        (callee.type === 'MemberExpression' && !callee.computed && MATCHING_METHODS.has(callee.property.name))
      );
    }
    default:
      return false;
  }
};

/** Calls whose string argument is a test title. */
const TEST_CALLS = new Set(['test', 'it', 'describe', 'suite', 'bench']);

/** Objects whose methods write a log line. */
const LOGGERS = new Set(['console', 'log']);

const calleeName = (callee) =>
  callee.type === 'Identifier'
    ? callee.name
    : callee.type === 'MemberExpression' && callee.object.type === 'Identifier'
      ? callee.object.name
      : undefined;

/** Whether a literal (or template) is text only a person reads: a log line, an error message or a test title. */
const isMessage = (node) => {
  let child = node;
  let parent = node.parent;
  // A message is often assembled with `+` or a conditional before it reaches the call.
  while (
    parent &&
    (parent.type === 'ConditionalExpression' || (parent.type === 'BinaryExpression' && parent.operator === '+'))
  ) {
    child = parent;
    parent = parent.parent;
  }
  if (
    !parent ||
    (parent.type !== 'CallExpression' && parent.type !== 'NewExpression') ||
    !parent.arguments.includes(child)
  ) {
    return false;
  }
  const name = calleeName(parent.callee);
  if (name === undefined) {
    return false;
  }
  if (parent.type === 'NewExpression') {
    return name.endsWith('Error');
  }
  return (
    TEST_CALLS.has(name) || name === 'invariant' || (parent.callee.type === 'MemberExpression' && LOGGERS.has(name))
  );
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'keep source at or below U+00FF so V8 holds each module at one byte per character',
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          // Code outside production (tests, scripts, experiments): the suggestion gives every symbol its ASCII spelling.
          loose: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      wide: 'U+{{code}} in {{kind}} makes V8 hold this whole module at two bytes per character; write {{replacement}} instead.',
      code: 'U+{{code}} outside a comment or literal makes V8 hold this whole module at two bytes per character; rename it.',
      rewrite: 'Rewrite to Latin-1.',
    },
  },
  create: (context) => {
    const loose = context.options[0]?.loose === true;
    const sourceCode = context.sourceCode;
    const text = sourceCode.text;
    if (!WIDE.test(text)) {
      return {};
    }

    const spans = [];
    const rangeOf = (node) => node.range ?? [node.start, node.end];
    const add = (node, mode, { exact = false, measured = false } = {}) =>
      spans.push({ range: rangeOf(node), mode, exact, measured });

    /** Whether the expression around a literal truncates text (`slice`), so the literal's length counts. */
    const isMeasured = (node) => {
      let top = node;
      while (
        top.parent &&
        ['ConditionalExpression', 'BinaryExpression', 'LogicalExpression', 'TemplateLiteral'].includes(top.parent.type)
      ) {
        top = top.parent;
      }
      const [start, end] = rangeOf(top);
      return /\.(slice|substring|substr)\(/.test(text.slice(start, end));
    };

    // Comments and template text have no delimiter an ASCII quote could close.
    const quoteOf = (slice, mode) =>
      (mode === 'string' || mode === 'jsx-attr') && /^['"]/.test(slice) ? slice[0] : undefined;

    const report = ({ range: [start, end], mode, exact, measured }) => {
      const slice = text.slice(start, end);
      const offset = slice.search(WIDE);
      if (offset < 0) {
        return;
      }
      const options = { exact, measured, loose, quote: quoteOf(slice, mode) };
      const rewrite = (value) => (mode === 'key' ? quoteKey(value) : toLatin1(value, mode, options));
      const char = String.fromCodePoint(slice.codePointAt(offset));
      // No autofix: a rewrite can change a value code depends on, so the author picks the Latin-1 spelling.
      context.report({
        loc: sourceCode.getLocFromIndex(start + offset),
        messageId: 'wide',
        data: { code: hex(char.codePointAt(0)), kind: KIND[mode], replacement: rewrite(char) },
        suggest: [{ messageId: 'rewrite', fix: (fixer) => fixer.replaceTextRange([start, end], rewrite(slice)) }],
      });
    };

    return {
      'Literal': (node) => {
        if (node.regex) {
          add(node, /[uv]/.test(node.regex.flags) ? 'regex-u' : 'regex');
        } else if (typeof node.value === 'string') {
          // A message is only read, so even a glyph in it takes ASCII.
          const message = isMessage(node);
          add(node, node.parent?.type === 'JSXAttribute' ? 'jsx-attr' : 'string', {
            exact: !message && isExact(node),
            measured: !message && isMeasured(node),
          });
        }
      },
      'TemplateElement': (node) => {
        const template = node.parent;
        const tagged = template?.parent?.type === 'TaggedTemplateExpression' && template.parent.quasi === template;
        const message = tagged || isMessage(template);
        add(node, tagged ? 'substitution' : 'string', {
          exact: !message && isExact(template),
          measured: !message && isMeasured(template),
        });
      },
      'JSXText': (node) => add(node, 'jsx-text'),
      'Property': (node) => {
        if (
          node.key?.type === 'Identifier' &&
          !node.computed &&
          !node.shorthand &&
          !node.method &&
          WIDE.test(node.key.name)
        ) {
          add(node.key, 'key');
        }
      },
      'Program:exit': () => {
        for (const comment of sourceCode.getAllComments()) {
          spans.push({ range: rangeOf(comment), mode: 'comment' });
        }
        spans.forEach(report);

        // Anything left sits in code (an identifier), where no rewrite keeps the program the same.
        const covered = spans.map(({ range }) => range);
        for (const match of text.matchAll(WIDE_ALL)) {
          if (!covered.some(([start, end]) => match.index >= start && match.index < end)) {
            context.report({
              loc: sourceCode.getLocFromIndex(match.index),
              messageId: 'code',
              data: { code: hex(match[0].codePointAt(0)) },
            });
          }
        }
      },
    };
  },
};
