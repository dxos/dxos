//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Input from '@dxos/react-ui/Input';

import { type FormFieldRendererProps } from '#types';

import { useFormContext } from '../../hooks/index.ts';
import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { BoundTextEditor } from './BoundTextEditor.tsx';

export const TextAreaField = ({
  type,
  format,
  readonly,
  placeholder,
  presentation,
  jsonPath,
  path,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<string>) => {
  const { object } = useFormContext('TextAreaField');
  const value = getValue() ?? '';
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }
  if (object && path) {
    return (
      <BoundTextEditor
        binding={{ object, path }}
        multiline
        placeholder={placeholder}
        readonly={!!readonly}
        testId={jsonPath}
      />
    );
  }

  return (
    <Input.Textarea
      autoResize
      disabled={!!readonly}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onValueChange(type, event.target.value)}
      onBlur={onBlur}
    />
  );
};
