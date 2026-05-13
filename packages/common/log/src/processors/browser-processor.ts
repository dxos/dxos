//
// Copyright 2022 DXOS.org
//

import { safariCheck } from '@dxos/util';

import { LogLevel } from '../config';
import { type LogProcessor, getContextFromEntry, shouldLog } from '../context';

type Config = {
  useTestProcessor: boolean;
  printFileLinks: boolean;
};

const CONFIG: Config = {
  useTestProcessor: false,
  printFileLinks: false,
};

/**
 * For running apps in the browser normally.
 */
const APP_BROWSER_PROCESSOR: LogProcessor = (config, entry) => {
  if (!shouldLog(entry, config.filters)) {
    return;
  }

  // Example local editor prefix: 'vscode://file/Users/burdon/Code/dxos/dxos/'.
  const LOG_BROWSER_PREFIX = config.prefix ?? 'https://vscode.dev/github.com/dxos/dxos/blob/main/';

  // TODO(burdon): CSS breaks formatting (e.g., [Object] rather than expandable property).
  // TODO(burdon): Consider custom formatters.
  //  https://www.mattzeunert.com/2016/02/19/custom-chrome-devtools-object-formatters.html
  // NOTE: Cannot change color of link (from bright white).
  // const LOG_BROWSER_CSS = ['color:gray; font-size:10px; padding-bottom: 4px', 'color:#B97852; font-size:14px;'];
  const LOG_BROWSER_CSS: string[] = [];

  const { filename, line: lineNumber, context: scopeDebugName } = entry.computedMeta;

  let link = '';
  if (filename !== undefined && lineNumber !== undefined) {
    const filepath = `${LOG_BROWSER_PREFIX.replace(/\/$/, '')}/${filename}`;
    // TODO(burdon): Line numbers not working for app link, even with colons.
    //  https://stackoverflow.com/a/54459820/2804332
    link = `${filepath}#L${lineNumber}`;
  }

  let args = [];

  const scope = entry.meta?.S;
  if (scope) {
    const scopeName = scope.name || scopeDebugName;
    if (scopeName) {
      const processPrefix = scope.hostSessionId ? '[worker] ' : '';
      // TODO(dmaretskyi): Those can be made clickable with a custom formatter.
      args.push(`%c${processPrefix}${scopeName}`, 'color:#C026D3;font-weight:bold');
    }
  }

  if (entry.message) {
    args.push(entry.message);
  }

  const context = getContextFromEntry(entry);
  if (context) {
    if (Object.keys(context).length === 1 && 'error' in context) {
      args.push(unwrapEffectError(context.error));
    } else if (Object.keys(context).length === 1 && 'err' in context) {
      args.push(unwrapEffectError(context.err));
    } else {
      args.push(context);
    }
  }

  // https://github.com/cloudflare/workers-sdk/issues/5591
  const levels: any = {
    [LogLevel.ERROR]: console.error.bind(console),
    [LogLevel.WARN]: console.warn.bind(console),
    [LogLevel.DEBUG]: console.log.bind(console),
  };

  // Safari prints source code location as this file, not the caller.
  if (CONFIG.printFileLinks || safariCheck()) {
    if (LOG_BROWSER_CSS?.length) {
      args = [`%c${link}\n%c${args.join(' ')}`, ...LOG_BROWSER_CSS];
    } else {
      args = [link + '\n', ...args];
    }
  }

  // https://github.com/cloudflare/workers-sdk/issues/5591
  const level = levels[entry.level] ?? console.log.bind(console);
  if (typeof entry.meta?.C === 'function') {
    entry.meta.C(level, args);
  } else {
    level(...args);
  }
};

/**
 * For running unit tests in the headless browser.
 */
const TEST_BROWSER_PROCESSOR: LogProcessor = (config, entry) => {
  if (!shouldLog(entry, config.filters)) {
    return;
  }

  const { filename, line: lineNumber } = entry.computedMeta;
  const path = filename !== undefined && lineNumber !== undefined ? `${filename}:${lineNumber}` : '';

  let args = [];

  const processPrefix = entry.meta?.S?.hostSessionId ? '[worker] ' : '';
  args.push(`${processPrefix}${entry.message}`);

  const context = getContextFromEntry(entry);
  if (context) {
    args.push(context);
  }

  const levels: any = {
    [LogLevel.ERROR]: console.error,
    [LogLevel.WARN]: console.warn,
    [LogLevel.DEBUG]: console.log,
  };

  if (CONFIG.printFileLinks) {
    args = [path, ...args];
  }

  const level = levels[entry.level] ?? console.log;
  if (typeof entry.meta?.C === 'function') {
    entry.meta.C(level, args);
  } else {
    level(...args);
  }
};

export const BROWSER_PROCESSOR: LogProcessor = CONFIG.useTestProcessor ? TEST_BROWSER_PROCESSOR : APP_BROWSER_PROCESSOR;

// effect-specific
const originalSymbol = Symbol.for('effect/OriginalAnnotation');

const unwrapEffectError = (error: any) => {
  if (typeof error === 'object' && error !== null && originalSymbol in error) {
    return error[originalSymbol];
  }
  return error;
};
