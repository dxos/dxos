//
// Copyright 2024 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { Button, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type SchemaProperty, type ValidationError } from '@dxos/schema';

import { FormInput, type FormInputProps } from './FormInput';
import { useForm } from '../../hooks';

export type PropsFilter<T extends Object> = (props: SchemaProperty<T>[]) => SchemaProperty<T>[];

export type FormProps<T extends object> = ThemedClassName<{
  values: T;
  schema: S.Schema<T>;
  autoFocus?: boolean;
  readonly?: boolean;
  filter?: PropsFilter<T>;
  sort?: (keyof T)[];
  additionalValidation?: (values: T) => ValidationError[] | undefined;
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
  additionalValidation,
  onValuesChanged,
  onSave,
  onCancel,
  Custom,
}: FormProps<T>) => {
  const { canSubmit, errors, handleSubmit, getInputProps, getErrorValence, getErrorMessage } = useForm<T>({
    schema,
    initialValues: values,
    additionalValidation,
    onValuesChanged,
    onSubmit: (values) => onSave?.(values),
  });

  if (errors && Object.keys(errors).length) {
    log.warn('validation', { errors });
  }

  const props = useMemo(() => {
    const props = getSchemaProperties<T>(schema);
    const filtered = filter ? filter(props) : props;
    const findIndex = (props: (keyof T)[], prop: keyof T) => {
      const idx = props.findIndex((p) => p === prop);
      return idx === -1 ? Infinity : idx;
    };
    return sort ? filtered.sort((a, b) => findIndex(sort, a.property) - findIndex(sort, b.property)) : filtered;
  }, [schema, filter]);

  return (
    <div className={mx('flex flex-col w-full gap-2 p-2', classNames)}>
      {/* Generated fields. */}
      {props.map(({ property, type, title }) => {
        const PropertyInput = Custom?.[property] ?? FormInput<T>;
        return (
          <div key={property} role='none'>
            <PropertyInput
              property={property}
              type={type === 'number' ? 'number' : undefined}
              label={title ?? property}
              disabled={readonly}
              getInputProps={getInputProps}
              getErrorValence={getErrorValence}
              getErrorMessage={getErrorMessage}
            />
          </div>
        );
      })}

      {/* TODO(burdon): Option. */}
      {!readonly && (
        <div className='flex w-full justify-center'>
          <div className='flex gap-2'>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              <Icon icon='ph--check--regular' />
            </Button>
            <Button onClick={onCancel}>
              <Icon icon='ph--x--regular' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
