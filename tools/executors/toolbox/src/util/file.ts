//
// Copyright 2022 DXOS.org
//

import fs from 'fs';

export const loadJson = (filename: string) => {
  const json = fs.readFileSync(filename, 'utf-8');
  return json ? JSON.parse(json) : undefined;
};
