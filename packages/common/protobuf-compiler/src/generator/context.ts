//
// Copyright 2022 DXOS.org
//

import { SubstitutionsMap } from '../parser';

export interface GeneratorContext {
  outputFilename: string;
  subs: SubstitutionsMap;
}
