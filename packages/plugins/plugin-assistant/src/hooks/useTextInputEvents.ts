//
// Copyright 2025 DXOS.org
//

import { useState, useCallback, type KeyboardEventHandler, type ChangeEventHandler } from 'react';

/**
 * Hook that handles text input events.
 */
// TODO(burdon): Factor out.
export const useTextInputEvents = ({
  onEnter,
  onEscape,
}: {
  onEnter?: (text: string) => boolean | void;
  onEscape?: () => void;
}) => {
  const [value, setValue] = useState('');

  const onKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (ev) => {
      switch (ev.key) {
        case 'Escape': {
          onEscape?.();
          setValue('');
          break;
        }

        case 'Enter': {
          const value = (ev.target as HTMLInputElement).value.trim();
          if (value.length > 0) {
            const reset = onEnter?.(value);
            if (reset) {
              setValue('');
            }
          }
          break;
        }
      }
    },
    [onEnter, onEscape],
  );

  const onChange = useCallback<ChangeEventHandler<HTMLInputElement>>((ev) => {
    setValue(ev.target.value);
  }, []);

  return [{ value, onKeyDown, onChange }, setValue];
};
