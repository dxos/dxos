//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import React from 'react';

import { Icon } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { renderRoot } from './util';

export type FoldingOptions = {};

/**
 * https://codemirror.net/examples/gutter
 */
export const folding = (_props: FoldingOptions = {}): Extension => [
  codeFolding({
    placeholderDOM: () => document.createElement('div'),
  }),
  foldGutter({
    markerDOM: (open) => {
      return renderRoot(
        document.createElement('div'),
        <Icon icon='ph--caret-right--regular' classNames={[getSize(3), 'm-3 cursor-pointer', open && 'rotate-90']} />,
      );
    },
  }),
];
