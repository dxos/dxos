#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Wraps `Tool.make`'s `parameters` in `Schema.Struct` for Effect 4.
//
// v3 took a fields record and built the struct internally; v4 takes a schema, so an arbitrary
// parameter schema (a union, a branded struct) can be passed. Only the fields-record form needs
// wrapping — a `parameters:` that is already a schema expression is left alone.
//
//   node tools/codemods/effect-4-tool-parameters.mjs [--dry] [path...]
//

import ts from '@typescript/typescript6';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const files = execFileSync(
  'grep',
  ['-rl', '.make(', '--include=*.ts', '--include=*.tsx', ...(paths.length ? paths : ['packages', 'tools'])],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'));

let changedFiles = 0;
let wrapped = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  if (!/from 'effect\/unstable\/ai\/Tool'/.test(before)) {
    continue;
  }
  const source = ts.createSourceFile(file, before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const schemaNamespace = /^import \* as ([A-Za-z_$][\w$]*) from 'effect\/Schema';$/m.exec(before)?.[1] ?? 'Schema';
  const edits = [];

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'make' &&
      ts.isIdentifier(node.expression.expression) &&
      node.arguments.length === 2 &&
      ts.isObjectLiteralExpression(node.arguments[1])
    ) {
      for (const property of node.arguments[1].properties) {
        if (
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === 'parameters' &&
          ts.isObjectLiteralExpression(property.initializer)
        ) {
          edits.push({
            start: property.initializer.getStart(source),
            end: property.initializer.getEnd(),
            text: `${schemaNamespace}.Struct(${property.initializer.getText(source)})`,
          });
          wrapped += 1;
        }
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

  changedFiles += 1;
  if (!dry) {
    writeFileSync(file, output);
  }
}

console.log(`${dry ? '[dry] ' : ''}${wrapped} parameter records wrapped across ${changedFiles} files`);
