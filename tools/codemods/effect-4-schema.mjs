#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Tier 3 of the Effect 3 -> 4 migration: the mechanical half of the Schema rewrite.
//
// Schema is a rewrite, not a rename, so only transforms with an unambiguous v4 equivalent live
// here. Filters whose argument shape changed (`between(a, b)` -> `isBetween({minimum, maximum})`),
// removed APIs (`validate*`, `positive`), and anything structural (`pick`/`omit`/`partial`/
// `extend` -> `mapFields`) are left alone on purpose -- they need judgement, and a wrong rewrite
// is more expensive than a visible compile error.
//
//   node tools/codemods/effect-4-schema.mjs [--dry] [path...]
//

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

/** `Schema.<name>` -> `Schema.<name>`, argument shape unchanged. */
const RENAMES = {
  annotations: 'annotate',
  decodeUnknownEither: 'decodeUnknownResult',
  decodeEither: 'decodeResult',
  encodeUnknownEither: 'encodeUnknownResult',
  encodeEither: 'encodeResult',
  decodeUnknownOption: 'decodeUnknownOption',
};

/** Type-level renames. `Schema.Schema<A, I>` takes one parameter in v4; the codec is `Codec`. */
const TYPE_RENAMES = [
  [/\bSchema\.SchemaClass</g, 'Schema.Codec<'],
  // Only the two-argument form; `Schema.Schema<A>` is still valid.
  [/\bSchema\.Schema<([^<>,]+),\s*([^<>]+?)>/g, 'Schema.Codec<$1, $2>'],
];

/**
 * v3 exposed filters as pipeable combinators; v4 exposes predicates that must be wrapped in
 * `Schema.check`. Only entries whose arguments carry over verbatim appear here.
 */
const FILTERS = {
  int: 'isInt',
  nonEmptyString: 'isNonEmpty',
  pattern: 'isPattern',
  minLength: 'isMinLength',
  maxLength: 'isMaxLength',
  greaterThan: 'isGreaterThan',
  greaterThanOrEqualTo: 'isGreaterThanOrEqualTo',
  lessThan: 'isLessThan',
  lessThanOrEqualTo: 'isLessThanOrEqualTo',
  multipleOf: 'isMultipleOf',
  trimmed: 'isTrimmed',
  uppercased: 'isUppercased',
  lowercased: 'isLowercased',
  startsWith: 'isStartsWith',
  endsWith: 'isEndsWith',
  includes: 'isIncludes',
};

/**
 * Variadic -> array constructors (`Union(a, b)` -> `Union([a, b])`, `Literal(a, b)` ->
 * `Literals([a, b])`, `Tuple`) are NOT handled here. A brace/paren scanner cannot reliably find
 * the end of a multi-line call in this codebase -- it mismatched across comments and nested
 * calls and silently relocated the closing bracket hundreds of lines away. That transform needs
 * a real TypeScript AST tool (ts-morph/jscodeshift); ~277 sites are left as visible compile
 * errors rather than silent corruption.
 */
const VARIADIC = { Union: 'Union', Tuple: 'Tuple', Literal: 'Literals' };

/**
 * Filters v4 removed outright, expressed with the comparison that replaces them. The v3 forms
 * take no arguments, so the substitution is complete rather than a rename.
 */
const REMOVED_FILTERS = {
  positive: 'isGreaterThan(0)',
  nonNegative: 'isGreaterThanOrEqualTo(0)',
  negative: 'isLessThan(0)',
  nonPositive: 'isLessThanOrEqualTo(0)',
};

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const counts = {};
const bump = (key) => (counts[key] = (counts[key] ?? 0) + 1);

/** Splits a call's arguments at top level, respecting nesting and strings. */
const splitArgs = (text) => {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      current += char;
      if (char === quote && text[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      current += char;
      continue;
    }
    if ('([{<'.includes(char)) {
      depth++;
    } else if (')]}>'.includes(char)) {
      depth--;
    }
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    parts.push(current);
  }
  return parts;
};

/**
 * Marks every character that sits inside a comment or a string literal. Without this a
 * `Schema.Union(` inside a commented-out block matches, and the scan for its closing paren runs
 * past the comment into live code -- corrupting a file the transform was never meant to touch.
 */
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
    // Guard against matching a longer identifier ending in `name`, or one inside a comment.
    if (/[\w$]/.test(source[at - 1] ?? '') || inert[at]) {
      out += source.slice(index, at + needle.length);
      index = at + needle.length;
      continue;
    }
    let depth = 1;
    let end = at + needle.length;
    while (end < source.length && depth > 0) {
      // Consult the mask rather than re-deriving string state here: an apostrophe inside a
      // comment ("the definition's schema") otherwise opens a string that never closes, and the
      // scan runs past the call's real closing paren.
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
    const inner = source.slice(at + needle.length, end - 1);
    const after = source.slice(end);
    const replacement = rewrite(inner, after);
    // A rewriter that consumed a trailing suffix signals it by not re-emitting the call verbatim.
    const claimed =
      replacement.endsWith('.mapFields(Struct.map(Schema.mutableKey))') && after.startsWith('.pipe(Schema.mutable)')
        ? '.pipe(Schema.mutable)'.length
        : 0;
    out += source.slice(index, at) + replacement;
    index = end + claimed;
  }
};

const files = execFileSync(
  'grep',
  [
    '-rl',
    "from 'effect/Schema'",
    '--include=*.ts',
    '--include=*.tsx',
    ...(paths.length ? paths : ['packages', 'tools']),
  ],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter(Boolean);

let changedFiles = 0;
for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  let source = before;

  for (const [from, to] of Object.entries(RENAMES)) {
    if (from === to) {
      continue;
    }
    source = source.replace(new RegExp(`\\.${from}\\(`, 'g'), () => (bump(`.${from}()`), `.${to}(`));
    source = source.replace(new RegExp(`\\bSchema\\.${from}\\(`, 'g'), () => (bump(`Schema.${from}`), `Schema.${to}(`));
  }

  for (const [pattern, replacement] of TYPE_RENAMES) {
    source = source.replace(pattern, (...groups) => {
      bump('Schema.Schema<A, I>');
      return replacement.replace(/\$(\d)/g, (_m, n) => groups[Number(n)]);
    });
  }

  for (const [from, to] of Object.entries(FILTERS)) {
    source = mapCalls(source, from, (inner) => (bump(`Schema.${from}`), `Schema.check(Schema.${to}(${inner}))`));
  }

  for (const [from, replacement] of Object.entries(REMOVED_FILTERS)) {
    source = mapCalls(source, from, (inner) =>
      // Only the argument-less v3 form maps cleanly; anything else is left visible.
      inner.trim() === ''
        ? (bump(`Schema.${from}`), `Schema.check(Schema.${replacement})`)
        : `Schema.${from}(${inner})`,
    );
  }

  for (const [from, to] of Object.entries(VARIADIC)) {
    source = mapCalls(source, from, (inner) => {
      // A single argument is already valid in v4 for Union/Tuple, and `Literal(x)` stays `Literal`.
      if (splitArgs(inner).length < 2) {
        return `Schema.${from}(${inner})`;
      }
      bump(`Schema.${from} variadic`);
      // Wrap the argument text verbatim rather than re-joining the split parts: an argument may
      // carry a trailing line comment, and collapsing it onto one line swallows the `]`.
      const multiline = inner.includes('\n') || inner.includes('//');
      return multiline ? `Schema.${to}([${inner}\n])` : `Schema.${to}([${inner}])`;
    });
  }

  // `Record({key, value})` became positional. Uses the paren-matching walker rather than a
  // regex: the value expression routinely nests braces and parens of its own.
  source = mapCalls(source, 'Record', (inner) => {
    const trimmed = inner.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return `Schema.Record(${inner})`;
    }
    const entries = splitArgs(trimmed.slice(1, -1));
    const find = (name) => entries.find((entry) => entry.trim().startsWith(`${name}:`));
    const key = find('key');
    const value = find('value');
    if (!key || !value || entries.length !== 2) {
      return `Schema.Record(${inner})`;
    }
    bump('Schema.Record');
    const strip = (entry, name) =>
      entry
        .trim()
        .slice(name.length + 1)
        .trim();
    return `Schema.Record(${strip(key, 'key')}, ${strip(value, 'value')})`;
  });

  // The `*FromSelf` variants dropped their suffix.
  source = source.replace(/\bSchema\.(\w+)FromSelf\b/g, (_match, name) => (bump('Schema.*FromSelf'), `Schema.${name}`));

  // Variadic -> array, restricted to calls that fit on one line with no nested parens. The
  // multi-line case still needs an AST tool; a scanner mismatched its closing paren (see above).
  source = source.replace(/\bSchema\.(Literal|Union|Tuple)\(([^()\n]*)\)/g, (match, name, inner) => {
    const parts = splitArgs(inner);
    if (parts.length < 2) {
      return match;
    }
    bump(`Schema.${name} variadic`);
    const target = name === 'Literal' ? 'Literals' : name;
    return `Schema.${target}([${parts.map((part) => part.trim()).join(', ')}])`;
  });

  // `Schema.extend(A, Schema.Struct({...}))` -> `A.mapFields(Struct.assign({...}))`. Only the
  // form whose second argument is a literal struct converts: `mapFields` composes FIELDS, so an
  // arbitrary schema expression there has no mechanical equivalent and is left visible.
  source = mapCalls(source, 'extend', (inner) => {
    const parts = splitArgs(inner);
    if (parts.length !== 2) {
      return `Schema.extend(${inner})`;
    }
    const [base, extension] = parts.map((part) => part.trim());
    const literal = /^Schema\.Struct\(([\s\S]*)\)$/.exec(extension);
    if (literal) {
      bump('Schema.extend');
      return `${base}.mapFields(Struct.assign(${literal[1].trim()}))`;
    }
    // A named struct schema contributes its `fields`; anything more complex than an identifier
    // (a call, a pipe) is left alone because the result may not be a struct at all.
    if (/^[\w$.]+$/.test(extension)) {
      bump('Schema.extend');
      return `${base}.mapFields(Struct.assign(${extension}.fields))`;
    }
    return `Schema.extend(${inner})`;
  });

  // v4's `mutable` applies to arrays and records only. A struct's fields are made mutable per
  // key, and a union's members carry their own mutability, so the wrapper is dropped there.
  // Uses the walker: a non-greedy regex here matched an inner array's `.pipe(Schema.mutable)`
  // as though it closed the outer struct.
  const MUTABLE_SUFFIX = '.pipe(Schema.mutable)';
  source = mapCalls(source, 'Struct', (inner, after) =>
    after.startsWith(MUTABLE_SUFFIX)
      ? (bump('Struct .pipe(mutable)'), `Schema.Struct(${inner}).mapFields(Struct.map(Schema.mutableKey))`)
      : `Schema.Struct(${inner})`,
  );
  source = source.replace(/\]\)\.pipe\(Schema\.mutable\)/g, () => (bump('Union .pipe(mutable)'), '])'));

  // `Struct.assign` needs its module in scope.
  if (/Struct\.(assign|map)\(/.test(source) && !/^import \* as Struct from 'effect\/Struct';$/m.test(source)) {
    source = source.replace(
      /^(import \* as Schema from 'effect\/Schema';)$/m,
      "$1\nimport * as Struct from 'effect/Struct';",
    );
  }

  if (source !== before) {
    changedFiles += 1;
    if (!dry) {
      writeFileSync(file, source);
    }
  }
}

const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
console.log(`${dry ? '[dry] ' : ''}${changedFiles} files, ${total} rewrites`);
for (const [key, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${key}`);
}
