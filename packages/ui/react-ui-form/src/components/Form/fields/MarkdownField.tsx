//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useRef } from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

export const MarkdownField = ({
  type,
  label,
  inputOnly,
  readonly,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldComponentProps) => {
  const { status, error } = getStatus();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // TODO(ZaymonFC): If we start using `Enter` for form submission, we should prevent default behavior here
  //  since we're using a textarea element and the user needs to be able to enter new lines.

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.blockSize = 'auto'; // For measurement.
      textarea.style.blockSize = `${textarea.scrollHeight + 2}px`;
    }
  }, []);

  // Adjust height on initial render.
  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  // Adjust height when the content changes.
  useEffect(() => {
    adjustHeight();
  }, [getValue(), adjustHeight]);

  return (
    <Input.Root validationValence={status}>
      {!inputOnly && <FormFieldLabel error={error} label={label} />}
      {readonly === 'static' ? (
        <p>{getValue() ?? ''}</p>
      ) : (
        <Input.TextArea
          ref={textareaRef}
          disabled={!!readonly}
          placeholder={placeholder}
          value={getValue() ?? ''}
          classNames={'min-bs-auto max-bs-40 overflow-auto'}
          onChange={(event) => onValueChange(type, event.target.value)}
          onBlur={onBlur}
          style={{ resize: 'none' }}
          spellCheck={false}
        />
      )}
      {inputOnly && <Input.Validation>{error}</Input.Validation>}
    </Input.Root>
  );
};
