//
// Copyright 2026 DXOS.org
//

import { LanguageSupport, StreamLanguage, type StringStream } from '@codemirror/language';
import { type Tag, tags } from '@lezer/highlight';

//
// Token rules mirror `@dxos/datalog`'s lexer (`packages/common/datalog/src/internal/lexer.ts`) so the editor colours
// exactly what the parser reads; that package stays free of CodeMirror, so the tokenizer is restated here.
//

/** Token names emitted by the tokenizer, mapped to standard tags so the editor's highlight style colours them. */
const tokenTable = {
  lineComment: tags.lineComment,
  blockComment: tags.blockComment,
  string: tags.string,
  number: tags.number,
  // A digit run glued to letters (`2d`) is a symbol to the lexer, but reads as a quantity.
  duration: tags.special(tags.number),
  variable: tags.variableName,
  // The predicate a clause defines.
  head: tags.definition(tags.function(tags.variableName)),
  predicate: tags.function(tags.variableName),
  atom: tags.atom,
  negation: tags.operatorKeyword,
  aggregate: tags.keyword,
  definition: tags.definitionOperator,
  compare: tags.compareOperator,
  separator: tags.separator,
  terminator: tags.punctuation,
  paren: tags.paren,
  brace: tags.brace,
  invalid: tags.invalid,
} satisfies Record<string, Tag>;

export type DatalogToken = keyof typeof tokenTable;

type DatalogState = {
  /** Inside a `/* … *\/` comment that spans lines. */
  comment: boolean;
  /** No predicate yet in the current clause, so the next one is its head. */
  head: boolean;
};

const AGGREGATES = new Set(['count', 'min', 'max', 'sum']);

const PUNCTUATION: Record<string, DatalogToken | undefined> = {
  ',': 'separator',
  '.': 'terminator',
  '(': 'paren',
  ')': 'paren',
  '{': 'brace',
  '}': 'brace',
  '!': 'negation',
  ':': 'aggregate',
};

const skipBlockComment = (stream: StringStream, state: DatalogState): DatalogToken => {
  state.comment = !stream.skipTo('*/');
  if (state.comment) {
    stream.skipToEnd();
  } else {
    stream.pos += 2;
  }
  return 'blockComment';
};

const token = (stream: StringStream, state: DatalogState): DatalogToken | null => {
  if (state.comment) {
    return skipBlockComment(stream, state);
  }
  if (stream.eatSpace()) {
    return null;
  }
  if (stream.match('%') || stream.match('//')) {
    stream.skipToEnd();
    return 'lineComment';
  }
  if (stream.match('/*')) {
    return skipBlockComment(stream, state);
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
    // The lexer rejects a string left open at the end of the line.
    return 'invalid';
  }

  if (stream.match(/^-?\d+(\.\d+)?(?![A-Za-z_\d])/)) {
    return 'number';
  }
  const word = stream.match(/^[A-Za-z0-9_][A-Za-z0-9_]*/);
  if (word && typeof word !== 'boolean') {
    const text = word[0];
    if (/^\d/.test(text)) {
      return 'duration';
    }
    if (/^[A-Z_]/.test(text)) {
      return 'variable';
    }
    // The parser reads `not` as negation unless it is itself a rule head (`not :- …`).
    if (text === 'not' && !stream.match(/^\s*:-/, false)) {
      return 'negation';
    }
    // `N = count : { … }`: an aggregate name is followed by its `:`, which a predicate never is.
    if (AGGREGATES.has(text) && stream.match(/^\s*:(?!-)/, false)) {
      return 'aggregate';
    }
    if (stream.match(/^\s*\(/, false)) {
      if (state.head) {
        state.head = false;
        return 'head';
      }
      return 'predicate';
    }
    return 'atom';
  }

  if (stream.match(/^(<=|>=|!=|=|<|>)/)) {
    return 'compare';
  }
  if (stream.match(':-')) {
    state.head = false;
    return 'definition';
  }
  const char = stream.next();
  if (char === '.') {
    state.head = true;
  }
  return (char ? PUNCTUATION[char] : undefined) ?? 'invalid';
};

/** Datalog in the `@dxos/datalog` dialect (Soufflé-like rules, `not`/`!` negation, `count : { … }` aggregates). */
export const datalogLanguage = StreamLanguage.define<DatalogState>({
  name: 'datalog',
  startState: () => ({ comment: false, head: true }),
  copyState: (state) => ({ ...state }),
  token,
  tokenTable,
  languageData: {
    commentTokens: { line: '%', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '{', '"', "'"] },
  },
});

/** Datalog language support; pair with the theme's syntax highlighting to colour it. */
export const datalog = (): LanguageSupport => new LanguageSupport(datalogLanguage);
