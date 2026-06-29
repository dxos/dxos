//
// Copyright 2025 DXOS.org
//

/* eslint-disable no-console */

import { LogLevel, type LogProcessor, log, shouldLog } from '@dxos/log';

export const setupFunctionsLogger = () => {
  log.runtimeConfig.processors.length = 0;
  log.runtimeConfig.processors.push(functionLogProcessor);
};

const functionLogProcessor: LogProcessor = (config, entry) => {
  if (!shouldLog(entry, config.filters)) {
    return;
  }

  const context = entry.computedContext;
  const error = entry.computedError;
  const extras = [Object.keys(context).length > 0 ? context : undefined, error].filter((value) => value !== undefined);

  switch (entry.level) {
    case LogLevel.DEBUG:
    case LogLevel.TRACE:
      console.debug(entry.message, ...extras);
      break;
    case LogLevel.VERBOSE:
      console.log(entry.message, ...extras);
      break;
    case LogLevel.INFO:
      console.info(entry.message, ...extras);
      break;
    case LogLevel.WARN:
      console.warn(entry.message, ...extras);
      break;
    case LogLevel.ERROR:
      console.error(entry.message, ...extras);
      break;
    default:
      console.log(entry.message, ...extras);
      break;
  }
};
