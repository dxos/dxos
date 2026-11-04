//
// Copyright 2026 DXOS.org
//

import { type SpecIndex } from '@dxos/deus/spec-index';

import specIndex from './gen/spec-index.json';

/** Every spec in the dxos repository by id, generated at build time by `deus index` (moon `prebuild-spec-index`). */
export const SPEC_INDEX: SpecIndex = specIndex;
