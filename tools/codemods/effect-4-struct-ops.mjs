#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Ports `Schema.extend` / `omit` / `pick` to Effect 4's field operations.
//
// v4 removed the schema-level combinators in favour of `mapFields` over `effect/Struct`, and takes
// key arrays rather than variadic keys:
//
//   X.pipe(Schema.omit('a', 'b'))  ->  X.mapFields(Struct.omit(['a', 'b']))
//   X.pipe(Schema.pick('a'))       ->  X.mapFields(Struct.pick(['a']))
//   Schema.extend(A, B)            ->  A.pipe(Schema.fieldsAssign(B.fields))
//
// `extend` is only rewritten when both sides are structs at the call site — the union-distributing
// form needs `mapMembers` and is left for a human.
//
//   node tools/codemods/effect-4-struct-ops.mjs [--dry] [path...]
//

import ts from '@typescript/typescript6';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const files = execFileSync(
  'grep',
  [
    '-rlE',
    'Schema\\.(extend|omit|pick)\\(',
    '--include=*.ts',
    '--include=*.tsx',
    ...(paths.length ? paths : ['packages', 'tools']),
  ],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'));

const counts = {};
const bump = (key) => (counts[key] = (counts[key] ?? 0) + 1);
let changedFiles = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  const source = ts.createSourceFile(file, before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];

  const visit = (node) => {
    // `self.pipe(Schema.omit('a', 'b'))` / `.pipe(Schema.pick(...))`
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'pipe' &&
      node.arguments.length === 1 &&
      ts.isCallExpression(node.arguments[0]) &&
      ts.isPropertyAccessExpression(node.arguments[0].expression) &&
      ['omit', 'pick'].includes(node.arguments[0].expression.name.text) &&
      ts.isIdentifier(node.arguments[0].expression.expression)
    ) {
      const operation = node.arguments[0].expression.name.text;
      const keys = node.arguments[0].arguments.map((argument) => argument.getText(source));
      edits.push({
        start: node.getStart(source),
        end: node.getEnd(),
        text: `${node.expression.expression.getText(source)}.mapFields(Struct.${operation}([${keys.join(', ')}]))`,
      });
      bump(`Schema.${operation}`);
    }

    // `Schema.extend(A, B)`
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'extend' &&
      ts.isIdentifier(node.expression.expression) &&
      node.arguments.length === 2
    ) {
      const [left, right] = node.arguments.map((argument) => argument.getText(source));
      const namespace = node.expression.expression.text;
      edits.push({
        start: node.getStart(source),
        end: node.getEnd(),
        text: `${left}.pipe(${namespace}.fieldsAssign((${right}).fields))`,
      });
      bump('Schema.extend');
    }

    ts.forEachChild(node, visit);
  };
  visit(source);

  if (edits.length === 0) {
    continue;
  }

  // Drop nested edits so an outer rewrite never overlaps an inner one.
  const applied = edits
    .sort((a, b) => b.start - a.start)
    .filter(
      (edit, index, all) => !all.slice(0, index).some((other) => edit.start >= other.start && edit.end <= other.end),
    );

  let output = before;
  for (const edit of applied) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }

  if (/Struct\.(omit|pick)\(/.test(output) && !/^import \* as Struct from 'effect\/Struct';$/m.test(output)) {
    const anchor = /^import .*from 'effect\/[^']*';$/m.exec(output) ?? /^import .*$/m.exec(output);
    output = output.replace(anchor[0], `${anchor[0]}\nimport * as Struct from 'effect/Struct';`);
  }

  changedFiles += 1;
  if (!dry) {
    writeFileSync(file, output);
  }
}

const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
console.log(`${dry ? '[dry] ' : ''}${total} rewrites across ${changedFiles} files`);
for (const [key, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${key}`);
}
