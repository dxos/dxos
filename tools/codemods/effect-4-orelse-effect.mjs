#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Lifts a bare error into an Effect in `timeoutOrElse`'s `orElse` callback.
//
// v3's `Effect.timeoutFail` took an error thunk; v4's `timeoutOrElse` takes a fallback *Effect*, so
// a callback that returns `new SomeError(...)` no longer typechecks. Only that shape is rewritten —
// a callback already returning an effect is left alone.
//
//   node tools/codemods/effect-4-orelse-effect.mjs [--dry] [path...]
//

import ts from '@typescript/typescript6';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const files = execFileSync(
  'grep',
  ['-rl', 'timeoutOrElse', '--include=*.ts', '--include=*.tsx', ...(paths.length ? paths : ['packages', 'tools'])],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'));

let changedFiles = 0;
let lifted = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  const source = ts.createSourceFile(file, before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const effectNamespace = /^import \* as ([A-Za-z_$][\w$]*) from 'effect\/Effect';$/m.exec(before)?.[1] ?? 'Effect';
  const edits = [];

  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'orElse' &&
      ts.isArrowFunction(node.initializer) &&
      ts.isNewExpression(node.initializer.body)
    ) {
      const body = node.initializer.body;
      edits.push({
        start: body.getStart(source),
        end: body.getEnd(),
        text: `${effectNamespace}.fail(${body.getText(source)})`,
      });
      lifted += 1;
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

console.log(`${dry ? '[dry] ' : ''}${lifted} fallbacks lifted across ${changedFiles} files`);
