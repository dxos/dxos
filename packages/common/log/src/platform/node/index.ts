//
// Copyright 2022 DXOS.org
//

import yaml from 'js-yaml';
import fs, { mkdirSync } from 'node:fs';
import path from 'node:path';

import { LogLevel, type LogOptions } from '../../config';
import { type LogProcessor } from '../../context';
import { createFileProcessor, LogEntryFormat } from '../../processors';

export const materializeLogStream = (outDir: string): LogProcessor => {
  if (!fs.existsSync(outDir)) {
    mkdirSync(outDir);
  }
  return createFileProcessor({
    pathOrFd: path.join(outDir, 'full-log.txt'),
    levels: [LogLevel.DEBUG],
    entryFormat: LogEntryFormat.TEXT,
  });
};

/**
 * Node config loader.
 */
export const loadOptions = (filepath?: string): LogOptions | undefined => {
  if (filepath) {
    // console.log(`Log file: ${fullpath}`);
    try {
      const text = fs.readFileSync(filepath, 'utf-8');
      if (text) {
        return yaml.load(text) as LogOptions;
      }
    } catch (err) {
      console.warn(`Invalid log file: ${filepath}`, err);
    }
  }
};
