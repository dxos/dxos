//
// Copyright 2022 DXOS.org
//

import fs from 'fs';

export const loadJson = (filename: string) => {
  const json = fs.readFileSync(filename, 'utf-8');
  return json ? JSON.parse(json) : undefined;
};

export const sortJson = (json: any, fixedFields: string[]) => {
  const keys = [...fixedFields, ...Object.keys(json).filter(key => fixedFields.indexOf(key) === -1)];
  return keys.reduce<{ [index: string]: any }>((result, key) => {
    result[key] = json[key];
    return result;
  }, {});
};
