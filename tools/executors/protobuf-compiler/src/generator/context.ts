//
// Copyright 2022 DXOS.org
//

import { SubstitutionsMap } from '../parser/index.js';

export interface GeneratorContext {
  outputFilename: string
  subs: SubstitutionsMap
}
