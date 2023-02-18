//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { FrameDef } from '../../hooks';

/**
 * Viewport for frame.
 */
export const FrameContainer: FC<{ frame: FrameDef }> = ({ frame }) => {
  const Component = frame.runtime.Component;
  if (!Component) {
    return null;
  }

  // TODO(burdon): Standardize container (bg, padding, centered, size, etc.)
  return <Component />;
};
