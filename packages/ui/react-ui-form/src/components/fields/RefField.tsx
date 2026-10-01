//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Ref } from '@dxos/echo';
import { URI } from '@dxos/keys';
import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { translationKey } from '#translations';
import { type CreateOptions, type FormFieldRendererProps, type RefFieldDataProps } from '#types';

import { ObjectPicker } from '../ObjectPicker.tsx';
import { presentationFor } from '../presentation.tsx';
import { findRefOption } from './find-ref-option.ts';
import { useRefCandidates } from './ref-options.ts';

export type RefFieldProps = FormFieldRendererProps & RefFieldDataProps & CreateOptions;

/**
 * A single reference picked with the next `ObjectPicker` (Combobox trigger mode): a button showing the target opens a
 * searchable list of candidates with their descriptions and, when the caller can persist one, an inline create form
 * whose row takes `createOptionLabel` and `createOptionIcon`.
 */
export const RefField = ({
  type,
  readonly,
  label,
  placeholder,
  presentation,
  getValue,
  onValueChange,
  createInitialValuePath,
  createFieldMap,
  createOptionIcon,
  ...props
}: RefFieldProps) => {
  const { t } = useTranslation(translationKey);
  const { typename, options, createSchema, createLabel, create } = useRefCandidates({ ...props, refType: type });
  const selected = findRefOption(getValue(), options);
  if (!typename) {
    return null;
  }
  if (readonly || presentationFor(presentation).isStatic) {
    return (
      <Next.Typography truncate tone={selected ? 'default' : 'description'}>
        {selected?.label ?? t('empty-readonly-ref-field.label')}
      </Next.Typography>
    );
  }

  return (
    <ObjectPicker
      options={options}
      value={selected?.id}
      placeholder={placeholder || label || t('ref-field.placeholder')}
      createSchema={createSchema}
      createInitialValuePath={createInitialValuePath}
      createFieldMap={createFieldMap}
      createLabel={createLabel}
      createIcon={createOptionIcon}
      onCreate={
        create &&
        (async (values) => {
          const created = await create(values);
          if (created) {
            onValueChange(type, Ref.make(created));
          }
        })
      }
      onSelect={(id) => onValueChange(type, id ? Ref.fromURI(URI.make(id)) : undefined)}
    />
  );
};
