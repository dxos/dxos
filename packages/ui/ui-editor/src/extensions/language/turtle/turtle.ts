//
// Copyright 2026 DXOS.org
//

import { LanguageSupport, StreamLanguage, type StringStream } from '@codemirror/language';
import { type Highlighter, type Tag, highlightCode, tags } from '@lezer/highlight';

/** Token names emitted by the tokenizer, mapped to standard tags so the editor's highlight style colours them. */
const tokenTable = {
  comment: tags.lineComment,
  // `@prefix`, `@base`, `PREFIX`, `BASE`, `GRAPH` and `a` (`rdf:type`).
  keyword: tags.keyword,
  iri: tags.url,
  // The `sx` of `sx:quote`; the local name after the colon is the `name`.
  prefix: tags.namespace,
  name: tags.propertyName,
  blank: tags.special(tags.variableName),
  string: tags.string,
  language: tags.annotation,
  datatype: tags.typeOperator,
  number: tags.number,
  bool: tags.bool,
  terminator: tags.punctuation,
  separator: tags.separator,
  bracket: tags.squareBracket,
  paren: tags.paren,
  // TriG's graph blocks.
  brace: tags.brace,
  invalid: tags.invalid,
} satisfies Record<string, Tag>;

export type TurtleToken = keyof typeof tokenTable;

type TurtleState = {
  /** The delimiter of a long string (`"""` or `'''`) that spans lines. */
  long?: string;
  /** The last token was a prefix, so a local name follows directly, even one a number would otherwise claim. */
  local: boolean;
};

const PUNCTUATION: Record<string, TurtleToken | undefined> = {
  '.': 'terminator',
  ';': 'separator',
  ',': 'separator',
  '[': 'bracket',
  ']': 'bracket',
  '(': 'paren',
  ')': 'paren',
  '{': 'brace',
  '}': 'brace',
};

const KEYWORDS = /^(?:PREFIX|BASE|GRAPH)\b/i;
// PN_PREFIX ':' PN_LOCAL, loosely: a local name may hold dots and dashes but does not end in a dot.
const PREFIXED_NAME = /^([A-Za-z][\w.-]*)?:/;
const LOCAL_NAME = /^(?:[\w\-%]|\.(?=[\w\-%]))+/;

const skipLongString = (stream: StringStream, state: TurtleState): TurtleToken => {
  const delimiter = state.long ?? '"""';
  if (stream.skipTo(delimiter)) {
    stream.pos += delimiter.length;
    state.long = undefined;
  } else {
    stream.skipToEnd();
  }
  return 'string';
};

const token = (stream: StringStream, state: TurtleState): TurtleToken | null => {
  if (state.long) {
    return skipLongString(stream, state);
  }
  if (state.local) {
    state.local = false;
    if (stream.match(LOCAL_NAME)) {
      return 'name';
    }
  }
  if (stream.eatSpace()) {
    return null;
  }
  if (stream.match('#')) {
    stream.skipToEnd();
    return 'comment';
  }

  const long = stream.match('"""') ? '"""' : stream.match("'''") ? "'''" : undefined;
  if (long) {
    state.long = long;
    return skipLongString(stream, state);
  }
  const quote = stream.peek();
  if (quote === '"' || quote === "'") {
    stream.next();
    let escaped = false;
    let char: string | void;
    while ((char = stream.next()) != null) {
      if (char === quote && !escaped) {
        return 'string';
      }
      escaped = !escaped && char === '\\';
    }
    return 'invalid';
  }

  if (stream.match(/^<[^<>"{}|^`\\\s]*>/)) {
    return 'iri';
  }
  if (stream.match(/^@(?:prefix|base)\b/)) {
    return 'keyword';
  }
  // A language tag follows its string directly (`"Founder"@en`).
  if (stream.match(/^@[A-Za-z]+(?:-[A-Za-z0-9]+)*/)) {
    return 'language';
  }
  if (stream.match('^^')) {
    return 'datatype';
  }
  if (stream.match(/^_:[\w.-]*\w/)) {
    return 'blank';
  }
  if (stream.match(/^[+-]?(?:\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/)) {
    return 'number';
  }
  if (stream.match(/^(?:true|false)\b/)) {
    return 'bool';
  }
  if (stream.match(KEYWORDS)) {
    return 'keyword';
  }
  if (stream.match(/^a(?=[\s<[(_"'])/)) {
    return 'keyword';
  }
  if (stream.match(PREFIXED_NAME)) {
    // The prefix and its colon; the local name, if any, is the next token.
    state.local = true;
    return 'prefix';
  }
  if (stream.match(LOCAL_NAME)) {
    return 'name';
  }

  const char = stream.next();
  return (char ? PUNCTUATION[char] : undefined) ?? 'invalid';
};

/** RDF 1.1 Turtle, and TriG's `{ ... }` graph blocks, which Turtle's tokens cover otherwise. */
export const turtleLanguage = StreamLanguage.define<TurtleState>({
  name: 'turtle',
  startState: () => ({ local: false }),
  copyState: (state) => ({ ...state }),
  token,
  tokenTable,
  languageData: {
    commentTokens: { line: '#' },
    closeBrackets: { brackets: ['(', '[', '{', '"', "'", '<'] },
  },
});

/** Turtle (and TriG) language support; pair with the theme's syntax highlighting to colour it. */
export const turtle = (): LanguageSupport => new LanguageSupport(turtleLanguage);

/** A run of source text and the classes the highlighter gave it (empty when unstyled). */
export type HighlightedSpan = { text: string; classes: string };

/**
 * Highlights Turtle or TriG without an editor, one array of spans per line, for read-only snippets where mounting
 * a CodeMirror view per snippet would cost too much.
 */
export const highlightTurtle = (
  source: string,
  highlighter: Highlighter | readonly Highlighter[],
): HighlightedSpan[][] => {
  const lines: HighlightedSpan[][] = [[]];
  highlightCode(
    source,
    turtleLanguage.parser.parse(source),
    highlighter,
    (text, classes) => lines[lines.length - 1].push({ text, classes }),
    () => lines.push([]),
  );
  return lines;
};
