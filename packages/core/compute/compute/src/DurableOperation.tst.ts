//
// Copyright 2026 DXOS.org
//

// This file needs invalid usage, so the diagnostic reporting it is the assertion.
/** @effect-diagnostics unnecessaryEffectGen:skip-file */

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'tstyche';

import * as Operation from './Operation.ts';
import * as StorageService from './StorageService.ts';

class DeclaredService extends Context.Service<DeclaredService, { declared: () => void }>()('@test/DeclaredService') {}
class UndeclaredService extends Context.Service<UndeclaredService, { undeclared: () => void }>()(
  '@test/UndeclaredService',
) {}

const rpcs = RpcGroup.make(Rpc.make('getValue', { success: Schema.Number }));

const definition = Operation.makeDurable({
  key: 'test.durable',
  input: Schema.String,
  output: Schema.Number,
  services: [DeclaredService],
});

const withRpcs = Operation.makeDurable({
  key: 'test.durable-rpcs',
  input: Schema.Void,
  output: Schema.Void,
  services: [],
  rpcs,
});

describe('Operation.makeDurable', () => {
  it('infers input, output and services from the props', () => {
    expect(definition).type.toBe<Operation.DurableDefinition<string, number, DeclaredService, never>>();
    expect<Operation.DurableDefinition.Input<typeof definition>>().type.toBe<string>();
    expect<Operation.DurableDefinition.Output<typeof definition>>().type.toBe<number>();
    expect<Operation.DurableDefinition.Requirements<typeof definition>>().type.toBe<DeclaredService>();
  });

  it('carries the declared RPC group', () => {
    expect<Operation.DurableDefinition.Rpcs<typeof withRpcs>>().type.toBe<RpcGroup.Rpcs<typeof rpcs>>();
  });

  it('rejects unknown props', () => {
    expect(
      Operation.makeDurable({
        key: 'test.durable',
        input: Schema.Void,
        output: Schema.Void,
        services: [],
        unknown: true,
      }),
    ).type.toRaiseError();
  });

  it('is not runnable without a handler', () => {
    expect(definition).type.not.toBeAssignableTo<Operation.Durable.Any>();
    expect(definition).type.not.toHaveProperty('create');
  });
});

describe('Operation.withDurableHandler', () => {
  it('produces a durable operation when called directly', () => {
    expect(Operation.withDurableHandler(definition, () => Effect.succeed({}))).type.toBe<
      Operation.Durable<string, number, DeclaredService, never>
    >();
  });

  it('produces a durable operation when piped', () => {
    const durable = definition.pipe(Operation.withDurableHandler(() => Effect.succeed({})));
    expect(durable).type.toBe<Operation.Durable<string, number, DeclaredService, never>>();
    expect(durable).type.toBeAssignableTo<Operation.Durable.Any>();
  });

  it('types the input and output through the context', () => {
    expect(
      definition.pipe(
        Operation.withDurableHandler((ctx) =>
          Effect.succeed({
            onInput: (input) => Effect.sync(() => ctx.submitOutput(input.length)),
          }),
        ),
      ),
    ).type.not.toRaiseError();

    expect(
      definition.pipe(
        Operation.withDurableHandler((ctx) =>
          Effect.succeed({
            onInput: (input) => Effect.sync(() => ctx.submitOutput(input)),
          }),
        ),
      ),
    ).type.toRaiseError("Argument of type 'string' is not assignable to parameter of type 'number'.");
  });

  it('accepts declared and base services', () => {
    expect(
      Operation.withDurableHandler(definition, () =>
        Effect.gen(function* () {
          yield* DeclaredService;
          yield* StorageService.StorageService;
          return {};
        }),
      ),
    ).type.not.toRaiseError();
  });

  it('rejects a service the definition does not declare', () => {
    expect(
      Operation.withDurableHandler(definition, () =>
        Effect.gen(function* () {
          yield* UndeclaredService;
          return {};
        }),
      ),
    ).type.toRaiseError();
  });

  it('rejects a callback that does not match the handler', () => {
    expect(
      Operation.withDurableHandler(definition, () => Effect.succeed({ onInput: (_input: number) => Effect.void })),
    ).type.toRaiseError();
  });

  it('types RPC handlers against the declared group', () => {
    expect(
      withRpcs.pipe(
        Operation.withDurableHandler(() =>
          Effect.gen(function* () {
            return { rpcHandlers: yield* rpcs.toHandlers({ getValue: () => Effect.succeed(1) }) };
          }),
        ),
      ),
    ).type.toBe<Operation.Durable<void, void, never, RpcGroup.Rpcs<typeof rpcs>>>();

    expect(
      withRpcs.pipe(
        Operation.withDurableHandler(() =>
          Effect.gen(function* () {
            return { rpcHandlers: yield* rpcs.toHandlers({ getValue: () => Effect.succeed('one') }) };
          }),
        ),
      ),
    ).type.toRaiseError();
  });
});
