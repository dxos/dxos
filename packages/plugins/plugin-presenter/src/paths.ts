//
// Copyright 2025 DXOS.org
//

import { linkedSegment } from '@dxos/react-ui-attention';

/** Canonical qualified path to the presentation companion node for an object. */
export const getPresentationPath = (objectPath: string): string =>
  `${objectPath}/${linkedSegment('presenter')}`;
