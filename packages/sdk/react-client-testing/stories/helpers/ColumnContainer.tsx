//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties, ReactNode } from 'react';

const MARGIN_TOP = 8;

interface ColumnContainerProps {
  topComponent: ReactNode;
  bottomComponent: ReactNode;
  config: {
    fixedComponent: 'top' | 'bottom';
    height: string;
  };
}
export const ColumnContainer = ({
  topComponent,
  bottomComponent,
  config
}: ColumnContainerProps) => {
  const getFixedStyle = (margin = false): CSSProperties => ({
    height: config.height,
    overflowY: 'scroll',
    marginTop: margin ? MARGIN_TOP : undefined
  });

  const getFlexibleStyle = (margin = false): CSSProperties => ({
    maxHeight: `calc(100% - ${config.height} - ${!margin ? MARGIN_TOP : 0}px)`,
    minHeight: `calc(100% - ${config.height} - ${!margin ? MARGIN_TOP : 0}px)`
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'inherit',
        gap: '8px'
      }}
    >
      <div
        style={
          config.fixedComponent === 'top'
            ? getFixedStyle()
            : getFlexibleStyle(true)
        }
      >
        {topComponent}
      </div>
      <div
        style={
          config.fixedComponent === 'bottom'
            ? getFixedStyle(true)
            : getFlexibleStyle()
        }
      >
        {bottomComponent}
      </div>
    </div>
  );
};
