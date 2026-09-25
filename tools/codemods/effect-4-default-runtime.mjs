#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Replaces `Runtime.defaultRuntime` with an empty service context, and disambiguates the two
// `Context`s that leaves in scope.
//
// Effect 4 dropped the `Runtime<R>` value -- its `Runtime` module is now only about `runMain` --
// so a runtime IS its service context and the "default" one is simply empty. The rewrite has to
// pick the local name for `effect/Context` per file: ~20 of these files already bind `Context` to
// `@dxos/context`'s class, and shadowing it would break every `ctx: Context` signature. Where that
// happens the effect import is aliased to `EffectContext` and its member accesses move with it --
// but only the members effect actually has, since `@dxos/context` owns `Context.default` and
// `Context.raise` on the same spelling.
//
//   node tools/codemods/effect-4-default-runtime.mjs [--dry] [path...]
//

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

/** Members of `effect/Context`; everything else on a `Context.` access belongs to `@dxos/context`. */
const EFFECT_MEMBERS = new Set([
  'Context',
  'Reference',
  'Service',
  'Tag',
  'add',
  'empty',
  'get',
  'getOption',
  'getOrElse',
  'isContext',
  'make',
  'merge',
  'omit',
  'pick',
  'unsafeGet',
]);

const files = execFileSync(
  'grep',
  [
    '-rlE',
    '\\.defaultRuntime\\b|\\bContext\\.Context\\b',
    '--include=*.ts',
    '--include=*.tsx',
    ...(paths.length ? paths : ['packages', 'tools']),
  ],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'));

/** Local binding for `effect/Context`, adding the import when the file lacks one. */
const resolveContextAlias = (source) => {
  const taken = new RegExp(`^import (?:type )?\\{[^}]*\\bContext\\b[^}]*\\} from '(?!effect/)`, 'm').test(source);
  const existing = /^import \* as ([A-Za-z_$][\w$]*) from 'effect\/Context';$/m.exec(source);
  if (existing) {
    if (existing[1] !== 'Context' || !taken) {
      return { alias: existing[1], source, added: false };
    }
    // Both spellings are `Context` in the same file -- a duplicate identifier; rename effect's.
    return {
      alias: 'EffectContext',
      source: source.replace(existing[0], "import * as EffectContext from 'effect/Context';"),
      added: false,
    };
  }
  const alias = taken ? 'EffectContext' : 'Context';
  const anchor = /^import .*from 'effect\/[^']*';$/m.exec(source) ?? /^import .*$/m.exec(source);
  const statement = `import * as ${alias} from 'effect/Context';`;
  return { alias, source: source.replace(anchor[0], `${statement}\n${anchor[0]}`), added: true };
};

let changedFiles = 0;
let replaced = 0;
let requalified = 0;
let importsDropped = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  const runtimeAliases = [...before.matchAll(/^import \* as ([A-Za-z_$][\w$]*) from 'effect\/Runtime';$/gm)].map(
    (match) => match[1],
  );
  const usesDefaultRuntime = runtimeAliases.some((runtime) =>
    new RegExp(`(?<![\\w$.])${runtime}\\.defaultRuntime\\b`).test(before),
  );
  // Files that only mention `Context.Context` need work solely when `Context` resolves elsewhere.
  const shadowed = new RegExp(`^import (?:type )?\\{[^}]*\\bContext\\b[^}]*\\} from '(?!effect/)`, 'm').test(before);
  if (!usesDefaultRuntime && !shadowed) {
    continue;
  }

  const resolved = resolveContextAlias(before);
  let source = resolved.source;

  for (const runtime of runtimeAliases) {
    source = source.replace(
      new RegExp(`(?<![\\w$.])${runtime}\\.defaultRuntime\\b`, 'g'),
      () => ((replaced += 1), `${resolved.alias}.empty()`),
    );
    // The import only existed for `defaultRuntime` in every file this touches; drop it when true.
    if (!new RegExp(`(?<![\\w$.])${runtime}\\.`).test(source)) {
      source = source.replace(new RegExp(`^import \\* as ${runtime} from 'effect/Runtime';\\n`, 'm'), () => {
        importsDropped += 1;
        return '';
      });
    }
  }

  // Move effect's members onto the alias; `@dxos/context`'s own statics keep the bare name.
  if (resolved.alias !== 'Context') {
    source = source.replace(/(?<![\w$.])Context\.([A-Za-z_$][\w$]*)/g, (match, member) =>
      EFFECT_MEMBERS.has(member) ? ((requalified += 1), `${resolved.alias}.${member}`) : match,
    );
  }

  if (source !== before) {
    changedFiles += 1;
    if (!dry) {
      writeFileSync(file, source);
    }
  }
}

console.log(
  `${dry ? '[dry] ' : ''}${changedFiles} files; ${replaced} defaultRuntime -> Context.empty(), ${requalified} members requalified, ${importsDropped} Runtime imports dropped`,
);
