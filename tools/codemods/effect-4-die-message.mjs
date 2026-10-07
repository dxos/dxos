#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Rewrites `Effect.dieMessage(msg)` for Effect 4, which removed it.
//
// v3's `dieMessage` wrapped the string in a `RuntimeException`; v4 dropped that class in favour of
// the global `Error`, so the defect is constructed explicitly. Parsed with the TypeScript compiler
// because the argument is often a template literal containing calls.
//
//   node tools/codemods/effect-4-die-message.mjs [--dry] [path...]
//

import ts from '@typescript/typescript6';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const files = execFileSync(
  'grep',
  ['-rl', '.dieMessage(', '--include=*.ts', '--include=*.tsx', ...(paths.length ? paths : ['packages', 'tools'])],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'));

let changedFiles = 0;
let rewritten = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  const source = ts.createSourceFile(file, before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'dieMessage' &&
      ts.isIdentifier(node.expression.expression) &&
      node.arguments.length === 1
    ) {
      const namespace = node.expression.expression.text;
      edits.push({
        start: node.getStart(source),
        end: node.getEnd(),
        text: `${namespace}.die(new Error(${node.arguments[0].getText(source)}))`,
      });
      rewritten += 1;
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

console.log(`${dry ? '[dry] ' : ''}${rewritten} rewrites across ${changedFiles} files`);
