//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

export type SpaceTileProps = {
  children: ReactNode;
};

// TODO(burdon): Generic object list tile for all types.
export const SpaceTile: FC<SpaceTileProps> = ({ children }) => {
  return <div>{children}</div>;
};
