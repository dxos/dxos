//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useMemo } from 'react';

import { type S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type PropertyKey, type SchemaProperty, type ValidationError } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { getPropertyInput } from './factory';
import { type InputProps, useForm } from '../../hooks';
import { translationKey } from '../../translations';

export type PropsFilter<T extends Object> = (props: SchemaProperty<T>[]) => SchemaProperty<T>[];

export type FormProps<T extends object> = ThemedClassName<{
  schema: S.Schema<T>;
  values: T;
  autoFocus?: boolean; // TODO(burdon): Not used.
  readonly?: boolean;
  filter?: PropsFilter<T>;
  sort?: (keyof T)[];
  onValidate?: (values: T) => ValidationError[] | undefined;
  onValuesChanged?: (values: T) => void;
  onSave?: (values: T) => void;
  onCancel?: () => void;

  /**
   * Map of custom renderers for specific properties.
   */
  Custom?: Partial<Record<PropertyKey<T>, FC<InputProps<T>>>>;
}>;

/**
 * General purpose form component that displays field controls based on the given schema.
 */
export const Form = <T extends object>({
  classNames,
  schema,
  values,
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
  const { canSubmit, errors, handleSubmit, ...inputProps } = useForm<T>({
    schema,
    initialValues: values,
    onValuesChanged,
    onValidate,
    onSubmit: (values) => onSave?.(values),
  });

  // TODO(burdon): Highlight in UX.
  useEffect(() => {
    if (errors && Object.keys(errors).length) {
      log.warn('validation', { errors });
    }
  }, [errors]);

  // Filter and sort props.
  const props = useMemo(() => {
    const props = getSchemaProperties<T>(schema); // TODO(burdon): Allow objects.
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
        .map(({ property, type, format, title, description }) => {
          if (!type) {
            return null;
          }

          // Custom property allows for sub forms.
          // TODO(burdon): Use Select control if options are present.
          const PropertyInput = Custom?.[property] ?? getPropertyInput<T>(type, format);
          if (!PropertyInput) {
            log.warn('no renderer for property', { property, type });
            return null;
          }

          return (
            <div key={property} role='none'>
              <PropertyInput
                type={type}
                format={format}
                property={property}
                disabled={readonly}
                label={title ?? property}
                placeholder={description}
                {...inputProps}
              />
            </div>
          );
        })
        .filter(isNotFalsy)}

      {(onCancel || onSave) && (
        <div role='none' className='flex justify-center'>
          <div role='none' className={mx(onCancel && !readonly && 'grid grid-cols-2 gap-2')}>
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
