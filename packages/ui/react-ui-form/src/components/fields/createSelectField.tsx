//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { invariant } from '@dxos/invariant';
import { type SelectOption, Typography } from '@dxos/react-ui';

import { type FormFieldRenderer, type FormFieldRendererProps } from '#types';

import { FormField } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { SelectControl } from './SelectField.tsx';

export type CreateSelectFieldOptions = {
  /** Options to display. Strings are used as both value and label. */
  options: ReadonlyArray<string | { value: string; label?: string }>;
  /** Label for the sentinel option that maps to `undefined`. Defaults to `'Default'`. Pass `null` to omit. */
  defaultLabel?: string | null;
};

// A value outside every option, since Ark reads an empty value as no selection.
const SENTINEL = '__default__';

/** The current `createSelectField`, same signature, on `Select`; the renderer owns its row as before. */
export const createSelectField = ({
  options,
  defaultLabel = 'Default',
}: CreateSelectFieldOptions): FormFieldRenderer => {
  const normalized = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));
  invariant(
    !normalized.some((option) => option.value === SENTINEL),
    `createSelectField: option value '${SENTINEL}' is reserved.`,
  );
  const hasDefault = defaultLabel !== null;
  const items: SelectOption[] = [
    ...(hasDefault ? [{ value: SENTINEL, label: defaultLabel }] : []),
    ...normalized.map((option) => ({ value: option.value, label: option.label ?? option.value })),
  ];

  const SelectFieldRenderer = ({
    type,
    label,
    jsonPath,
    readonly,
    presentation,
    getValue,
    onValueChange,
    onBlur,
  }: FormFieldRendererProps<string | undefined>) => {
    const value = getValue();
    return (
      <FormField path={jsonPath} label={label} readonly={readonly} presentation={presentation}>
        {presentationFor(presentation).isStatic ? (
          <Typography truncate>
            {normalized.find((option) => option.value === value)?.label ?? String(value ?? '')}
          </Typography>
        ) : (
          <SelectControl
            items={items}
            value={value ?? (hasDefault ? SENTINEL : undefined)}
            readonly={readonly}
            onValueChange={(next) => {
              onValueChange(type, hasDefault && next === SENTINEL ? undefined : next);
              onBlur();
            }}
          />
        )}
      </FormField>
    );
  };
  return SelectFieldRenderer;
};
