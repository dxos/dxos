//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { LogLevel, log } from '@dxos/log';
import { create } from '@dxos/protocols/buf';
import { type LogEntry, QueryLogsRequestSchema } from '@dxos/protocols/buf/dxos/client/logging_pb';

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
    const trigger = new Trigger<LogEntry>();
    loggingService.queryLogs(create(QueryLogsRequestSchema, {})).subscribe((entry) => {
      trigger.wake(entry);
    });
    const message = 'Hello World!';
    log(message);
    const entry = await trigger.wait();
    expect(entry.message).to.eq(message);
    expect(entry.level).to.eq(LogLevel.DEBUG);
  });

  test('queryLogs filters logs', async () => {
    const trigger = new Trigger<LogEntry>();
    loggingService
      .queryLogs(create(QueryLogsRequestSchema, { filters: [{ level: LogLevel.ERROR }] }))
      .subscribe((entry) => {
        trigger.wake(entry);
      });
    log('debugging something');
    const message = 'This is a failure';
    log.error(message);
    const entry = await trigger.wait();
    expect(entry.message).to.eq(message);
    expect(entry.level).to.eq(LogLevel.ERROR);
  });
});
