//
// Copyright 2025 DXOS.org
//

import { Effect, type LogLevel, Logger } from 'effect';

type LogEntry = {
  logLevel: LogLevel.LogLevel;
  /** Array of log args. */
  // TODO(burdon): Rename args.
  message: unknown;
};

export class TestLogger {
  static readonly layer = (logger: TestLogger) => Logger.replace(Logger.defaultLogger, logger.logger);

  private logs: Array<LogEntry> = [];

  get count() {
    return this.logs.length;
  }

  get lastLog() {
    return this.logs[this.logs.length - 1];
  }

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

  // TODO(burdon): Support regexp.
  getLogsByMessage(message: string) {
    // TODO(burdon): log.message is always an array?
    return this.logs.filter((log) => typeof log.message === 'string' && log.message.includes(message));
  }

  getLogsByFunction(predicate: (log: LogEntry) => boolean) {
    return this.logs.filter(predicate);
  }

  hasLog(predicate: (log: LogEntry) => boolean) {
    return this.logs.some(predicate);
  }

  clear() {
    this.logs = [];
  }
}
