//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import { tailwindConfig, type TailwindConfig } from '@dxos/react-ui-theme';

export const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

/**
 * https://codemirror.net/examples/styling
 */
export const theme = {
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-placeholder': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
  },
  '& .cm-scroller': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
    overflow: 'visible',
  },
  '.cm-custom': {
    color: 'darkblue',
  },
};
