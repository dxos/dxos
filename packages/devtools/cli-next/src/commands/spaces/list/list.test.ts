//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ClientService } from '../../../services';
import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './list';

Test.describe('spaces list', () => {
  Test.it('should list empty space list', () =>
    Effect.gen(function* () {
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      Test.expect(logs).toHaveLength(1);
      Test.expect(logs[0].args).toEqual(['[]']);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, Effect.runPromise),
  );

  Test.it('should list spaces', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.create());
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      Test.expect(logs).toHaveLength(1);
      const formattedSpaces = JSON.parse(logs[0].args as string);
      Test.expect(formattedSpaces).toHaveLength(2);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, Effect.runPromise),
  );
});
