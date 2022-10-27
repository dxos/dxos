//
// Copyright 2020 DXOS.org
//

import { css } from '@emotion/css';

import { typeMeta } from '@dxos/react-client-testing';

export const tableStyles = css`
  ${Object.keys(typeMeta).map((type) => `.${type.replace(/\W/g, '_')} { color: ${typeMeta[type].color[500]}; }`)}
`;

export const graphStyles = css`
  ${Object.keys(typeMeta).map(
    (type) => `g.${type.replace(/\W/g, '_')} { circle { fill: ${typeMeta[type].color[100]}; } }`
  )}
`;
