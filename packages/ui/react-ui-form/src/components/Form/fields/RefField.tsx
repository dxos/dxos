//
// Copyright 2025 DXOS.org
//

import '@dxos/lit-ui/dx-tag-picker.pcss';

import React, { useCallback, useMemo } from 'react';

import { type Database, type Entity, Filter, Obj, Ref, type Type } from '@dxos/echo';
import { ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/internal';
import { findAnnotation } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { DxAnchor } from '@dxos/lit-ui/react';
import { useQuery, useSchema } from '@dxos/echo-react';
import { Button, Icon, Input, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { translationKey } from '../../../translations';
import { ObjectPicker, type ObjectPickerContentProps, type RefOption } from '../../ObjectPicker';
import { omitId } from '../Form';
import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

// TODO(burdon): Factor out.
const isRefSnapshot = (val: any): val is { '/': string } => {
  return typeof val === 'object' && typeof (val as any)?.['/'] === 'string';
};

type UseQueryRefOptionsProps = {
  typename?: string;
  db?: Database.Database;
  getOptions?: (objects: Entity.Any[]) => RefOption[];
};

const defaultGetOptions: NonNullable<RefFieldProps['getOptions']> = (results) =>
  results.map((result) => {
    const id = Obj.getDXN(result).toString();
    const label = Obj.getLabel(result);
    return { id, label: label ?? id };
  });

/**
 * Hook to query reference options based on type information.
 * Used internally within forms to fetch and format reference options for reference fields.
 */
const useQueryRefOptions = ({ typename, db, getOptions = defaultGetOptions }: UseQueryRefOptionsProps) => {
  const objects = useQuery(db, typename ? Filter.typename(typename) : Filter.nothing());
  return useMemo(() => getOptions(objects), [objects, getOptions]);
};

export type RefFieldProps = FormFieldComponentProps &
  Pick<ObjectPickerContentProps, 'createOptionLabel' | 'createOptionIcon' | 'createInitialValuePath'> &
  Pick<UseQueryRefOptionsProps, 'db' | 'getOptions'> & {
    onCreate?: (schema: Type.Entity.Any, values: any) => void;
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
    db,
    getOptions,
    onCreate,
    onValueChange,
  } = props;
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();

  const typename = useMemo(
    () => (type ? findAnnotation<ReferenceAnnotationValue>(type, ReferenceAnnotationId)?.typename : undefined),
    [type],
  );

  const options = useQueryRefOptions({ typename, db, getOptions });

  const handleGetValue = useCallback(() => {
    const formValue = getValue();

    const unknownToRefOption = (value: unknown) => {
      const isRef = Ref.isRef(value);
      if (isRef || isRefSnapshot(value)) {
        const dxnString = isRef ? value.dxn.toString() : value['/'];
        const matchingOption = options.find((option) => option.id === dxnString);
        if (matchingOption) {
          return matchingOption;
        }
      }
      return undefined;
    };

    return unknownToRefOption(formValue);
  }, [options, getValue]);

  const handleUpdate = useCallback(
    (id: string | undefined) => {
      const item = options.find((option) => option.id === id);
      const ref = item ? Ref.fromDXN(DXN.parse(item.id)) : undefined;
      onValueChange(type, ref);
    },
    [options, type, onValueChange],
  );

  const item = handleGetValue();
  const selectedIds = useMemo(() => (item ? [item.id] : []), [item]);
  const createSchema = useSchema(db, typename);

  const handleCreate = useCallback(
    (values: any) => {
      if (createSchema && onCreate) {
        onCreate(createSchema, values);
      }
    },
    [createSchema, onCreate],
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
            <p className={mx(descriptionText, 'mbe-2')}>{t('empty readonly ref field label')}</p>
          ) : (
            <DxAnchor key={item.id} refid={item.id} rootclassname='mie-1'>
              {item.label}
            </DxAnchor>
          )
        ) : (
          <ObjectPicker.Root>
            <ObjectPicker.Trigger asChild classNames='p-0'>
              {item ? (
                <div className='flex gap-2 is-full'>
                  <Input.Root key={item.id}>
                    <Input.TextInput value={item.label} readOnly classNames='is-full' />
                  </Input.Root>
                </div>
              ) : (
                <Button classNames='is-full text-start gap-2'>
                  <div role='none' className='grow overflow-hidden'>
                    <span className='flex truncate text-description'>{placeholder ?? t('ref field placeholder')}</span>
                  </div>
                  <Icon size={3} icon='ph--caret-down--bold' />
                </Button>
              )}
            </ObjectPicker.Trigger>
            <ObjectPicker.Content
              classNames='popover-card-width'
              options={options}
              selectedIds={selectedIds}
              createSchema={createSchema && omitId(createSchema)}
              createOptionLabel={createOptionLabel}
              createOptionIcon={createOptionIcon}
              createInitialValuePath={createInitialValuePath}
              onCreate={handleCreate}
              onSelect={handleSelect}
            />
          </ObjectPicker.Root>
        )}
      </div>
      {layout === 'full' && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
