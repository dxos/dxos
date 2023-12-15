//
// Copyright 2023 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import get from 'lodash.get';

import { tokens, type ThemeStyles } from '../../../../styles';
import { basicTheme } from '../basic';

/**
 * https://codemirror.net/examples/styling
 */
export const markdownTheme: ThemeStyles = defaultsDeep(
  {
    '.cm-scroller': {
      fontFamily: get(tokens, 'fontFamily.mono', []).join(','),
    },
    '.cm-placeholder': {
      fontFamily: get(tokens, 'fontFamily.mono', []).join(','),
    },
  },

  basicTheme,
);
