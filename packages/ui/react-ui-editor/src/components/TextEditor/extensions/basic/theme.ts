//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import { type StyleSpec } from 'style-mod';

import { tokens } from '../../../../styles';

/**
 * Minimal styles.
 * NOTE: The '&' prefix denotes the CM editor root.
 * https://codemirror.net/examples/styling
 */
// TODO(burdon): Remove?
export const basicTheme: {
  [selector: string]: StyleSpec;
} = {
  '&.cm-focused': {
    outline: 'none',
  },
  '& .cm-line': {
    paddingInline: 0,
    lineHeight: 1.6,
    minBlockSize: '1.6em',
  },
  '& .cm-line *': {
    lineHeight: 1.6,
  },
  '& .cm-scroller': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
    overflow: 'visible',
  },
  '& .cm-content': {
    padding: 0,
    caretColor: 'black',
  },
  '.dark & .cm-content': {
    caretColor: 'white',
  },
  '& .cm-tooltip': {
    backgroundColor: 'transparent',
    border: 'none',
  },
  '& .cm-link': {
    color: get(tokens, 'extend.colors.primary.500'),
    textDecoration: 'underline',
  },
};
