//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import '@dxos/lit-ui/dx-tag-picker.pcss';
import { Entity, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { useQuery, useType as defaultUseType } from '@dxos/echo-react';
import { ANY_OBJECT_TYPENAME, ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { DXN, EID, URI } from '@dxos/keys';
import { DxAnchor } from '@dxos/lit-ui/react';
import { Button, Icon, Input, useTranslation } from '@dxos/react-ui';
import { ParentLabelAnnotationId } from '@dxos/schema';

import { translationKey } from '#translations';
import { type CreateOptions, type FormFieldRendererProps, type RefFieldDataProps, type RefOption } from '#types';

import { omitHiddenFormFields, omitId } from '../../../../../util';
import { ObjectPicker } from '../../../../ObjectPicker';
import { FormFieldLabel } from '../../FormRow';
import { presentationFor } from '../../presentation';

// TODO(burdon): Factor out.
const isRefSnapshot = (val: any): val is { '/': string } => {
  return typeof val === 'object' && typeof (val as any)?.['/'] === 'string';
};

/**
 * Find the option a ref-like form value points at. Matches on the local (entity-id) form so a bare local EID
 * (`echo:/<id>`, produced by `Ref.make`) still resolves against an option keyed by the entity's qualified
 * self URI (`echo://<space>/<id>`). Returns `undefined` when the value is not a ref or no option matches.
 *
 * Comparing by entity id is only sound within one space (ids are unique there, not globally). Two EIDs that
 * both carry a space authority must therefore agree on it: a qualified value and a qualified option from
 * different spaces never match, even when their entity ids coincide.
 */
export const findRefOption = (value: unknown, options: RefOption[]): RefOption | undefined => {
  const isRef = Ref.isRef(value);
  if (!isRef && !isRefSnapshot(value)) {
    return undefined;
  }
  const valueUri = isRef ? value.uri : value['/'];
  // Keyed/registry entities (blueprints, operations) are referenced by a named DXN rather than an
  // entity-id, so they carry no parseable EID; match those by direct URI equality against the option id.
  const directMatch = options.find((option) => option.id === valueUri);
  if (directMatch) {
    return directMatch;
  }
  const valueEid = EID.tryParse(valueUri);
  if (!valueEid) {
    return undefined;
  }
  const valueSpaceId = EID.getSpaceId(valueEid);
  const valueLocal = EID.toLocal(valueEid);
  return options.find((option) => {
    const optionEid = EID.tryParse(option.id);
    if (!optionEid) {
      return false;
    }
    const optionSpaceId = EID.getSpaceId(optionEid);
    if (valueSpaceId != null && optionSpaceId != null && valueSpaceId !== optionSpaceId) {
      return false;
    }
    return EID.equals(EID.toLocal(optionEid), valueLocal);
  });
};

const defaultGetOptions: NonNullable<RefFieldProps['getOptions']> = (
  results,
  { parentLabel, getTypePlaceholder } = {},
) =>
  results
    // When labeling by parent, only surface objects that actually have a parent — an unparented object
    // (e.g. a system feed) has no meaningful parent to label by.
    .filter((result) => !parentLabel || Obj.getParent(result as Obj.Unknown) != null)
    .map((result) => {
      const id = Entity.getURI(result, { prefer: 'named' });
      const parent = parentLabel ? Obj.getParent(result as Obj.Unknown) : undefined;
      const labelEntity = parent ?? result;
      const typename = Entity.getTypename(labelEntity);
      // Fall back to the entity's type placeholder when it has no label of its own — matching the
      // app-graph/navtree (`object-name.placeholder` in the entity's typename namespace).
      const label = Entity.getLabel(labelEntity) ?? (typename ? getTypePlaceholder?.(typename) : undefined) ?? id;
      return { id, label };
    });

const defaultUseResults: NonNullable<RefFieldProps['useResults']> = (db, typename) =>
  useQuery(
    db,
    !typename
      ? Query.select(Filter.nothing())
      : typename === ANY_OBJECT_TYPENAME
        ? // Untyped refs show space objects only; the registry is too broad for "any".
          Query.select(Filter.everything())
        : // Include registry scope so keyed entities (skills, operations) appear as options.
          Query.select(Filter.type(DXN.make(typename))).from(Scope.space(), Scope.registry()),
  );

export type RefFieldProps = FormFieldRendererProps & RefFieldDataProps & CreateOptions;

export const RefField = (props: RefFieldProps) => {
  const {
    type,
    readonly,
    label,
    jsonPath,
    placeholder,
    presentation,
    required,
    getStatus,
    getValue,
    createOptionLabel,
    createOptionIcon,
    createInitialValuePath,
    createFieldMap,
    db,
    useType = defaultUseType,
    useResults = defaultUseResults,
    getOptions = defaultGetOptions,
    onCreate,
    onValueChange,
  } = props;
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();
  const resolved = presentationFor(presentation);

  const typename = useMemo(
    () => (type ? SchemaEx.findAnnotation<ReferenceAnnotationValue>(type, ReferenceAnnotationId)?.typename : undefined),
    [type],
  );

  // Resolve a type-based placeholder label for entities that have no label of their own — the entity's
  // `object-name.placeholder` in its own typename namespace, like the app-graph/navtree. Falls back to a
  // humanized typename segment so we never surface a raw DXN for a type that hasn't registered one.
  const getTypePlaceholder = useCallback(
    (placeholderTypename: string): string => {
      const segment = placeholderTypename.split(/[.:/]/).filter(Boolean).pop() ?? placeholderTypename;
      const humanized = segment.charAt(0).toUpperCase() + segment.slice(1);
      return t('object-name.placeholder', { ns: placeholderTypename, defaultValue: humanized });
    },
    [t],
  );

  const results = useResults(db, typename);
  const options = useMemo(() => {
    const parentLabel = type ? SchemaEx.findAnnotation<boolean>(type, ParentLabelAnnotationId) === true : false;
    return getOptions(results, { parentLabel, getTypePlaceholder });
  }, [results, getOptions, type, getTypePlaceholder]);

  const handleGetValue = useCallback(() => findRefOption(getValue(), options), [options, getValue]);

  const item = handleGetValue();
  const selectedIds = useMemo(() => (item ? [item.id] : []), [item]);
  const createSchema = useType(db, typename && typename !== ANY_OBJECT_TYPENAME ? DXN.make(typename) : undefined);

  // Lift the popover open state so we can dismiss it after a successful create.
  const [open, setOpen] = useState(false);

  const handleCreate = useCallback(
    async (values: any) => {
      if (!createSchema || !onCreate) {
        return;
      }
      const newObject = await onCreate(createSchema, values);
      if (newObject) {
        // Wire the newly-created object into this slot's form value. ArrayField
        // owns the array; this RefField represents a single slot, so writing a
        // Ref via `onValueChange` populates that slot.
        onValueChange(type, Ref.make(newObject));
      }
      setOpen(false);
    },
    [createSchema, onCreate, type, onValueChange],
  );

  const handleUpdate = useCallback(
    (id: string | undefined) => {
      const item = options.find((option) => option.id === id);
      const ref = item ? Ref.fromURI(URI.make(item.id)) : undefined;
      onValueChange(type, ref);
    },
    [options, type, onValueChange],
  );

  const handleSelect = useCallback(
    (id: string) => {
      if (item?.id === id) {
        handleUpdate(undefined);
      } else {
        handleUpdate(id);
      }
    },
    [item, handleUpdate],
  );

  if (!typename || ((readonly || resolved.isStatic) && !item)) {
    return null;
  }

  return (
    <Input.Root validationValence={status}>
      {resolved.showLabel && (
        <FormFieldLabel error={error} readonly={readonly} required={required} label={label} path={jsonPath} />
      )}
      <div>
        {readonly ? (
          !item ? (
            <p className='text-description mb-2'>{t('empty-readonly-ref-field.label')}</p>
          ) : (
            <DxAnchor key={item.id} dxn={item.id} rootclassname='me-1'>
              {item.label}
            </DxAnchor>
          )
        ) : (
          <ObjectPicker.Root open={open} onOpenChange={setOpen}>
            <ObjectPicker.Trigger asChild classNames='p-0'>
              {item ? (
                <div className='flex gap-form-gap w-full'>
                  <Input.Root key={item.id}>
                    <Input.TextInput value={item.label} readOnly classNames='w-full' />
                  </Input.Root>
                </div>
              ) : (
                <Button classNames='w-full text-start gap-form-gap'>
                  <div className='grow overflow-hidden'>
                    <span className='truncate text-description'>
                      {placeholder || label || t('ref-field.placeholder')}
                    </span>
                  </div>
                  <Icon size={3} icon='ph--caret-down--bold' />
                </Button>
              )}
            </ObjectPicker.Trigger>
            <ObjectPicker.Portal>
              <ObjectPicker.Content
                classNames='dx-card-popover-width'
                options={options}
                selectedIds={selectedIds}
                // Strip hidden (`FormInputAnnotation.set(false)`) fields so the
                // form's validator doesn't reject required-but-hidden fields
                // such as backing-object refs supplied by a `FactoryAnnotation`.
                createSchema={createSchema && omitHiddenFormFields(omitId(Type.getSchema(createSchema)))}
                createOptionLabel={createOptionLabel}
                createOptionIcon={createOptionIcon}
                createInitialValuePath={createInitialValuePath}
                createFieldMap={createFieldMap}
                onCreate={handleCreate}
                onSelect={handleSelect}
              />
            </ObjectPicker.Portal>
          </ObjectPicker.Root>
        )}
      </div>
      {resolved.showError && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
