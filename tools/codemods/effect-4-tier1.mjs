#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Tier 1 of the Effect 3 -> 4 migration: module-path and flat API renames.
//
// Only renames with a 1:1 v4 equivalent live here. Anything needing judgement (Schema's
// variadic->array constructors, `Context.Tag` -> `ServiceMap.Service`, layer memoization)
// is deliberately excluded -- a codemod that guesses is worse than one that leaves work visible.
//
//   node tools/codemods/effect-4-tier1.mjs [--dry] [path...]
//

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

/** v3 module specifier -> v4 module specifier. */
const MODULES = {
  'effect/Either': 'effect/Result',
  'effect/JSONSchema': 'effect/JsonSchema',
  'effect/TestClock': 'effect/testing/TestClock',
  'effect/FastCheck': 'effect/testing/FastCheck',
  'effect/Mailbox': 'effect/Queue',
  'effect/TDeferred': 'effect/TxDeferred',
  'effect/TMap': 'effect/TxHashMap',
  'effect/TSet': 'effect/TxHashSet',
  'effect/TPriorityQueue': 'effect/TxPriorityQueue',
  'effect/TPubSub': 'effect/TxPubSub',
  'effect/TQueue': 'effect/TxQueue',
  'effect/TReentrantLock': 'effect/TxReentrantLock',
  'effect/TRef': 'effect/TxRef',
  'effect/TSemaphore': 'effect/TxSemaphore',
  'effect/TSubscriptionRef': 'effect/TxSubscriptionRef',
  // @effect-atom moved into the core release train (D2).
  '@effect-atom/atom/Atom': 'effect/unstable/reactivity/Atom',
  '@effect-atom/atom/Registry': 'effect/unstable/reactivity/AtomRegistry',
  '@effect-atom/atom/Result': 'effect/unstable/reactivity/AsyncResult',
  '@effect-atom/atom/AtomRef': 'effect/unstable/reactivity/AtomRef',
  '@effect-atom/atom/AtomRpc': 'effect/unstable/reactivity/AtomRpc',
  '@effect-atom/atom/AtomHttpApi': 'effect/unstable/reactivity/AtomHttpApi',
  '@effect-atom/atom': 'effect/unstable/reactivity',
  '@effect-atom/atom-react': '@effect/atom-react',
  // @effect/sql and @effect/experimental were absorbed into effect/unstable/*.
  '@effect/sql/SqlClient': 'effect/unstable/sql/SqlClient',
  '@effect/sql/SqlError': 'effect/unstable/sql/SqlError',
  '@effect/sql/SqlConnection': 'effect/unstable/sql/SqlConnection',
  '@effect/sql/Statement': 'effect/unstable/sql/Statement',
  '@effect/sql/Migrator': 'effect/unstable/sql/Migrator',
  '@effect/sql': 'effect/unstable/sql',
  '@effect/experimental/Reactivity': 'effect/unstable/reactivity/Reactivity',
  '@effect/experimental': 'effect/unstable',
};

/** Namespace-qualified member renames, applied only to the matching namespace. */
const MEMBERS = {
  Effect: {
    async: 'callback',
    zipRight: 'andThen',
    zipLeft: 'tap',
    either: 'result',
    catchAll: 'catch',
    catchAllCause: 'catchCause',
    catchAllDefect: 'catchDefect',
    catchSome: 'catchIf',
    catchSomeCause: 'catchCauseIf',
    tapErrorCause: 'tapCause',
    ignoreLogged: 'ignore',
    // v4 split forking by lifetime: a child of the current fiber vs. one detached from it.
    fork: 'forkChild',
    forkDaemon: 'forkDetach',
  },
  Layer: {
    scoped: 'effect',
    scopedDiscard: 'effectDiscard',
    tapErrorCause: 'tapCause',
  },
  Stream: {
    repeatEffect: 'fromEffectRepeat',
    either: 'result',
    catchAll: 'catch',
    catchAllCause: 'catchCause',
    catchSomeCause: 'catchCauseIf',
  },
  Scope: {
    extend: 'provide',
  },
  // `Either` is `Result` in v4; its predicates renamed with it.
  Either: {
    right: 'succeed',
    left: 'fail',
  },
  Result: {
    isRight: 'isSuccess',
    isLeft: 'isFailure',
    getRight: 'getSuccess',
    getLeft: 'getFailure',
    right: 'succeed',
    left: 'fail',
  },
  Atom: {
    Context: 'AtomContext',
  },
};

/**
 * `Either` is `Result` in v4, so a namespace import bound to `Either` keeps working only if the
 * binding is renamed too -- otherwise `Either.right` silently reads as a member of `Result`.
 */
const NAMESPACE_BINDINGS = {
  Either: { binding: 'Result', module: 'effect/Result' },
  Registry: { binding: 'AtomRegistry', module: 'effect/unstable/reactivity/AtomRegistry' },
  Result: { binding: 'AsyncResult', module: 'effect/unstable/reactivity/AsyncResult' },
};

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const files = execFileSync(
  'grep',
  [
    '-rlE',
    "from '(effect|@effect-atom|@effect/)",
    '--include=*.ts',
    '--include=*.tsx',
    ...(paths.length ? paths : ['packages', 'tools']),
  ],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter(Boolean);

const counts = {};
const bump = (key) => (counts[key] = (counts[key] ?? 0) + 1);
let changedFiles = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  let source = before;

  for (const [from, to] of Object.entries(MODULES)) {
    const pattern = new RegExp(`(from\\s+')${from}(')`, 'g');
    source = source.replace(pattern, (_match, head, tail) => (bump(`module ${from}`), `${head}${to}${tail}`));
  }

  // Rebind `Either` to `Result`, both at the import site and at every use.
  for (const [from, { binding, module }] of Object.entries(NAMESPACE_BINDINGS)) {
    const imported = new RegExp(`^(import (?:type )?\\* as )${from}( from '${module}';)$`, 'gm');
    if (imported.test(source)) {
      source = source.replace(imported, `$1${binding}$2`);
      source = source.replace(new RegExp(`\\b${from}\\.`, 'g'), () => (bump(`binding ${from}`), `${binding}.`));
    }
  }

  for (const [namespace, renames] of Object.entries(MEMBERS)) {
    for (const [from, to] of Object.entries(renames)) {
      const pattern = new RegExp(`\\b${namespace}\\.${from}\\b`, 'g');
      source = source.replace(pattern, () => (bump(`${namespace}.${from}`), `${namespace}.${to}`));
    }
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
