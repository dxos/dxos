//
// Copyright 2022 DXOS.org
//

import React from 'react';

// Icons: https://styled-icons.dev/?s=material-outlined
const PATH = 'M22 12l-4-4v3H3v2h15v3l4-4z';

export const Line = (props = { width: 24, height: 24 }) => (
  <svg {...props} viewBox='0 0 24 24'>
    <path d={PATH} />
  </svg>
);
