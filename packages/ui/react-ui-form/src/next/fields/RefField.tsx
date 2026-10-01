//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Entity, Filter, Query, Ref, Scope, Type } from '@dxos/echo';
import { useType as defaultUseType, useQuery } from '@dxos/echo-react';
import { ANY_OBJECT_TYPENAME, ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { DXN, URI } from '@dxos/keys';
import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { translationKey } from '#translations';
import { type CreateOptions, type FormFieldRendererProps, type RefFieldDataProps } from '#types';

import { findRefOption } from '../../components/Form/FormField/fields/RefField/find-ref-option.ts';
import { presentationFor } from '../../components/Form/FormField/presentation.tsx';
import { omitHiddenFormFields, omitId } from '../../util/index.ts';
import { ObjectPicker } from '../ObjectPicker.tsx';

export type RefFieldProps = FormFieldRendererProps & RefFieldDataProps & CreateOptions;

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
 * A single reference picked with the next `ObjectPicker` (Combobox trigger mode): a button showing the target opens a
 * searchable list of candidates with their descriptions and, when the caller can persist one, an inline create form.
 */
export const RefField = (props: RefFieldProps) => {
  const {
    type,
    readonly,
    label,
    placeholder,
    presentation,
    getValue,
    onValueChange,
    db,
    useType = defaultUseType,
    useResults = defaultUseResults,
    getOptions = defaultGetOptions,
    createInitialValuePath,
    createFieldMap,
    onCreate,
    resolveCreateEntry,
  } = props;
  const { t } = useTranslation(translationKey);
  const typename = useMemo(
    () => SchemaEx.findAnnotation<ReferenceAnnotationValue>(type, ReferenceAnnotationId)?.typename,
    [type],
  );
  const results = useResults(db, typename);
  const options = useMemo(() => getOptions(results), [results, getOptions]);
  const selected = findRefOption(getValue(), options);
  const entity = useType(db, typename && typename !== ANY_OBJECT_TYPENAME ? DXN.make(typename) : undefined);
  // A plugin-registered entry (e.g. `SpaceCapabilities.CreateObjectEntry`) replaces the raw type's schema and create.
  const createEntry = typename ? resolveCreateEntry?.(typename) : undefined;
  const createSchema = useMemo(
    () => createEntry?.inputSchema ?? (entity && omitHiddenFormFields(omitId(Type.getSchema(entity)))),
    [createEntry, entity],
  );

  const handleCreate = useCallback(
    async (values: any) => {
      const created =
        createEntry?.createObject && db
          ? await createEntry.createObject(values, db)
          : entity && onCreate
            ? await onCreate(entity, values)
            : undefined;
      if (created) {
        onValueChange(type, Ref.make(created));
      }
    },
    [createEntry, db, entity, onCreate, type, onValueChange],
  );

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
      // A resolvable type alone is not enough (operation refs cannot be created ad hoc): the caller must persist it.
      onCreate={onCreate || createEntry?.createObject ? handleCreate : undefined}
      onSelect={(id) => onValueChange(type, id ? Ref.fromURI(URI.make(id)) : undefined)}
    />
  );
};
