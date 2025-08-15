//
// Copyright 2025 DXOS.org
//

import { Effect, type LogLevel, Logger } from 'effect';

type LogEntry = {
  logLevel: LogLevel.LogLevel;
  message: unknown;
};

export class TestLogger {
  static layer = (logger: TestLogger) => Logger.replace(Logger.defaultLogger, logger.logger);

  private logs: Array<LogEntry> = [];

  get logger() {
    return Logger.make(({ logLevel, message }) => {
      this.logs.push({ logLevel, message });
      return Effect.void;
    });
  }

  getAllLogs() {
    return [...this.logs];
  }

  getLogsByLevel(level: LogLevel.LogLevel) {
    return this.logs.filter((log) => log.logLevel === level);
  }

  getLogsByMessage(message: string) {
    return this.logs.filter((log) => typeof log.message === 'string' && log.message.includes(message));
  }

  getLogsByFunction(predicate: (log: LogEntry) => boolean) {
    return this.logs.filter(predicate);
  }

  clear() {
    this.logs = [];
  }

  get count() {
    return this.logs.length;
  }

  hasLog(predicate: (log: LogEntry) => boolean) {
    return this.logs.some(predicate);
  }

  get lastLog() {
    return this.logs[this.logs.length - 1];
  }
}
