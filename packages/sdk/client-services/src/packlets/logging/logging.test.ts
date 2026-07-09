//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { LogLevel, log } from '@dxos/log';

import { LoggingServiceImpl } from './logging-service';

describe('LoggingService', () => {
  let loggingService: LoggingServiceImpl;

  beforeEach(async () => {
    loggingService = new LoggingServiceImpl();
    await loggingService.open();
  });

  afterEach(async () => {
    await loggingService.close();
  });

  test('queryLogs streams logs', async () => {
    const message = 'Hello World!';
    const entry = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.fork(Stream.runHead(loggingService['LoggingService.queryLogs']({})));
        // Yield so the forked subscription registers its log handler before emitting.
        yield* Effect.yieldNow();
        yield* Effect.sync(() => log(message));
        return Option.getOrThrow(yield* Fiber.join(fiber));
      }),
    );
    expect(entry.message).to.eq(message);
    expect(entry.level).to.eq(LogLevel.DEBUG);
  });

  test('queryLogs filters logs', async () => {
    const message = 'This is a failure';
    const entry = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.fork(
          Stream.runHead(loggingService['LoggingService.queryLogs']({ filters: [{ level: LogLevel.ERROR }] })),
        );
        // Yield so the forked subscription registers its log handler before emitting.
        yield* Effect.yieldNow();
        yield* Effect.sync(() => {
          log('debugging something');
          log.error(message);
        });
        return Option.getOrThrow(yield* Fiber.join(fiber));
      }),
    );
    expect(entry.message).to.eq(message);
    expect(entry.level).to.eq(LogLevel.ERROR);
  });
});
