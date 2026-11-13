//
// Copyright 2026 DXOS.org
//

import { LanguageSupport, StreamLanguage, type StringStream } from '@codemirror/language';
import { type Highlighter, highlightCode, tags } from '@lezer/highlight';

import {
  type HighlightedSpan,
  type TurtleState,
  type TurtleToken,
  turtleToken,
  turtleTokenTable,
} from '../turtle/index.ts';

const tokenTable = {
  ...turtleTokenTable,
  variable: tags.variableName,
  function: tags.function(tags.variableName),
  operator: tags.operator,
};

type SparqlToken = TurtleToken | 'variable' | 'function' | 'operator';

// SPARQL 1.1 query and update keywords; matched whole-word and case-insensitively, never as a prefix (`select:`).
const KEYWORDS =
  /^(?:SELECT|CONSTRUCT|DESCRIBE|ASK|WHERE|FROM|NAMED|DISTINCT|REDUCED|OPTIONAL|FILTER|UNION|MINUS|GRAPH|SERVICE|SILENT|BIND|AS|VALUES|ORDER|BY|ASC|DESC|LIMIT|OFFSET|GROUP|HAVING|PREFIX|BASE|NOT|EXISTS|IN|INSERT|DELETE|DATA|WITH|USING|LOAD|CLEAR|DROP|CREATE|ADD|MOVE|COPY|INTO|DEFAULT|ALL|UNDEF)\b(?!:)/i;

// Built-in functions and aggregates, so a call reads apart from a name.
const FUNCTIONS =
  /^(?:STR|LANG|LANGMATCHES|DATATYPE|BOUND|IRI|URI|BNODE|RAND|ABS|CEIL|FLOOR|ROUND|CONCAT|STRLEN|UCASE|LCASE|ENCODE_FOR_URI|CONTAINS|STRSTARTS|STRENDS|STRBEFORE|STRAFTER|YEAR|MONTH|DAY|HOURS|MINUTES|SECONDS|TIMEZONE|TZ|NOW|UUID|STRUUID|MD5|SHA1|SHA256|SHA384|SHA512|COALESCE|IF|STRLANG|STRDT|SAMETERM|ISIRI|ISURI|ISBLANK|ISLITERAL|ISNUMERIC|REGEX|SUBSTR|REPLACE|COUNT|SUM|MIN|MAX|AVG|SAMPLE|GROUP_CONCAT)\b(?=\s*\()/i;

const IRI = /^<[^<>"{}|^`\\\s]*>/;
const SIGNED_NUMBER = /^[+-]?\.?\d/;

const OPERATORS = /^(?:&&|\|\||!=|<=|>=|\^(?!\^)|[=<>!*+/|-])/;

const token = (stream: StringStream, state: TurtleState): SparqlToken | null => {
  // Inside a long string or right after a prefix, Turtle's tokenizer owns the next token.
  if (state.long || state.local) {
    return turtleToken(stream, state);
  }
  if (stream.eatSpace()) {
    return null;
  }
  if (stream.match(/^[?$][A-Za-z_][\w]*/)) {
    return 'variable';
  }
  if (stream.match(KEYWORDS)) {
    return 'keyword';
  }
  if (stream.match(FUNCTIONS)) {
    return 'function';
  }
  // An IRI starts with `<` and a signed number with `-`, as operators do; Turtle's tokenizer claims those first.
  if (!stream.match(IRI, false) && !stream.match(SIGNED_NUMBER, false) && stream.match(OPERATORS)) {
    return 'operator';
  }
  return turtleToken(stream, state);
};

/** SPARQL 1.1: Turtle's terms and triple syntax plus variables, keywords, built-in functions and operators. */
export const sparqlLanguage = StreamLanguage.define<TurtleState>({
  name: 'sparql',
  startState: () => ({ local: false }),
  copyState: (state) => ({ ...state }),
  token,
  tokenTable,
  languageData: {
    commentTokens: { line: '#' },
    closeBrackets: { brackets: ['(', '[', '{', '"', "'", '<'] },
  },
});

/** SPARQL language support; pair with the theme's syntax highlighting to colour it. */
export const sparql = (): LanguageSupport => new LanguageSupport(sparqlLanguage);

/** Highlights SPARQL without an editor, one array of spans per line. */
export const highlightSparql = (
  source: string,
  highlighter: Highlighter | readonly Highlighter[],
): HighlightedSpan[][] => {
  const lines: HighlightedSpan[][] = [[]];
  highlightCode(
    source,
    sparqlLanguage.parser.parse(source),
    highlighter,
    (text, classes) => lines[lines.length - 1].push({ text, classes }),
    () => lines.push([]),
  );
  return lines;
};
