//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect } from 'react';

import { addEventListener } from '@dxos/async';

import { type FormHandler } from './useFormHandler';

/**
 * Key handler.
 */
export const useKeyHandler = (formElement: HTMLDivElement | null, form: FormHandler<any>) => {
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

  useEffect(() => {
    if (!formElement) {
      return;
    }

    // TODO(burdon): Move to @dxos/dom-util.
    return addEventListener(formElement, 'keydown', handleKeyDown);
  }, [formElement, handleKeyDown]);
};
