//
// Copyright 2025 DXOS.org
//

import { HighlightStyle, LRLanguage, LanguageSupport, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { styleTags, tags as t } from '@lezer/highlight';

import { parser } from './gen/query';

/**
 * Create a CodeMirror extension for the query language with syntax highlighting.
 */
export const query = (): Extension => {
  return [new LanguageSupport(queryLanguage), syntaxHighlighting(queryHighlightStyle)];
};

/**
 * Define syntax highlighting tags for the query language.
 */
const queryHighlighting = styleTags({
  // Keywords
  'Not And Or': t.keyword,
  TypeKeyword: t.attributeName,

  // Literals
  String: t.string,
  Number: t.number,
  Boolean: t.bool,
  Null: t.null,

  // Identifiers
  Identifier: t.variableName,
  PropertyPath: t.propertyName,
  PropertyKey: t.propertyName,

  // Punctuation
  '{ }': t.brace,
  '[ ]': t.squareBracket,
  '( )': t.paren,
  ':': t.definitionOperator,
  ',': t.separator,
  '.': t.derefOperator,
});

/**
 * Create the query language with the parser and highlighting.
 */
const queryLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [queryHighlighting],
  }),
  languageData: {
    commentTokens: { line: '//' },
  },
});

/**
 * Define a custom highlight style for the query language.
 */
const queryHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, class: 'text-blue-500' },
  { tag: t.string, class: 'text-orange-500' },
  { tag: t.number, class: 'text-green-500' },
  { tag: t.bool, class: 'text-green-500' },
  { tag: t.null, class: 'text-neutral-500' },
  { tag: t.attributeName, class: 'text-blue-500' },
  { tag: t.variableName, class: 'text-teal-500' },
  { tag: t.propertyName, class: 'text-teal-500' },
  { tag: t.definitionOperator, class: 'text-subdued' },
  { tag: t.separator, class: 'text-subdued' },
  { tag: t.derefOperator, class: 'text-subdued' },
  { tag: t.brace, class: 'text-subdued' },
  { tag: t.squareBracket, class: 'text-subdued' },
  { tag: t.paren, class: 'text-yellow-500' },
]);
