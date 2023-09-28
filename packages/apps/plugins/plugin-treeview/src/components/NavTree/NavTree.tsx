//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { getDndId, Mosaic, StackTileProps, useMosaic, useMosaicRoot } from '@dxos/aurora-grid';

export const NavTreeRoot = () => {
  const { id } = useMosaicRoot();
  const {
    mosaic: {
      tiles: { [getDndId(id, 'root')]: root },
    },
  } = useMosaic();

  return root ? <Mosaic.Tile {...(root as StackTileProps)} variant='stack' /> : null;
};
