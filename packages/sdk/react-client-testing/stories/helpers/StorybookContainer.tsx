//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties, ReactNode } from 'react';

const STORYBOOKS_MARGIN = 16;

interface StorybookContainerProps {
  children: ReactNode;
  style: CSSProperties;
}

export const StorybookContainer = ({
  children,
  style
}: StorybookContainerProps) => (
  <div
    style={{
      height: `calc(100vh - ${STORYBOOKS_MARGIN}px)`,
      ...style
    }}
  >
    {children}
  </div>
);
