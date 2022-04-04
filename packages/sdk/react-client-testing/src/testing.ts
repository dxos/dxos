//
// Copyright 2022 DXOS.org
//

import { TestType } from './builders';

const format = (text: string) => text.replace(/\)\./g, ')\n  .');

export const defaultSelectionText = format(
  `select().filter({ type: '${TestType.Org}' }).children().filter({ type: '${TestType.Project}' })`
);
