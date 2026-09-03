//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { LogLevel, log } from '@dxos/log';

import { LoggingServiceImpl } from './logging-service.ts';

describe('LoggingService', () => {
  let loggingService: LoggingServiceImpl;

  beforeEach(async () => {
    loggingService = new LoggingServiceImpl();
    await loggingService.open();
  });

  afterEach(async () => {
    await loggingService.close();
  });

  /**
   * Repeats `emit` until the reader completes.
   *
   * v4 does not run a forked fiber before its parent's next step, so a single emission can land
   * before the forked subscription has registered its log handler and be lost.
   */
  const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, emit: () => void) =>
    Effect.gen(function* () {
      const reader = yield* Effect.forkChild(read);
      const emitter = yield* Effect.forkChild(
        Effect.sync(emit).pipe(Effect.andThen(Effect.sleep('5 millis')), Effect.forever),
      );
      const entry = Option.getOrThrow(yield* Fiber.join(reader));
      yield* Fiber.interrupt(emitter);
      return entry;
    });

  test('queryLogs streams logs', async () => {
    const message = 'Hello World!';
    const entry = await EffectEx.runPromise(
      readWhileEmitting(Stream.runHead(loggingService['LoggingService.queryLogs']({})), () => log(message)),
    );
    expect(entry.message).to.eq(message);
    expect(entry.level).to.eq(LogLevel.DEBUG);
  });

  test('queryLogs filters logs', async () => {
    const message = 'This is a failure';
    const entry = await EffectEx.runPromise(
      readWhileEmitting(
        Stream.runHead(loggingService['LoggingService.queryLogs']({ filters: [{ level: LogLevel.ERROR }] })),
        () => {
          log('debugging something');
          log.error(message);
        },
      ),
    );
    expect(entry.message).to.eq(message);
    expect(entry.level).to.eq(LogLevel.ERROR);
  });
});
