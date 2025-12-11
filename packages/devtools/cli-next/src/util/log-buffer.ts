//
// Copyright 2025 DXOS.org
//

import { type LogConfig, type LogEntry, LogLevel, type LogProcessor, shouldLog } from '@dxos/log';

export type LogPrinter = Pick<Console, 'debug' | 'log' | 'info' | 'warn' | 'error'>;

export type LogBuffer = {
  processor: LogProcessor;
  replay: (printer?: LogPrinter) => void;
  close: () => void;
};

export const createLogBuffer = (): LogBuffer => {
  let printerCallback: LogPrinter | undefined;
  const buffer: { config: LogConfig; entry: LogEntry }[] = [];

  const processor: LogProcessor = (config, entry) => {
    if (!shouldLog(entry, config.filters)) {
      return;
    }

    if (printerCallback) {
      print(printerCallback, config, entry);
    } else {
      buffer.push({ config, entry });
    }
  };

  const replay = (printer: LogPrinter = console) => {
    printerCallback = printer;
    buffer.forEach(({ config, entry }) => {
      print(printer, config, entry);
    });
    buffer.length = 0;
  };

  const close = () => {
    printerCallback = undefined;
    buffer.length = 0;
  };

  return { processor, replay, close };
};

const print = (printer: LogPrinter, config: LogConfig, entry: LogEntry) => {
  const method = getMethod(entry.level);
  printer[method](formatter(config, entry));
};

const getMethod = (level: LogLevel): keyof LogPrinter => {
  switch (level) {
    case LogLevel.TRACE:
    case LogLevel.DEBUG:
    case LogLevel.VERBOSE:
      return 'debug';
    case LogLevel.INFO:
      return 'info';
    case LogLevel.WARN:
      return 'warn';
    case LogLevel.ERROR:
      return 'error';
    default:
      return 'log';
  }
};

/**
 * Creates a log processor that buffers logs until replayed.
 */
const formatter = (_config: LogConfig, entry: LogEntry) => {
  const { message, context, error } = entry;
  const parts: string[] = [message ?? JSON.stringify(context)];
  if (error) {
    parts.push(String(error));
  }

  return parts.join(' ');
};
