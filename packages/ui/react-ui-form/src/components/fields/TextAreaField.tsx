//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Input from '@dxos/react-ui/Input';

import { type FormFieldRendererProps } from '#types';

import { useFormContext, useFormExtensions } from '../../hooks/index.ts';
import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { CollaborativeTextEditor } from './CollaborativeTextEditor.tsx';

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
  const { object } = useFormContext('TextAreaField');
  const extensions = useFormExtensions(
    collaborative && path && jsonPath !== undefined ? { path, jsonPath } : undefined,
  );
  const value = getValue() ?? '';
  const inPlace = presentation === 'title' || presentation === 'plain';
  const { isStatic, showLabel } = presentationFor(presentation);
  if (isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }
  if (collaborative && object && path) {
    return (
      <CollaborativeTextEditor
        object={object}
        path={path}
        extensions={extensions}
        multiline
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
