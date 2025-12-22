//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { type useFocusFinders } from '@fluentui/react-tabster';

export const tab = ({
  findNextFocusable,
  findPrevFocusable,
  // findFirstFocusable,
  // findLastFocusable,
}: ReturnType<typeof useFocusFinders>): Extension => {
  return keymap.of([
    {
      key: 'Tab',
      preventDefault: true,
      run: (view) => {
        findNextFocusable(view.dom)?.focus();
        return true;
      },
      shift: (view) => {
        findPrevFocusable(view.dom)?.focus();
        return true;
      },
    },
  ]);
};
