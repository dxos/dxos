//
// Copyright 2022 DXOS.org
//

import { parse } from 'comment-json';
import fs from 'fs';

// TODO(burdon): NOTE: Warn if comments before stripping.
// TODO(burdon): Generalize into template builder.
export const loadJson = (filename: string): any => {
  const json = fs.readFileSync(filename, 'utf-8');
  try {
    return json ? parse(json, undefined, true) : undefined;
  } catch (err) {
    console.error(`Invalid file: ${filename}`, err);
  }
};
