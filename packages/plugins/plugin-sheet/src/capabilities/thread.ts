//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { ThreadCapabilities } from '@dxos/plugin-space';

import { compareIndexPositions, SheetType } from '../types';

export default () =>
  contributes(ThreadCapabilities.Thread, {
    predicate: (data) => data instanceof SheetType,
    createSort: (sheet) => (indexA, indexB) => (!indexA || !indexB ? 0 : compareIndexPositions(sheet, indexA, indexB)),
  });
