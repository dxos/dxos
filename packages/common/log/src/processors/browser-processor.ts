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

export const BROWSER_PROCESSOR: LogProcessor = (config, entry) => {
  if (!shouldLog(config, entry.level, entry.meta?.file ?? '')) {
    return;
  }

  // TODO(burdon): Config repo and branch.
  //  Make easy to switch since line links are bright and noisy.
  const LOG_BROWSER_PREFIX = 'https://vscode.dev/github.com/dxos/dxos/blob/main/';

  // TODO(burdon): Line numbers not working for app link.
  // const LOG_BROWSER_PREFIX = 'vscode://file/Users/burdon/Code/dxos/dxos/';
  // const LOG_BROWSER_PREFIX = '';

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
    link = `${filepath}#L${entry.meta.line}`;
  }

  const args = [];
  args.push(entry.message);
  if (entry.context && Object.keys(entry.context).length > 0) {
    args.push(entry.context);
  }

  const levels: any = {
    [LogLevel.ERROR]: console.error,
    [LogLevel.WARN]: console.warn,
    [LogLevel.DEBUG]: console.log
  };

  const level = levels[entry.level] ?? console.log;
  if (LOG_BROWSER_CSS?.length) {
    level.call(level, `%c${link}\n%c${args.join(' ')}`, ...LOG_BROWSER_CSS);
  } else {
    level.call(level, link + '\n', ...args);
  }
};
