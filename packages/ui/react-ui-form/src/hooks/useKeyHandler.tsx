//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect } from 'react';

import { addEventListener } from '@dxos/async';

import { type FormHandler } from './useFormHandler';

/**
 * Key handler.
 */
export const useKeyHandler = (formElement: HTMLDivElement | null, form: FormHandler<any>, autoSave?: boolean) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          const modifier = event.ctrlKey || event.altKey || event.metaKey || event.shiftKey;
          const isTextarea = (event.target as HTMLElement).tagName.toLowerCase() === 'textarea';

          // E.g., opt-out on combobox selection.
          const optOut =
            (event.target as HTMLElement).hasAttribute('data-no-submit') ||
            (event.target as HTMLElement).closest('[data-no-submit]') !== null;

          // TODO(burdon): Explain why disabled if modifier.
          if ((isTextarea ? event.metaKey : !modifier) && !optOut) {
            if (!autoSave && form.canSave) {
              form.onSave();
            }

            // TODO(burdon): WHY?
            if (autoSave && form.formIsValid) {
              (event.target as HTMLElement).blur();
            }
          }
          break;
        }
      }
    },
    [form.canSave, form.formIsValid, form.onSave, autoSave],
  );

  useEffect(() => {
    if (!formElement) {
      return;
    }

    // TODO(burdon): Move to @dxos/dom-util.
    return addEventListener(formElement, 'keydown', handleKeyDown);
  }, [formElement, handleKeyDown]);
};
