//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import '@dxos/lit-ui/dx-tag-picker.pcss';
import { type Database, Entity, Filter, Obj, Ref, Type } from '@dxos/echo';
import { useQuery, useSchema as defaultUseSchema } from '@dxos/echo-react';
import { ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/internal';
import { findAnnotation } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { DxAnchor } from '@dxos/lit-ui/react';
import { Button, Icon, Input, useTranslation } from '@dxos/react-ui';
import { ParentLabelAnnotationId } from '@dxos/schema';

import { translationKey } from '#translations';

import { ObjectPicker, type ObjectPickerContentProps, type RefOption } from '../../ObjectPicker';
import { omitHiddenFormFields, omitId } from '../Form';
import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

// TODO(burdon): Factor out.
const isRefSnapshot = (val: any): val is { '/': string } => {
  return typeof val === 'object' && typeof (val as any)?.['/'] === 'string';
};

const defaultGetOptions: NonNullable<RefFieldProps['getOptions']> = (results, { parentLabel } = {}) =>
  results.map((result) => {
    const id = Entity.getDXN(result).toString();
    const parent = parentLabel ? Obj.getParent(result as Obj.Unknown) : undefined;
    const label = parent ? Entity.getLabel(parent) : Entity.getLabel(result);
    return { id, label: label ?? id };
  });

const defaultUseResults: NonNullable<RefFieldProps['useResults']> = (db, typename) =>
  useQuery(
    db,
    typename
      ? // For Ref.Ref(Obj.Unknown) we want to show all objects.
        typename === Type.getTypename(Obj.Unknown)
        ? Filter.everything()
        : Filter.typename(typename)
      : Filter.nothing(),
  );

export type RefFieldProps = FormFieldComponentProps &
  Pick<
    ObjectPickerContentProps,
    'createOptionLabel' | 'createOptionIcon' | 'createInitialValuePath' | 'createFieldMap'
  > & {
    db?: Database.Database;
    // TODO(burdon): Replace hooks with callbacks.
    useSchema?: (db?: Database.Database, typename?: string) => Type.AnyEntity;
    useResults?: (db?: Database.Database, typename?: string) => Entity.Any[];
    getOptions?: (objects: Entity.Any[], options?: { parentLabel?: boolean }) => RefOption[];
    /**
     * Persist a newly-created object. Called after the user fills out the
     * inline create form and clicks Save. Should add the object to the
     * database and return it (sync or async). The returned object is then
     * wired into this slot's form value as a Ref.
     */
    onCreate?: (schema: Type.AnyEntity, values: any) => Obj.Unknown | Promise<Obj.Unknown> | undefined | void;
  };

export const RefField = (props: RefFieldProps) => {
  const {
    type,
    readonly,
    label,
    placeholder,
    layout,
    getStatus,
    getValue,
    createOptionLabel,
    createOptionIcon,
    createInitialValuePath,
    createFieldMap,
    db,
    useSchema = defaultUseSchema,
    useResults = defaultUseResults,
    getOptions = defaultGetOptions,
    onCreate,
    onValueChange,
  } = props;
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();

  const typename = useMemo(
    () => (type ? findAnnotation<ReferenceAnnotationValue>(type, ReferenceAnnotationId)?.typename : undefined),
    [type],
  );

  const results = useResults(db, typename);
  const options = useMemo(() => {
    const parentLabel = type ? findAnnotation<boolean>(type, ParentLabelAnnotationId) === true : false;
    return getOptions(results, { parentLabel });
  }, [results, getOptions, type]);

  const handleGetValue = useCallback(() => {
    const formValue = getValue();
    // Match form-value Refs against options by the bare object id (last DXN
    // segment), not by full DXN string. Ref.make uses
    // `DXN.fromLocalObjectId(id)` (`dxn:echo:@:<id>`), but
    // `Entity.getDXN(obj)` on a registered object produces the space-scoped
    // form (`dxn:echo:<spaceId>:<id>`). String-comparing the two never
    // matches, so the just-created Ref's option lookup fails and the slot
    // displays as empty even though the underlying form value IS set.
    const dxnToObjectId = (dxn: string): string => dxn.split(':').pop() ?? dxn;

    const unknownToRefOption = (value: unknown) => {
      const isRef = Ref.isRef(value);
      if (isRef || isRefSnapshot(value)) {
        const dxnString = isRef ? value.dxn.toString() : value['/'];
        const objectId = dxnToObjectId(dxnString);
        const matchingOption = options.find((option) => dxnToObjectId(option.id) === objectId);
        if (matchingOption) {
          return matchingOption;
        }
      }

      return undefined;
    };

    return unknownToRefOption(formValue);
  }, [options, getValue]);

  const item = handleGetValue();
  const selectedIds = useMemo(() => (item ? [item.id] : []), [item]);
  const createSchema = useSchema(db, typename);

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
      const ref = item ? Ref.fromDXN(DXN.parse(item.id)) : undefined;
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

  if (!typename || ((readonly || layout === 'static') && !item)) {
    return null;
  }

  return (
    <Input.Root validationValence={status}>
      {layout !== 'inline' && <FormFieldLabel error={error} readonly={readonly} label={label} />}
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
                <div role='none' className='flex gap-form-gap w-full'>
                  <Input.Root key={item.id}>
                    <Input.TextInput value={item.label} readOnly classNames='w-full' />
                  </Input.Root>
                </div>
              ) : (
                <Button classNames='w-full text-start gap-form-gap'>
                  <div role='none' className='grow overflow-hidden'>
                    <span className='truncate text-description'>{placeholder ?? t('ref-field.placeholder')}</span>
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
                createSchema={createSchema && omitHiddenFormFields(omitId(createSchema))}
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
      {layout === 'full' && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
