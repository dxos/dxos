//
// Copyright 2025 DXOS.org
//

import '@dxos/lit-ui/dx-tag-picker.pcss';

import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { Ref } from '@dxos/echo';
import { ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/internal';
import { findAnnotation } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { DxAnchor } from '@dxos/lit-ui/react';
import { Button, Icon, Input, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { type QueryRefOptions, useQueryRefOptions } from '../../../hooks';
import { translationKey } from '../../../translations';
import { ObjectPicker } from '../../ObjectPicker';
import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

// TODO(burdon): Factor out.
const isRefSnapShot = (val: any): val is { '/': string } => {
  return typeof val === 'object' && typeof (val as any)?.['/'] === 'string';
};

export type RefFieldProps = FormFieldComponentProps & {
  // TODO(wittjosiah): Remove this. Array is handled upstream.
  array?: boolean;
  createOptionLabel?: [string, { ns: string }];
  createOptionIcon?: string;
  createSchema?: Schema.Schema.AnyNoContext;
  createInitialValuePath?: string;
  onCreate?: (values: any) => void;
  onQueryRefOptions?: QueryRefOptions;
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
    array,
    createOptionLabel,
    createOptionIcon,
    createSchema,
    createInitialValuePath,
    onCreate,
    onQueryRefOptions,
    onValueChange,
  } = props;
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();

  const typename = useMemo(
    () => (type ? findAnnotation<ReferenceAnnotationValue>(type, ReferenceAnnotationId)?.typename : undefined),
    [type],
  );

  // TODO(burdon): Query items on demand.
  const { options, update: updateOptions } = useQueryRefOptions({ typename, onQueryRefOptions });

  const handleGetValue = useCallback(() => {
    const formValue = getValue();

    const unknownToRefOption = (value: unknown) => {
      const isRef = Ref.isRef(value);
      if (isRef || isRefSnapShot(value)) {
        const dxnString = isRef ? value.dxn.toString() : value['/'];
        const matchingOption = options.find((option) => option.id === dxnString);
        if (matchingOption) {
          return matchingOption;
        }
      }
      return undefined;
    };

    if (array && Array.isArray(formValue)) {
      return formValue.map(unknownToRefOption).filter(isNonNullable) ?? [];
    }

    const option = unknownToRefOption(formValue);
    if (option) {
      return [option];
    }

    return [];
  }, [options, array, getValue]);

  const handleUpdate = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) {
        onValueChange(type, undefined);
        return;
      }

      const refs = ids
        .map((id) => {
          const item = options.find((option) => option.id === id);
          if (item) {
            const dxn = DXN.parse(item.id);
            return Ref.fromDXN(dxn);
          }
          return null;
        })
        .filter(isNonNullable);

      if (array) {
        onValueChange(type, refs);
      } else {
        onValueChange(type, refs[0]);
      }
    },
    [options, type, array, onValueChange],
  );

  const handleCreate = useCallback(
    (values: any) => {
      onCreate?.(values);
      updateOptions();
    },
    [onCreate, updateOptions],
  );

  const items = handleGetValue();
  const selectedIds = useMemo(() => items.map((i: any) => i.id), [items]);
  const toggleSelect = useCallback(
    (id: string) => {
      if (array) {
        const nextIds = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
        handleUpdate(nextIds);
      } else {
        if (selectedIds[0] === id) {
          handleUpdate([]);
        } else {
          handleUpdate([id]);
        }
      }
    },
    [array, selectedIds, handleUpdate],
  );

  if (!typename || ((readonly || layout === 'static') && items.length < 1)) {
    return null;
  }

  return (
    <Input.Root validationValence={status}>
      {layout !== 'inline' && <FormFieldLabel error={error} readonly={readonly} label={label} />}
      <div>
        {readonly ? (
          items.length < 1 ? (
            <p className={mx(descriptionText, 'mbe-2')}>{t('empty readonly ref field label')}</p>
          ) : (
            items.map((item) => (
              <DxAnchor key={item.id} refid={item.id} rootclassname='mie-1'>
                {item.label}
              </DxAnchor>
            ))
          )
        ) : (
          <ObjectPicker.Root>
            <ObjectPicker.Trigger asChild classNames='p-0'>
              {items?.length === 1 ? (
                <div className='flex gap-2 is-full'>
                  {items?.map((item) => (
                    <Input.Root key={item.id}>
                      <Input.TextInput value={item.label} readOnly classNames='is-full' />
                    </Input.Root>
                  ))}
                </div>
              ) : (
                <Button classNames='is-full text-start gap-2'>
                  <div role='none' className='grow overflow-hidden'>
                    <span className='flex truncate text-description'>
                      {placeholder ?? t('ref field placeholder', { count: array ? 99 : 1 })}
                    </span>
                  </div>
                  <Icon size={3} icon='ph--caret-down--bold' />
                </Button>
              )}
            </ObjectPicker.Trigger>
            <ObjectPicker.Content
              classNames='popover-card-width'
              options={options}
              selectedIds={selectedIds}
              createSchema={createSchema}
              createOptionLabel={createOptionLabel}
              createOptionIcon={createOptionIcon}
              createInitialValuePath={createInitialValuePath}
              onCreate={handleCreate}
              onSelect={toggleSelect}
            />
          </ObjectPicker.Root>
        )}
      </div>
      {layout === 'full' && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
