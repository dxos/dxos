//
// Copyright 2022 DXOS.org
//

import { LogLevel } from '../config';
import { LogProcessor, shouldLog } from '../context';

const getRelativeFilename = (filename: string) => {
  // TODO(burdon): Hack uses "packages" as an anchor (pre-parse NX?)
  // Including `packages/` part of the path so that excluded paths (e.g. from dist) are clickable in vscode.
  const match = filename.match(/.+\/(packages\/.+\/.+)/);
  if (match) {
    const [, filePath] = match;
    return filePath;
  }

  return filename;
};

type Config = {
  useTestProcessor: boolean;
  printFileLinks: boolean;
};

const CONFIG: Config =
  typeof mochaExecutor !== 'undefined'
    ? {
        useTestProcessor: true,
        printFileLinks: true
      }
    : {
        useTestProcessor: false,
        printFileLinks: false
      };

/**
 * For running apps in the browser normally.
 */
const APP_BROWSER_PROCESSOR: LogProcessor = (config, entry) => {
  if (!shouldLog(config, entry.level, entry.meta?.file ?? '')) {
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

  let link = '';
  if (entry.meta) {
    const filename = getRelativeFilename(entry.meta.file);
    const filepath = `${LOG_BROWSER_PREFIX.replace(/\/$/, '')}/${filename}`;
    // TODO(burdon): Line numbers not working for app link, even with colons.
    //   https://stackoverflow.com/a/54459820/2804332
    link = `${filepath}#L${entry.meta.line}`;
  }

  let args = [];
  args.push(entry.message);
  if (entry.context && Object.keys(entry.context).length > 0) {
    args.push(entry.context);
  }

  const levels: any = {
    [LogLevel.ERROR]: console.error,
    [LogLevel.WARN]: console.warn,
    [LogLevel.DEBUG]: console.log
  };

  if (CONFIG.printFileLinks) {
    if (LOG_BROWSER_CSS?.length) {
      args = [`%c${link}\n%c${args.join(' ')}`, ...LOG_BROWSER_CSS];
    } else {
      args = [link + '\n', ...args];
    }
  }

  const level = levels[entry.level] ?? console.log;
  if (typeof entry.meta?.callSite === 'function') {
    entry.meta.callSite(level, args);
  } else {
    level(...args);
  }
};

/**
 * For running unit tests in the headless browser.
 */
const TEST_BROWSER_PROCESSOR: LogProcessor = (config, entry) => {
  if (!shouldLog(config, entry.level, entry.meta?.file ?? '')) {
    return;
  }

  let path = '';
  if (entry.meta) {
    path = `${getRelativeFilename(entry.meta.file)}:${entry.meta.line}`;
  }

  let args = [];
  args.push(entry.message);
  if (entry.context && Object.keys(entry.context).length > 0) {
    args.push(entry.context);
  }

  const levels: any = {
    [LogLevel.ERROR]: console.error,
    [LogLevel.WARN]: console.warn,
    [LogLevel.DEBUG]: console.log
  };

  if (CONFIG.printFileLinks) {
    args = [path, ...args];
  }

  const level = levels[entry.level] ?? console.log;
  if (typeof entry.meta?.callSite === 'function') {
    entry.meta.callSite(level, args);
  } else {
    level(...args);
  }
};

export const BROWSER_PROCESSOR: LogProcessor = CONFIG.useTestProcessor ? TEST_BROWSER_PROCESSOR : APP_BROWSER_PROCESSOR;
