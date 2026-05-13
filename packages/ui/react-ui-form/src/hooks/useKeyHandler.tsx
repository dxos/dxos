//
// Copyright 2025 DXOS.org
//

import { type RefObject, useCallback, useLayoutEffect } from 'react';

import { addEventListener } from '@dxos/async';

import { type FormHandler } from './useFormHandler';

/**
 * Key handler.
 */
export const useKeyHandler = (elRef: RefObject<HTMLDivElement | null>, form: FormHandler<any>) => {
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
    const el = elRef.current;
    if (!el) {
      return;
    }

    return addEventListener(el, 'keydown', handleKeyDown);
  }, [elRef, handleKeyDown]);
};
