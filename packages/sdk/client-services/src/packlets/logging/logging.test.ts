//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { log, LogLevel } from '@dxos/log';
import { type LogEntry } from '@dxos/protocols/proto/dxos/client/services';
import { beforeEach, describe, test } from '@dxos/test';

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
    loggingService.queryLogs({}).subscribe((entry) => {
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
    loggingService.queryLogs({ filters: [{ level: LogLevel.ERROR }] }).subscribe((entry) => {
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
