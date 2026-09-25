#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Applies the Effect 3 -> 4 renames that are pure: same module, same signature, new spelling.
//
// Every entry below was mined from upstream's `migration/v3-to-v4.md` and then checked against the
// installed `effect@4` typings -- the v3 name must be gone AND the v4 name must exist. Renames that
// also change a signature (`Schema.Tuple2`, `Stream.async`, `Context.Tag`, the `Schema` filters that
// now need `check(...)`) are deliberately absent: a bare rename there produces code that looks
// migrated but is not.
//
// Each rename is gated on the file actually binding that namespace to the effect module. DXOS has
// its own `SchemaAST`, `Registry` and `Tool` namespaces with overlapping member names, and an
// ungated rewrite silently retypes them (this is exactly how `Registry.Registry` went wrong once).
//
//   node tools/codemods/effect-4-verified-renames.mjs [--dry] [path...]
//

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

/** namespace -> { module: the effect module it must be bound to, renames: v3 -> v4 }. */
const RENAMES = {
  Array: {
    module: 'effect/Array',
    renames: { isNonEmptyReadonlyArray: 'isReadonlyArrayNonEmpty' },
  },
  Cause: {
    module: 'effect/Cause',
    renames: {
      TimeoutException: 'TimeoutError',
      isTimeoutException: 'isTimeoutError',
      UnknownException: 'UnknownError',
      isUnknownException: 'isUnknownError',
      isFailure: 'hasFails',
      isDie: 'hasDies',
    },
  },
  CliConfig: {
    module: 'effect/unstable/cli/CliConfig',
    renames: { defaultConfig: 'defaults' },
  },
  Config: {
    module: 'effect/Config',
    renames: { integer: 'int' },
  },
  ConfigProvider: {
    module: 'effect/ConfigProvider',
    renames: { fromJson: 'fromUnknown' },
  },
  Duration: {
    module: 'effect/Duration',
    renames: { DurationInput: 'Input' },
  },
  Exit: {
    module: 'effect/Exit',
    renames: { isInterrupted: 'hasInterrupts' },
  },
  Fiber: {
    module: 'effect/Fiber',
    renames: { RuntimeFiber: 'Fiber' },
  },
  HttpClientRequest: {
    module: 'effect/unstable/http/HttpClientRequest',
    renames: { bodyUnsafeJson: 'bodyJsonUnsafe' },
  },
  Layer: {
    module: 'effect/Layer',
    // v4 merged scoped layer construction into the plain constructors: every layer is scoped.
    renames: { unwrapEffect: 'unwrap', unwrapScoped: 'unwrap', scopedContext: 'effectContext' },
  },
  Option: {
    module: 'effect/Option',
    renames: { flatMapNullable: 'flatMapNullishOr' },
  },
  Order: {
    module: 'effect/Order',
    renames: { number: 'Number', string: 'String', reverse: 'flip' },
  },
  Predicate: {
    module: 'effect/Predicate',
    renames: { isRecord: 'isObject', isNotNullable: 'isNotNullish' },
  },
  Schema: {
    module: 'effect/Schema',
    renames: {
      decodeUnknown: 'decodeUnknownEffect',
      equivalence: 'toEquivalence',
      typeSchema: 'toType',
      Object: 'ObjectKeyword',
      TaggedErrorClass: 'TaggedError',
    },
  },
  Generated: {
    module: '@effect/ai-anthropic/Generated',
    renames: { WebSearchTool20250305: 'WebSearchTool_20250305', CacheControlEphemeral: 'ChatContentCacheControl' },
  },
  Scope: {
    module: 'effect/Scope',
    renames: { CloseableScope: 'Closeable' },
  },
  Tool: {
    module: 'effect/unstable/ai/Tool',
    renames: { Requirements: 'HandlerServices' },
  },
  Stream: {
    module: 'effect/Stream',
    renames: {
      unwrapScoped: 'unwrap',
      // The callback receives an Array rather than a Chunk; the compiler flags any that cared.
      mapChunksEffect: 'mapArrayEffect',
      StreamTypeId: 'TypeId',
      flattenIterables: 'flattenIterable',
      onDone: 'onEnd',
    },
  },
};

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const files = execFileSync(
  'grep',
  [
    '-rlE',
    "from '(effect/|@effect/ai)",
    '--include=*.ts',
    '--include=*.tsx',
    ...(paths.length ? paths : ['packages', 'tools']),
  ],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'));

const counts = {};
let changedFiles = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  let source = before;

  for (const [namespace, { module, renames }] of Object.entries(RENAMES)) {
    // Only rewrite when this file's binding really is the effect module.
    const bound = new RegExp(`^import (?:type )?\\* as ${namespace} from '${module}';$`, 'm').test(source);
    if (!bound) {
      continue;
    }
    for (const [from, to] of Object.entries(renames)) {
      source = source.replace(new RegExp(`(?<![\\w$.])${namespace}\\.${from}\\b`, 'g'), () => {
        const key = `${namespace}.${from} -> ${to}`;
        counts[key] = (counts[key] ?? 0) + 1;
        return `${namespace}.${to}`;
      });
    }
  }

  if (source !== before) {
    changedFiles += 1;
    if (!dry) {
      writeFileSync(file, source);
    }
  }
}

const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
console.log(`${dry ? '[dry] ' : ''}${total} rewrites across ${changedFiles} files`);
for (const [key, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${key}`);
}
