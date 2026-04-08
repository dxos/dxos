/**
 * Lezer grammar for the interior of a Deus fenced block.
 *
 * A block body is a sequence of entries. Each entry is one of:
 *   - KeyValue:  `name[?]: value  # comment`
 *   - Prose:     a bare text line (when inline-prose is enabled for that block type)
 *   - Comment:   `# comment`
 *
 * TypeExpr values may be:
 *   - Identifier:   `Board`, `Color`
 *   - Optional:     `Piece?`
 *   - Array:        `Move[]`
 *   - Union:        `a | b | c`
 *   - Range:        `1..8`
 *
 * This file documents the intended grammar. The compiled parser is in parser.ts.
 * To regenerate: `npx lezer-generator grammar.ts -o parser.ts`
 *
 * @top Block
 *
 * Block { Entry* }
 *
 * Entry {
 *   KeyValue |
 *   Prose    |
 *   Comment
 * }
 *
 * KeyValue {
 *   FieldName Optional? ":" TypeExpr Comment?
 * }
 *
 * FieldName  { identifier }
 * Optional   { "?" }
 *
 * TypeExpr {
 *   UnionExpr |
 *   ArrayExpr |
 *   BaseType
 * }
 *
 * UnionExpr  { TypeExpr ("|" TypeExpr)+ }
 * ArrayExpr  { BaseType "[]" }
 * BaseType   { identifier Optional? | StringLiteral | NumberRange }
 *
 * NumberRange { number ".." number }
 *
 * Prose    { ![\n]+ }
 * Comment  { "#" ![\n]* }
 */

// This file is documentation only.
// The actual parser is hand-written in parser.ts until lezer-generator is wired in.
export {};
