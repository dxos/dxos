//
// Copyright 2024 DXOS.org
//

import { Facet } from '@codemirror/state';

export const singleValueFacet = <I, O = I>(defaultValue?: O) =>
  Facet.define<I, O>({
    // Called immediately.
    combine: (providers) => {
      return (providers[0] ?? defaultValue) as O;
    },
  });
