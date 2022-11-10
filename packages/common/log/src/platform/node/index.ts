//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

import { LogOptions } from '../../config';

/**
 * Node config loader.
 */
export const loadOptions = (filepath?: string): LogOptions | undefined => {
  if (filepath) {
    const fullpath = path.join(process.cwd(), filepath);
    console.log(`Log file: ${fullpath}`);
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
