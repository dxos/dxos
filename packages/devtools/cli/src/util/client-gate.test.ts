//
// Copyright 2026 DXOS.org
//

import * as NodeServices from '@effect/platform-node/NodeServices';
import { describe, it } from '@effect/vitest';
import * as Command from 'effect/cli/Command';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import { ClientFree } from '@dxos/cli-util';
import { ClientInitialization } from '@dxos/client';

import { needsClient, runWithClientGate } from './client-gate.ts';

class InitFailed extends Data.TaggedError('InitFailed')<{ readonly message: string }> {}

const initFailed = () => new InitFailed({ message: 'client init failed: profile is locked' });

/** A tree shaped like `dx`'s: a group holding a client-free leaf and a leaf that needs the client. */
const makeTree = (ran: string[]) => {
  const free = Command.make('free', {}, () => Effect.sync(() => ran.push('free'))).pipe(
    Command.annotate(ClientFree, true),
  );
  const needs = Command.make('needs', {}, () => Effect.sync(() => ran.push('needs')));
  const group = Command.make('group').pipe(Command.withSubcommands([free, needs]));
  return Command.make('dx').pipe(Command.withSubcommands([group]));
};

const run = (tree: ReturnType<typeof makeTree>, argv: string[], initialization: Effect.Effect<void, Error>) =>
  runWithClientGate(tree, { version: '0.0.0' })(argv).pipe(
    Effect.provide(Layer.mergeAll(NodeServices.layer, Layer.succeed(ClientInitialization, initialization))),
  );

describe('client gate', () => {
  it('selects the client for leaf commands only, honouring the annotation and non-running flags', ({ expect }) => {
    const tree = makeTree([]);
    expect(needsClient(tree, ['group', 'needs'])).toBe(true);
    expect(needsClient(tree, ['group', 'free'])).toBe(false);
    expect(needsClient(tree, ['group'])).toBe(false);
    expect(needsClient(tree, ['group', 'needs', '--help'])).toBe(false);
  });

  it.effect('runs a client-free command when client initialization fails', ({ expect }) =>
    Effect.gen(function* () {
      const ran: string[] = [];
      yield* run(makeTree(ran), ['group', 'free'], Effect.fail(initFailed()));
      expect(ran).toEqual(['free']);
    }),
  );

  it.effect('runs a client-free command when client initialization never completes', ({ expect }) =>
    Effect.gen(function* () {
      const ran: string[] = [];
      yield* run(makeTree(ran), ['group', 'free'], Effect.never);
      expect(ran).toEqual(['free']);
    }),
  );

  it.effect('fails a command that needs the client with the initialization cause', ({ expect }) =>
    Effect.gen(function* () {
      const ran: string[] = [];
      const exit = yield* run(makeTree(ran), ['group', 'needs'], Effect.fail(initFailed())).pipe(Effect.exit);
      expect(ran).toEqual([]);
      expect(Exit.isFailure(exit) && String(exit.cause)).toContain('profile is locked');
    }),
  );

  it.effect('runs a command that needs the client once it has initialized', ({ expect }) =>
    Effect.gen(function* () {
      const ran: string[] = [];
      yield* run(makeTree(ran), ['group', 'needs'], Effect.void);
      expect(ran).toEqual(['needs']);
    }),
  );
});
