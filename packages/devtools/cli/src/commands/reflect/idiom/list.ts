//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { scanIdioms } from '@dxos/introspect/idioms';

import { findMonorepoRoot } from '../util';

const handler = Effect.fn(function* ({ root }: { root: string }) {
  const { json } = yield* CommandConfig;
  const rootPath = yield* Effect.tryPromise(() => findMonorepoRoot(root));
  const idioms = yield* Effect.tryPromise(() => scanIdioms({ rootPath }));

  if (json) {
    yield* Console.log(JSON.stringify(idioms, null, 2));
    return;
  }

  if (idioms.length === 0) {
    yield* Console.log('No idioms found.');
    return;
  }

  for (const idiom of idioms) {
    const host = idiom.host;
    const target = host.symbol ? ` ${host.symbol}` : '';
    yield* Console.log(`${idiom.slug}  (${host.kind})  ${host.file}:${host.line}${target}`);
    if (idiom.applies) {
      yield* Console.log(`  applies:    ${idiom.applies}`);
    }
    if (idiom.insteadOf) {
      yield* Console.log(`  instead-of: ${idiom.insteadOf}`);
    }
    if (idiom.uses.length > 0) {
      yield* Console.log(`  uses:       ${idiom.uses.join(', ')}`);
    }
    if (idiom.related.length > 0) {
      yield* Console.log(`  related:    ${idiom.related.join(', ')}`);
    }
  }
  yield* Console.log(`\n${idioms.length} idiom${idioms.length === 1 ? '' : 's'}.`);
});

export const list = Command.make(
  'list',
  {
    root: Options.text('root').pipe(
      Options.withDescription('Monorepo root (defaults to nearest pnpm-workspace.yaml ancestor of cwd).'),
      Options.withDefault(process.cwd()),
    ),
  },
  handler,
).pipe(Command.withDescription('List idioms discovered across the monorepo.'));
