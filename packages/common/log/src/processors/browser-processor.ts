//
// Copyright 2022 DXOS.org
//

import path from 'node:path';

import { LogLevel, shortLevelName } from '../config';
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

  const args = [];

  if (entry.meta) {
    const server = 'https://vscode.dev/github.com';
    const repo = 'dxos/dxos';
    const branch = 'main';
    const filename = getRelativeFilename(entry.meta.file);
    const filepath = path.join(server, repo, 'blob', branch, filename);
    args.push(`${filepath}#L${entry.meta.line}`);
  }

  // TODO(burdon): https://javascript.plainenglish.io/adding-css-to-console-log-dde2e167ee7a

  args.push(`${shortLevelName[entry.level]}\n${entry.message}`);

  if (entry.context && Object.keys(entry.context).length > 0) {
    args.push(entry.context);
  }

  switch (entry.level) {
    case LogLevel.ERROR: {
      console.error(...args);
      break;
    }
    case LogLevel.WARN: {
      console.warn(...args);
      break;
    }
    default: {
      console.log(...args);
    }
  }
};
