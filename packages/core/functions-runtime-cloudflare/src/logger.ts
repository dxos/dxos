import { log, type LogProcessor, LogLevel, shouldLog } from '@dxos/log';

export const setupFunctionsLogger = () => {
  log.runtimeConfig.processors.length = 0;
  log.runtimeConfig.processors.push(functionLogProcessor);
};

const functionLogProcessor: LogProcessor = (config, entry) => {
  if (!shouldLog(entry, config.filters)) {
    return;
  }

  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(entry.message, entry.context);
      break;
    case LogLevel.TRACE:
      console.debug(entry.message, entry.context);
      break;
    case LogLevel.VERBOSE:
      console.log(entry.message, entry.context);
      break;
    case LogLevel.INFO:
      console.info(entry.message, entry.context);
      break;
    case LogLevel.WARN:
      console.warn(entry.message, entry.context);
      break;
    case LogLevel.ERROR:
      console.error(entry.message, entry.context);
      break;
    default:
      console.log(entry.message, entry.context);
      break;
  }
};
