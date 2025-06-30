//
// Copyright 2024 DXOS.org
//

import React from 'react';

export type TestProps = {
  label?: string;
  onClick?: () => void;
};

export const Test = ({ label, onClick }: TestProps) => (
  <button onClick={onClick}>
    {label}
  </button>
);
