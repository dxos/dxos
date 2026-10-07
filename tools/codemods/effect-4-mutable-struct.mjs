#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Rewrites `Schema.mutable(<struct>)` for Effect 4, where `mutable` applies only to arrays.
//
// v3's `Schema.mutable` stripped `readonly` from a struct's properties. v4 models mutability as a
// per-key modifier, so the struct form becomes `.mapFields(Struct.map(Schema.mutableKey))` and the
// record form becomes `Schema.mutableKey(...)`. Array and tuple arguments keep working and are left
// alone.
//
// Uses the TypeScript parser rather than a paren scanner: an earlier hand-rolled scanner matched
// inside a commented-out block and relocated a bracket ~180 lines away, corrupting two files.
//
//   node tools/codemods/effect-4-mutable-struct.mjs [--dry] [path...]
//

import ts from '@typescript/typescript6';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const files = execFileSync(
  'grep',
  ['-rl', 'Schema.mutable(', '--include=*.ts', '--include=*.tsx', ...(paths.length ? paths : ['packages', 'tools'])],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'));

/** The head of a call chain, e.g. `Schema.Struct` for `Schema.Struct({...}).annotate(...)`. */
const rootCallee = (node) => {
  let current = node;
  while (ts.isCallExpression(current) || ts.isPropertyAccessExpression(current)) {
    current = ts.isCallExpression(current) ? current.expression : current.expression;
  }
  return current;
};

/** `Schema.Struct` / `Schema.Record` / … for an expression whose root is a `Schema.X` call. */
const schemaConstructor = (node) => {
  let current = node;
  while (ts.isCallExpression(current)) {
    current = current.expression;
  }
  if (!ts.isPropertyAccessExpression(current)) {
    return undefined;
  }
  return ts.isIdentifier(current.expression) && ts.isIdentifier(current.name) ? current.name.text : undefined;
};

let changedFiles = 0;
let structs = 0;
let records = 0;
let skipped = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  const source = ts.createSourceFile(file, before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'mutable' &&
      ts.isIdentifier(node.expression.expression) &&
      node.arguments.length === 1
    ) {
      const [argument] = node.arguments;
      const namespace = node.expression.expression.text;
      // The innermost `Schema.X(...)` head of the argument decides the rewrite.
      const kind = schemaConstructor(rootCallee(argument) === argument ? argument : argument);
      const text = argument.getText(source);
      if (kind === 'Struct' || kind === 'TaggedStruct') {
        edits.push({
          start: node.getStart(source),
          end: node.getEnd(),
          text: `${text}.mapFields(Struct.map(${namespace}.mutableKey))`,
        });
        structs += 1;
      } else if (kind === 'Record') {
        edits.push({
          start: node.getStart(source),
          end: node.getEnd(),
          text: `${namespace}.mutableKey(${text})`,
        });
        records += 1;
      } else {
        // Arrays, tuples and anything indirect (a named schema, a call result) keep v4's `mutable`.
        skipped += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  if (edits.length === 0) {
    continue;
  }

  let output = before;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }

  // `Struct.map` needs the `effect/Struct` namespace.
  if (/Struct\.map\(/.test(output) && !/^import \* as Struct from 'effect\/Struct';$/m.test(output)) {
    const anchor = /^import .*from 'effect\/[^']*';$/m.exec(output) ?? /^import .*$/m.exec(output);
    output = output.replace(anchor[0], `${anchor[0]}\nimport * as Struct from 'effect/Struct';`);
  }

  changedFiles += 1;
  if (!dry) {
    writeFileSync(file, output);
  }
}

console.log(
  `${dry ? '[dry] ' : ''}${changedFiles} files; ${structs} structs, ${records} records, ${skipped} left on Schema.mutable`,
);
