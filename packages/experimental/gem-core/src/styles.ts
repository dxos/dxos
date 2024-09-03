//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';

export const defaultGridStyles = css`
  path.axis {
    stroke: #cccccc;
  }
  path.major {
    stroke: #f0f0f0;
  }
  path.minor {
    stroke: #f5f5f5;
  }
`;

export const darkGridStyles = css`
  path.axis {
    stroke: #444444;
  }
  path.major {
    stroke: #3a3a3a;
  }
  path.minor {
    stroke: #333;
  }
`;
