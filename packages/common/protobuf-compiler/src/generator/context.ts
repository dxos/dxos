//
// Copyright 2022 DXOS.org
//

import { type SubstitutionsMap } from '../parser/index.ts';

export interface GeneratorContext {
  outputFilename: string;
  subs: SubstitutionsMap;
}
