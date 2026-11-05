//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Input from '@dxos/react-ui/Input';

import { type FormFieldRendererProps } from '#types';

import { useFormExtensions } from '../../hooks/index.ts';
import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { InputEditor } from './InputEditor.tsx';

/** A text area's minimum height in lines. */
const TEXT_AREA_ROWS = 3;

export const TextAreaField = ({
  type,
  format,
  readonly,
  label,
  placeholder,
  presentation,
  jsonPath,
  path,
  collaborative,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<string>) => {
  const extensions = useFormExtensions(
    collaborative && path && jsonPath !== undefined ? { path, jsonPath } : undefined,
  );
  const value = getValue() ?? '';
  const inPlace = presentation === 'title' || presentation === 'plain';
  const { isStatic, showLabel } = presentationFor(presentation);
  if (isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }
  // The string is the binding's, which the form's extensions give the editor.
  if (collaborative) {
    return (
      <InputEditor
        extensions={extensions}
        rows={TEXT_AREA_ROWS}
        placeholder={placeholder}
        readonly={!!readonly}
        {...(inPlace && { variant: 'plain' })}
        testId={jsonPath}
      />
    );
  }

  return (
    <Input.Textarea
      autoResize
      variant={inPlace ? 'plain' : 'default'}
      {...(inPlace && { rows: 1 })}
      data-testid={jsonPath}
      disabled={!!readonly}
      placeholder={placeholder}
      // A row that draws no label names its control itself.
      aria-label={showLabel ? undefined : label || undefined}
      value={value}
      onChange={(event) => onValueChange(type, event.target.value)}
      onBlur={onBlur}
    />
  );
};
