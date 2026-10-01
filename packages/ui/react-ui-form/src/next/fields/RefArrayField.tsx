//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Entity, Ref } from '@dxos/echo';
import { type SchemaAST } from '@dxos/effect';
import { URI } from '@dxos/keys';
import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { hues } from '@dxos/ui-types';

import { translationKey } from '#translations';
import { type CreateOptions, type FormFieldRendererProps, type RefFieldDataProps } from '#types';

import { findRefOption } from '../../components/Form/FormField/fields/RefField/find-ref-option.ts';
import { presentationFor } from '../../components/Form/FormField/presentation.tsx';
import { ObjectMultiPicker } from '../ObjectPicker.tsx';
import { useRefCandidates } from './ref-options.ts';

export type RefArrayFieldProps = FormFieldRendererProps<readonly unknown[] | undefined> &
  RefFieldDataProps &
  CreateOptions & {
    /** The array's element: the ref type. */
    elementType: SchemaAST.AST;
  };

/**
 * An array of references (the meta tags) as one multiple selection: removable chips in the targets' hues, a caret
 * opening a search popup that toggles options, and an inline create form whose new object joins the selection.
 */
export const RefArrayField = ({
  type,
  elementType,
  readonly,
  label,
  placeholder,
  presentation,
  jsonPath,
  getValue,
  onValueChange,
  createInitialValuePath,
  createFieldMap,
  createOptionIcon,
  ...props
}: RefArrayFieldProps) => {
  const { t } = useTranslation(translationKey);
  const { typename, options, createSchema, createLabel, create } = useRefCandidates({
    ...props,
    refType: elementType,
  });
  const refs = (getValue() ?? []).filter(Ref.isRef);
  const ids = refs.flatMap((ref) => findRefOption(ref, options)?.id ?? []);
  if (!typename) {
    return null;
  }
  if (readonly || presentationFor(presentation).isStatic) {
    const selected = ids.flatMap((id) => options.find((option) => option.id === id) ?? []);
    return selected.length === 0 ? (
      <Next.Typography tone='description'>{t('empty-readonly-ref-field.label')}</Next.Typography>
    ) : (
      <Next.Group>
        {selected.map((option) => (
          <Next.Tag key={option.id} hue={hues.find((hue) => hue === option.hue)}>
            {option.label}
          </Next.Tag>
        ))}
      </Next.Group>
    );
  }

  return (
    <ObjectMultiPicker
      options={options}
      value={ids}
      placeholder={placeholder || label}
      createSchema={createSchema}
      createInitialValuePath={createInitialValuePath}
      createFieldMap={createFieldMap}
      createLabel={createLabel}
      createIcon={createOptionIcon}
      data-testid={jsonPath}
      onCreate={
        create &&
        (async (values) => {
          const created = await create(values);
          return created ? Entity.getURI(created, { prefer: 'named' }) : undefined;
        })
      }
      onValueChange={(next) =>
        onValueChange(
          type,
          next.map((id) => Ref.fromURI(URI.make(id))),
        )
      }
    />
  );
};
