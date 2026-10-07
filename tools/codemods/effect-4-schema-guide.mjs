#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Applies the Effect 4 Schema renames that the upstream migration guide marks mechanical
// (Effect-TS/effect `migration/schema.md` and `migration/v3-to-v4.md`).
//
//   node tools/codemods/effect-4-schema-guide.mjs [--dry] [path...]
//
// Rewrites, each with its guide entry:
//   Schema.validateSync(S)  -> Schema.decodeSync(Schema.toType(S))   ("validate* removal")
//   Schema.partial(S)       -> S.mapFields(Struct.map(Schema.optional))  ("partial / partialWith")
//   Schema.typeSchema(S)    -> Schema.toType(S)
//   Schema.Object           -> Schema.ObjectKeyword
//   Schema.UUID             -> Schema.String.check(Schema.isUUID())
//   Schema.between(...)     -> Schema.isBetween(...)   (applied via `check`, left to the call site)
//
// `partial` needs a `Struct` import, which the caller must add; the script reports which files.
//

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const counts = {};
const bump = (key) => (counts[key] = (counts[key] ?? 0) + 1);

/** Marks comment and string spans so the paren scanner never counts a bracket inside one. */
const maskInert = (source) => {
  const inert = new Uint8Array(source.length);
  let index = 0;
  while (index < source.length) {
    const two = source.slice(index, index + 2);
    if (two === '//') {
      const end = source.indexOf('\n', index);
      const stop = end === -1 ? source.length : end;
      inert.fill(1, index, stop);
      index = stop;
      continue;
    }
    if (two === '/*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? source.length : end + 2;
      inert.fill(1, index, stop);
      index = stop;
      continue;
    }
    const char = source[index];
    if (char === "'" || char === '"' || char === '`') {
      let end = index + 1;
      while (end < source.length && !(source[end] === char && source[end - 1] !== '\\')) {
        end++;
      }
      inert.fill(1, index, Math.min(end + 1, source.length));
      index = end + 1;
      continue;
    }
    index++;
  }
  return inert;
};

/** Finds `Schema.<name>(` calls and hands the argument text to `rewrite`. */
const mapCalls = (source, name, rewrite) => {
  const needle = `Schema.${name}(`;
  const inert = maskInert(source);
  let out = '';
  let index = 0;
  for (;;) {
    const at = source.indexOf(needle, index);
    if (at === -1) {
      return out + source.slice(index);
    }
    if (/[\w$]/.test(source[at - 1] ?? '') || inert[at]) {
      out += source.slice(index, at + needle.length);
      index = at + needle.length;
      continue;
    }
    let depth = 1;
    let end = at + needle.length;
    while (end < source.length && depth > 0) {
      if (!inert[end]) {
        const char = source[end];
        if (char === '(') {
          depth++;
        } else if (char === ')') {
          depth--;
        }
      }
      end++;
    }
    // Trim: a multi-line argument carries surrounding newlines and a trailing comma, which break a
    // rewrite that appends a method call to it. Re-indentation is left to the formatter.
    const inner = source
      .slice(at + needle.length, end - 1)
      .trim()
      .replace(/,$/, '');
    out += source.slice(index, at) + rewrite(inner);
    index = end;
  }
};

/** Replaces a bare `Schema.<name>` reference that is not a call and not part of a longer name. */
const mapRefs = (source, name, replacement) => {
  const inert = maskInert(source);
  const needle = `Schema.${name}`;
  let out = '';
  let index = 0;
  for (;;) {
    const at = source.indexOf(needle, index);
    if (at === -1) {
      return out + source.slice(index);
    }
    const next = source[at + needle.length] ?? '';
    if (/[\w$]/.test(source[at - 1] ?? '') || /[\w$(]/.test(next) || inert[at]) {
      out += source.slice(index, at + needle.length);
      index = at + needle.length;
      continue;
    }
    bump(name);
    out += source.slice(index, at) + replacement;
    index = at + needle.length;
  }
};

const files = execFileSync(
  'grep',
  [
    '-rlE',
    'Schema\\.(validateSync|partial|typeSchema|Object|UUID|between)\\b',
    '--include=*.ts',
    '--include=*.tsx',
    ...(paths.length ? paths : ['packages']),
  ],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.includes('/dist/'));

const needsStruct = [];
/** `X.pipe(Schema.partial)` needs the pipe entry removed, not just rewritten -- reported, not touched. */
const pipedPartial = [];
let changedFiles = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  let source = before;

  for (const line of before.split('\n')) {
    if (/Schema\.partial\s*[,)]/.test(line)) {
      pipedPartial.push(`${file}: ${line.trim()}`);
    }
  }

  source = mapCalls(source, 'validateSync', (inner) => {
    bump('validateSync');
    return `Schema.decodeSync(Schema.toType(${inner}))`;
  });

  source = mapCalls(source, 'typeSchema', (inner) => {
    bump('typeSchema');
    return `Schema.toType(${inner})`;
  });

  source = mapCalls(source, 'partial', (inner) => {
    bump('partial');
    return `${inner}.mapFields(Struct.map(Schema.optional))`;
  });

  // v4 turned the bound into a predicate that has to be applied with `check`; every call site is a
  // standalone combinator inside a `.pipe(...)`, so wrapping in place is position-independent.
  source = mapCalls(source, 'between', (inner) => {
    bump('between');
    return `Schema.check(Schema.isBetween(${inner}))`;
  });

  source = mapRefs(source, 'Object', 'Schema.ObjectKeyword');
  source = mapRefs(source, 'UUID', 'Schema.String.check(Schema.isUUID())');

  if (source !== before) {
    if (/\.mapFields\(Struct\.map\(/.test(source) && !/from 'effect\/Struct'/.test(source)) {
      needsStruct.push(file);
    }
    changedFiles += 1;
    if (!dry) {
      writeFileSync(file, source);
    }
  }
}

const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
console.log(`${dry ? '[dry] ' : ''}${changedFiles} files; ${total} rewrites`);
for (const [key, value] of Object.entries(counts).sort(([, a], [, b]) => b - a)) {
  console.log(`  ${key}: ${value}`);
}
if (needsStruct.length) {
  console.log(`\nNeeds \`import * as Struct from 'effect/Struct';\`:`);
  for (const file of needsStruct) {
    console.log(`  ${file}`);
  }
}
if (pipedPartial.length) {
  console.log(`\nPiped \`Schema.partial\` -- rewrite by hand (${pipedPartial.length}):`);
  for (const site of pipedPartial) {
    console.log(`  ${site}`);
  }
}
