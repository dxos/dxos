//
// Copyright 2026 DXOS.org
//

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { Extension } from '@codemirror/state';

/**
 * Syntax highlighting for Deus .mdl files.
 *
 * Mapping:
 *   FieldName  → propertyName (typically rendered in accent colour)
 *   TypeExpr   → typeName
 *   Optional   → operator (the "?" suffix)
 *   Comment    → lineComment
 *   Prose      → content (plain body text)
 */
export const mdlHighlightStyle = HighlightStyle.define([
  { tag: t.propertyName, color: '#4a9eff' }, // field names
  { tag: t.typeName, color: '#f0a050' }, // type expressions
  { tag: t.operator, color: '#aaaaaa' }, // ? : | []
  { tag: t.lineComment, color: '#6a9955', fontStyle: 'italic' },
  { tag: t.content, color: '#cccccc' }, // prose lines
]);

export const mdlHighlight: Extension = syntaxHighlighting(mdlHighlightStyle);
