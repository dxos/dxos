//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode } from 'react';

export const Container: FC<{
  children: ReactNode
}> = ({
  children
}) => {
  return (
    <div style={{
      display: 'flex',
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        flex: 1,
        maxHeight: '100%',
        backgroundColor: '#FAFAFA'
      }}>
        {children}
      </div>
    </div>
  );
};
