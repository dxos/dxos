//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties, ReactNode } from 'react';

const MARGIN_LEFT = 8;

interface RowContainerProps {
  leftComponent: ReactNode;
  rightComponent: ReactNode;
  config: {
    fixedComponent: 'left' | 'right';
    width: string;
  };
}
export const RowContainer = ({
  leftComponent,
  rightComponent,
  config
}: RowContainerProps) => {
  const getFixedStyle = (margin = false): CSSProperties => ({
    width: config.width,
    overflowY: 'scroll',
    marginLeft: margin ? MARGIN_LEFT : undefined
  });

  const getFlexibleStyle = (margin = false): CSSProperties => ({
    maxWidth: `calc(100% - ${config.width} - ${!margin ? MARGIN_LEFT : 0}px)`,
    minWidth: `calc(100% - ${config.width} - ${!margin ? MARGIN_LEFT : 0}px)`
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      <div
        style={
          config.fixedComponent === 'left'
            ? getFixedStyle()
            : getFlexibleStyle(true)
        }
      >
        {leftComponent}
      </div>
      <div
        style={
          config.fixedComponent === 'right'
            ? getFixedStyle(true)
            : getFlexibleStyle()
        }
      >
        {rightComponent}
      </div>
    </div>
  );
};
