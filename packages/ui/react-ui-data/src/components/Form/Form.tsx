//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useMemo } from 'react';

import { type S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type SchemaProperty, type ValidationError } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { FormInput, type FormInputProps, isValidFormInput } from './FormInput';
import { useForm } from '../../hooks';
import { translationKey } from '../../translations';

export type PropsFilter<T extends Object> = (props: SchemaProperty<T>[]) => SchemaProperty<T>[];

export type FormProps<T extends object> = ThemedClassName<{
  values: T;
  schema: S.Schema<T>;
  autoFocus?: boolean; // TODO(burdon): Not used.
  readonly?: boolean;
  filter?: PropsFilter<T>;
  sort?: (keyof T)[];
  onValidate?: (values: T) => ValidationError[] | undefined;
  onValuesChanged?: (values: T) => void;
  onSave?: (values: T) => void;
  onCancel?: () => void;
  Custom?: Partial<Record<keyof T, FC<FormInputProps<T>>>>;
}>;

/**
 * General purpose form control that generates properties based on the schema.
 */
export const Form = <T extends object>({
  classNames,
  values,
  schema,
  readonly,
  filter,
  sort,
  onValidate,
  onValuesChanged,
  onSave,
  onCancel,
  Custom,
}: FormProps<T>) => {
  const { t } = useTranslation(translationKey);
  const { canSubmit, errors, handleSubmit, getInputProps, getErrorValence, getErrorMessage } = useForm<T>({
    schema,
    initialValues: values,
    onValuesChanged,
    onValidate,
    onSubmit: (values) => onSave?.(values),
  });

  // TODO(burdon): Highlight in UX.
  // TODO(wittjosiah): Not wrapping this in useEffect causes the app to explode.
  useEffect(() => {
    if (errors && Object.keys(errors).length) {
      log.warn('validation', { errors });
    }
  }, [errors]);

  // Filter and sort props.
  const props = useMemo(() => {
    const props = getSchemaProperties<T>(schema);
    const filtered = filter ? filter(props) : props;
    const findIndex = (props: (keyof T)[], prop: keyof T) => {
      const idx = props.findIndex((p) => p === prop);
      return idx === -1 ? Infinity : idx;
    };

    return sort
      ? filtered.sort(({ property: a }, { property: b }) => findIndex(sort, a) - findIndex(sort, b))
      : filtered;
  }, [schema, filter]);

  return (
    <div className={mx('flex flex-col w-full gap-2 p-2', classNames)}>
      {props
        .map(({ property, type, title, description }) => {
          if (!isValidFormInput(type)) {
            return null;
          }

          const PropertyInput = Custom?.[property] ?? FormInput<T>;
          return (
            <div key={property} role='none'>
              <PropertyInput
                property={property}
                type={type}
                disabled={readonly}
                label={title ?? property}
                placeholder={description}
                getInputProps={getInputProps}
                getErrorValence={getErrorValence}
                getErrorMessage={getErrorMessage}
              />
            </div>
          );
        })
        .filter(isNotFalsy)}

      {(onCancel || onSave) && (
        <div role='none' className='flex justify-center'>
          <div role='none' className={mx(!readonly && 'grid grid-cols-2 gap-2')}>
            {onCancel && !readonly && (
              <IconButton icon='ph--x--regular' label={t('button cancel')} onClick={onCancel} />
            )}
            {onSave && (
              <IconButton
                type='submit'
                icon='ph--check--regular'
                label={t('button save')}
                onClick={handleSubmit}
                disabled={!canSubmit}
                classNames='grow'
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
