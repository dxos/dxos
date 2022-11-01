//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';

import { LogOptions } from '../../config';

export const loadOptions = (filepath?: string): LogOptions | undefined => {
  if (filepath) {
    const text = fs.readFileSync(filepath, 'utf-8');
    if (text) {
      return yaml.load(text) as LogOptions;
    }
  }
};
