//
// Copyright 2024 DXOS.org
//

import { Facet } from '@codemirror/state';

import { invariant } from '@dxos/invariant';

export const documentId = Facet.define<string, string>({
  combine: (providers) => {
    invariant(providers.length <= 1);
    return providers[0];
  },
});
