//
// Copyright 2020 DXOS.org
//

import { css } from '@emotion/css';

export const styles = {
  knobs: css`
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 8px;
  `,

  // TODO(burdon): Factor out.
  linker: css`
    .linker {
      path {
        stroke: orange;
        stroke-dasharray: 10, 5;
      }
      path::marker {
        stroke: red;
      }
    }
  `
};
