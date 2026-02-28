//
// Copyright 2023 DXOS.org
//

import React, {
  type ChangeEvent,
  type ClipboardEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useForwardedRef, useIsFocused } from '@dxos/react-hooks';

import { INPUT_NAME, type InputScopedProps, useInputContext } from './Root';

type PinInputProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'maxLength'> & {
  /** Class name applied to each segment div. */
  segmentClassName?: string;
  /** Number of code segments. */
  length?: number;
};

const PinInput = forwardRef<HTMLInputElement, PinInputProps>(
  (
    {
      __inputScope,
      className,
      disabled,
      segmentClassName,
      length = 6,
      pattern,
      value: controlledValue,
      onChange,
      onPaste,
      ...props
    }: InputScopedProps<PinInputProps>,
    forwardedRef,
  ) => {
    const { id, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME, __inputScope);
    const inputRef = useForwardedRef(forwardedRef);
    const inputFocused = useIsFocused(inputRef);
    const [internalValue, setInternalValue] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);

    const value = controlledValue != null ? String(controlledValue) : internalValue;

    // Derive a per-character filter from the `pattern` prop (e.g., `\\d*` → test each char against `\\d`).
    const charPattern = useMemo(() => {
      if (!pattern) {
        return undefined;
      }
      try {
        // Strip quantifiers (*, +, {n}) to get the base character class.
        const base = pattern.replace(/[*+?]$|\{\d+,?\d*\}$/g, '');
        return new RegExp(`^${base}$`);
      } catch {
        return undefined;
      }
    }, [pattern]);

    /** Filter a string to only characters matching the pattern. */
    const filterValue = useCallback(
      (input: string) => {
        if (!charPattern) {
          return input;
        }
        return input
          .split('')
          .filter((char) => charPattern.test(char))
          .join('');
      },
      [charPattern],
    );

    // Sync cursor position from the hidden input's selection.
    const syncCursor = useCallback(() => {
      const pos = inputRef.current?.selectionStart ?? value.length;
      setCursorPosition(Math.min(pos, value.length));
    }, [inputRef, value.length]);

    // Keep cursor in sync after value changes.
    useEffect(() => {
      setCursorPosition((prev) => Math.min(prev, value.length));
    }, [value.length]);

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const newValue = filterValue(event.target.value).slice(0, length);
        if (controlledValue == null) {
          setInternalValue(newValue);
        }
        setCursorPosition(event.target.selectionStart ?? newValue.length);
        onChange?.(event);
      },
      [length, controlledValue, onChange, filterValue],
    );

    const handlePaste = useCallback(
      (event: ClipboardEvent<HTMLInputElement>) => {
        onPaste?.(event);
        if (event.defaultPrevented) {
          return;
        }
        event.preventDefault();
        const pasted = filterValue(event.clipboardData.getData('text/plain')).slice(0, length);
        const input = inputRef.current;
        if (!input) {
          return;
        }
        // Use native setter to trigger React's synthetic onChange.
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        nativeInputValueSetter?.call(input, pasted);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
      [length, inputRef, onPaste, filterValue],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          // Let the native input handle cursor movement, then sync.
          requestAnimationFrame(syncCursor);
        } else if (event.key === 'Backspace' && value.length === 0) {
          event.preventDefault();
        } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          // Reject characters that don't match the allow pattern.
          if (charPattern && !charPattern.test(event.key)) {
            event.preventDefault();
            props.onKeyDown?.(event);
            return;
          }
          // Overwrite mode: replace character at cursor position instead of inserting.
          const input = inputRef.current;
          const pos = input?.selectionStart ?? value.length;
          if (pos < value.length && input) {
            event.preventDefault();
            const newValue = value.slice(0, pos) + event.key + value.slice(pos + 1);
            const newPos = Math.min(pos + 1, length);
            // Update state and cursor synchronously to avoid flicker.
            if (controlledValue == null) {
              setInternalValue(newValue);
            }
            setCursorPosition(newPos);
            // Sync the native input to match.
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            nativeInputValueSetter?.call(input, newValue);
            input.setSelectionRange(newPos, newPos);
            // Notify consumer via onChange with a synthetic-like event.
            onChange?.({ target: input, currentTarget: input } as ChangeEvent<HTMLInputElement>);
          }
        }
        props.onKeyDown?.(event);
      },
      [value, length, props.onKeyDown, syncCursor, inputRef, charPattern, controlledValue, onChange],
    );

    const handleSelect = useCallback(() => {
      syncCursor();
    }, [syncCursor]);

    const activeIndex = Math.min(cursorPosition, value.length < length ? value.length : length - 1);

    return (
      <div className={`relative inline-flex items-center gap-2 ${className ?? ''}`}>
        <input
          ref={inputRef}
          id={id}
          type='text'
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          maxLength={length}
          disabled={disabled}
          spellCheck={false}
          aria-describedby={descriptionId}
          {...(validationValence === 'error' && {
            'aria-invalid': 'true' as const,
            'aria-errormessage': errorMessageId,
          })}
          {...props}
          pattern={pattern}
          className='absolute inset-0 opacity-0 w-full h-full'
          style={{
            caretColor: 'transparent',
            ...props.style,
          }}
        />
        {Array.from({ length }, (_, index) => {
          const char = value[index] || '\u00A0';
          const isCursor = !!(inputFocused && index === activeIndex);
          return (
            <div key={index} className={segmentClassName} {...(isCursor && { 'data-focused': '' })} aria-hidden='true'>
              {char}
            </div>
          );
        })}
      </div>
    );
  },
);

export { PinInput };

export type { PinInputProps };
