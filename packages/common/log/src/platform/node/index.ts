//
// Copyright 2022 DXOS.org
//

import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

import { LogOptions } from '../../config';
import { log } from '../../log';

/**
 * Node config loader.
 */
export const loadOptions = (filepath?: string): LogOptions | undefined => {
  if (filepath) {
    const fullpath = path.join(process.cwd(), filepath);
    log(`Log file: ${fullpath}`);
    try {
      const text = fs.readFileSync(fullpath, 'utf-8');
      if (text) {
        return yaml.load(text) as LogOptions;
      }
    } catch (err) {
      console.warn(`Invalid log file: ${fullpath}`);
    }
  }
};
