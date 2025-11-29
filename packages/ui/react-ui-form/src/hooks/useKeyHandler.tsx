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
          // E.g., opt-out on combobox selection.
          const optOut =
            (event.target as HTMLElement).hasAttribute('data-no-submit') ||
            (event.target as HTMLElement).closest('[data-no-submit]') !== null;

          // TODO(burdon): Explain why disabled if modifier.
          const isTextarea = (event.target as HTMLElement).tagName.toLowerCase() === 'textarea';
          if ((isTextarea ? event.metaKey : true) && !optOut) {
            if (!form.autoSave && form.canSave) {
              form.onSave();
            }
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
