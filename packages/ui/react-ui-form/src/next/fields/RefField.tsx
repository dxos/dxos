//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Entity, Filter, Query, Ref, Scope } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ANY_OBJECT_TYPENAME, ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { DXN, URI } from '@dxos/keys';
import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { translationKey } from '#translations';
import { type FormFieldRendererProps, type RefFieldDataProps } from '#types';

import { findRefOption } from '../../components/Form/FormField/fields/RefField/find-ref-option.ts';
import { presentationFor } from '../../components/Form/FormField/presentation.tsx';

export type RefFieldProps = FormFieldRendererProps & RefFieldDataProps;

const defaultUseResults: NonNullable<RefFieldProps['useResults']> = (db, typename) =>
  useQuery(
    db,
    !typename
      ? Query.select(Filter.nothing())
      : typename === ANY_OBJECT_TYPENAME
        ? Query.select(Filter.everything())
        : Query.select(Filter.type(DXN.make(typename))).from(Scope.space(), Scope.registry()),
  );

const defaultGetOptions: NonNullable<RefFieldProps['getOptions']> = (results) =>
  results.map((result) => {
    const id = Entity.getURI(result, { prefer: 'named' });
    return { id, label: Entity.getLabel(result) ?? id };
  });

/**
 * A single reference picked with `Next.Combobox` in input mode (the text input is the trigger). The current RefField's
 * button trigger with search-in-popup, the create row and item descriptions wait for Combobox trigger mode (AUDIT
 * point 9); see SPIKE.md for what that mode must provide.
 */
export const RefField = ({
  type,
  readonly,
  label,
  placeholder,
  presentation,
  getValue,
  onValueChange,
  db,
  useResults = defaultUseResults,
  getOptions = defaultGetOptions,
}: RefFieldProps) => {
  const { t } = useTranslation(translationKey);
  const typename = useMemo(
    () => SchemaEx.findAnnotation<ReferenceAnnotationValue>(type, ReferenceAnnotationId)?.typename,
    [type],
  );
  const results = useResults(db, typename);
  const options = useMemo(() => getOptions(results), [results, getOptions]);
  const items = useMemo<Next.ComboboxOption[]>(
    () => options.map((option) => ({ value: option.id, label: option.label })),
    [options],
  );
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
    <Next.Combobox.Root
      items={items}
      value={selected ? [selected.id] : []}
      onValueChange={({ value: [id] }) => onValueChange(type, id ? Ref.fromURI(URI.make(id)) : undefined)}
    >
      <Next.Combobox.Control>
        <Next.Combobox.Input placeholder={placeholder || label || t('ref-field.placeholder')} />
        <Next.Combobox.ClearTrigger />
        <Next.Combobox.Trigger />
      </Next.Combobox.Control>
      <Next.Combobox.Content />
    </Next.Combobox.Root>
  );
};
