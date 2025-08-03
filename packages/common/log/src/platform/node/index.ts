//
// Copyright 2022 DXOS.org
//

import fs from 'node:fs';

import yaml from 'js-yaml';

import { type LogOptions } from '../../config';

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
      console.warn(`Invalid log file: ${filepath}`);
    }
  }
};
