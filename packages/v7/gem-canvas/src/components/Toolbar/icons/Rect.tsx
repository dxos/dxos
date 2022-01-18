//
// Copyright 2022 DXOS.org
//

import React from 'react';

// Icons: https://styled-icons.dev/?s=material-outlined
const PATH = 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z';

export const Rect = (props = { width: 24, height: 24 }) => (
  <svg {...props} viewBox='0 0 24 24'>
    <path d={PATH} />
  </svg>
);
