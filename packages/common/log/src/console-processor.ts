import { inspect } from "util";
import { LogLevel, logLevelIndex, LogProcessor } from "./log";

const minLogLevel = logLevelIndex((process.env.DX_LOG_LEVEL?.toLowerCase() ?? 'info') as LogLevel);

export const CONSOLE_PROCESSOR: LogProcessor = entry => {
  if (logLevelIndex(entry.level) < minLogLevel) {
    return;
  }

  const level = entry.level.toUpperCase().padEnd(5);

  let buffer = '';

  if (entry.meta) {
    buffer += `${entry.meta.file}:${entry.meta.line} `;
  }

  buffer += `${level} ${entry.message}`;

  if(entry.ctx && Object.keys(entry.ctx).length > 0) {
    buffer += ' '
    buffer += inspect(entry.ctx, false, undefined, true);
  }

  console.log(buffer);
}