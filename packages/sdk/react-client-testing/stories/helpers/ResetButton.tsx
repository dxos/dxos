//
// Copyright 2022 DXOS.org
//

import React from 'react';

interface ResetButtonProps {
  onReset: () => void;
}

export const ResetButton = ({ onReset }: ResetButtonProps) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      height: 'fit-content'
    }}
  >
    <button
      onClick={onReset}
      style={{
        backgroundColor: 'white',
        border: '1px solid rgba(0,0,0,0.3)',
        borderRadius: '5px',
        fontSize: '12px'
      }}
    >
      Reset
    </button>
  </div>
);
