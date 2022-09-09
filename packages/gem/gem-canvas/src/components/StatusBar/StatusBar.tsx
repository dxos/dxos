//
// Copyright 2022 DXOS.org
//

import React from 'react';

export interface StatusBarProps {
  data: any
}

export const StatusBar = ({ data }: StatusBarProps) => {
  return (
  <div style={{
    backgroundColor: '#666',
    color: '#EEE',
    padding: 4,
    fontFamily: 'sans-serif',
    fontWeight: 100
  }}>
    {JSON.stringify(data)}
  </div>
  );
};
