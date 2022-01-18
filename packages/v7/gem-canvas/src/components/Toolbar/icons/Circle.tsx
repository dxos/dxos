//
// Copyright 2022 DXOS.org
//

import React from 'react';

// Icons: https://styled-icons.dev/?s=material-outlined
const PATH = 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z';

export const Circle = (props = { width: 24, height: 24 }) => (
  <svg {...props} viewBox='0 0 24 24'>
    <path d={PATH} />
  </svg>
);
