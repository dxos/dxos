//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { GraphModel, Markers } from '@dxos/gem-spore';
import { Plexus } from '@dxos/plexus';

// TODO(burdon): Type.
const slots = {
  root: undefined,
  grid: {
    className: undefined
  },
  plexus: undefined
};

export type PlexusComponentProps<N> = {
  model: GraphModel<N>;
};

// TODO(burdon): Merge with Graph (shared SVG).
export const PlexusComponent = <N,>({ model }: PlexusComponentProps<N>) => {
  const handleSelect = (node: N) => {
    model.setSelected(model.idAccessor(node));
  };

  // TODO(burdon): Share parent SVG.
  return (
    <SVGContextProvider>
      <SVG className={slots?.root}>
        <Markers arrowSize={6} />
        <Grid className={slots?.grid?.className} />
        <Zoom extent={[1, 4]}>
          <Plexus<N> model={model} slots={slots?.plexus} onSelect={handleSelect} />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};
