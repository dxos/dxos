//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import '@dxos/lit-ui/dx-tag-picker.pcss';
import { type Database, Entity, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { useQuery, useType as defaultUseType } from '@dxos/echo-react';
import { ANY_OBJECT_TYPENAME, ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { DXN, URI } from '@dxos/keys';
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
    const eid = Entity.getURI(result);

    // For keyed entities (e.g. blueprints, operations) prefer the DXN key URI as the
    // primary `id`. This allows registry-bound refs created via
    // `Ref.fromURI(Blueprint.registryURI(key))` — which carry a `dxn:<key>` URI — to
    // resolve correctly against options returned by the registry query below.
    // The EID is kept as an alias so that EID-based refs (from `Ref.make(dbObject)`)
    // still match after the `dxnToEntityId` alias check in `handleGetValue`.
    const key = Entity.isEntity(result) ? Entity.getMeta(result).key : undefined;
    // Mirror Blueprint.registryURI: prefer DXN form for valid NSIDs, fall back to the raw
    // key string for keys that contain hyphens or other characters DXN.tryMake rejects.
    const dxnId = key ? (DXN.tryMake(`dxn:${key}`) ?? key) : undefined;
    const id = dxnId ?? eid;
    const aliases: string[] | undefined = dxnId != null ? [eid] : undefined;

    const parent = parentLabel ? Obj.getParent(result as Obj.Unknown) : undefined;
    const label = parent ? Entity.getLabel(parent) : Entity.getLabel(result);
    return { id, label: label ?? id, aliases };
  });

const defaultUseResults: NonNullable<RefFieldProps['useResults']> = (db, typename) =>
  useQuery(
    db,
    !typename
      ? Query.select(Filter.nothing())
      : typename === ANY_OBJECT_TYPENAME
        ? // For Ref.Ref(Obj.Unknown) show all space objects (registry is too broad for "any").
          Query.select(Filter.everything())
        : // Fan across space + registry so keyed entities (blueprints, operations, etc.)
          // stored in the registry are included as picker options alongside local ones.
          Query.select(Filter.typename(typename)).from(Scope.space(), Scope.registry()),
  );

export type RefFieldProps = FormFieldComponentProps &
  Pick<
    ObjectPickerContentProps,
    'createOptionLabel' | 'createOptionIcon' | 'createInitialValuePath' | 'createFieldMap'
  > & {
    db?: Database.Database;
    // TODO(burdon): Replace hooks with callbacks.
    useType?: (db?: Database.Database, typename?: string) => Type.AnyEntity;
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
    jsonPath,
    placeholder,
    layout,
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

  const typename = useMemo(
    () => (type ? SchemaEx.findAnnotation<ReferenceAnnotationValue>(type, ReferenceAnnotationId)?.typename : undefined),
    [type],
  );

  const results = useResults(db, typename);
  const options = useMemo(() => {
    const parentLabel = type ? SchemaEx.findAnnotation<boolean>(type, ParentLabelAnnotationId) === true : false;
    return getOptions(results, { parentLabel });
  }, [results, getOptions, type]);

  const handleGetValue = useCallback(() => {
    const formValue = getValue();
    // Match form-value Refs against options by the bare entity id, not by full
    // URI string. A just-created object's Ref (`Ref.make`) carries the LOCAL
    // EID `echo:/<id>`, while options derived from `Entity.getURI` carry the
    // qualified EID `echo://<spaceId>/<id>`; encoded snapshots use the DXN
    // form `dxn:echo:<space|@>:<id>`. The entity id (a ULID) contains neither
    // `:` nor `/`, so it is always the final delimiter-separated segment —
    // splitting on both reconciles all three forms. Comparing full strings (or
    // splitting on `:` alone, which leaves `/`-delimited EIDs intact) makes the
    // just-created Ref's lookup fail and the slot render empty even though the
    // underlying form value IS set.
    const dxnToEntityId = (dxn: string): string => dxn.split(/[:/]/).filter(Boolean).pop() ?? dxn;

    const unknownToRefOption = (value: unknown) => {
      const isRef = Ref.isRef(value);
      if (isRef || isRefSnapshot(value)) {
        const dxnString = isRef ? value.uri : value['/'];
        const objectId = dxnToEntityId(dxnString);
        // Primary: match by extracted entity id (ULID for EID refs; key for DXN key refs).
        const matchingOption =
          options.find((option) => dxnToEntityId(option.id) === objectId) ??
          // Alias fallback: for keyed entities whose primary id was promoted to a DXN key URI,
          // the stored ref may still carry an EID-based URI (e.g. created via `Ref.make`).
          // Check each option's alias list so those refs still resolve correctly.
          options.find((option) => option.aliases?.some((alias) => dxnToEntityId(alias) === objectId));
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
  const createSchema = useType(db, typename);

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

  if (!typename || ((readonly || layout === 'static') && !item)) {
    return null;
  }

  return (
    <Input.Root validationValence={status}>
      {layout !== 'inline' && <FormFieldLabel error={error} readonly={readonly} label={label} path={jsonPath} />}
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
      {layout === 'full' && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
