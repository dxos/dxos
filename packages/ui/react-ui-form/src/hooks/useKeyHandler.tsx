//
// Copyright 2025 DXOS.org
//

import { useCallback, useLayoutEffect } from 'react';

import { addEventListener } from '@dxos/async';

import { type FormHandler } from './useFormHandler';

/**
 * Key handler.
 */
export const useKeyHandler = (el: HTMLDivElement | null, form: FormHandler<any>) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          if (event.metaKey && form.canSave) {
            form.onSave();
          }
          break;
        }
      }
    },
    [form.isValid, form.canSave, form.onSave, form.autoSave],
  );

  useLayoutEffect(() => {
    if (!el) {
      return;
    }

    return addEventListener(el, 'keydown', handleKeyDown);
  }, [el, handleKeyDown]);
};
