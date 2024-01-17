//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useEffect, useState } from 'react';

export const useFocus = (controlledView: EditorView | null, id?: string) => {
  const [shouldFocus, setShouldFocus] = useState<string>();
  useEffect(() => {
    console.log('E', controlledView!, shouldFocus);
    if (controlledView) {
      if (shouldFocus) {
        controlledView.focus();
        setShouldFocus(undefined);
      }
    }
  }, [controlledView, shouldFocus]);

  return (id: string) => {
    if (controlledView) {
      controlledView.focus();
    } else {
      console.log('should focus', id);
      setShouldFocus(id);
    }
  };
};
