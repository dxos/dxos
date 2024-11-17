//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useMemo } from 'react';

import { AST, S } from '@dxos/echo-schema';
import { findNode } from '@dxos/effect';
import { log } from '@dxos/log';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type PropertyKey, type SchemaProperty, type ValidationError } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { getInputComponent } from './factory';
import { type InputProps, useForm } from '../../hooks';
import { translationKey } from '../../translations';

// TODO(burdon): Rename package react-ui-form; delete react-ui-card.

const padding = 'px-2';

export type PropsFilter<T extends Object> = (props: SchemaProperty<T>[]) => SchemaProperty<T>[];

export type FormProps<T extends object> = ThemedClassName<{
  schema: S.Schema<T>;
  values: T;
  autoFocus?: boolean; // TODO(burdon): Not used.
  readonly?: boolean;
  filter?: PropsFilter<T>;
  sort?: PropertyKey<T>[];
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
    const props = getSchemaProperties<T>(schema.ast);
    const filtered = filter ? filter(props) : props;
    const findIndex = (props: PropertyKey<T>[], prop: PropertyKey<T>) => {
      const idx = props.findIndex((p) => p === prop);
      return idx === -1 ? Infinity : idx;
    };

    return sort ? filtered.sort(({ name: a }, { name: b }) => findIndex(sort, a) - findIndex(sort, b)) : filtered;
  }, [schema, filter]);

  return (
    <div className={mx('flex flex-col w-full gap-1', classNames)}>
      {props
        .map(({ prop, name, type, format, title, description }) => {
          if (!type) {
            return null;
          }

          // Custom property allows for sub forms.
          // TODO(burdon): Use Select control if options are present in annotation?
          const InputComponent = Custom?.[name] ?? getInputComponent<T>(type, format);
          if (!InputComponent) {
            // Recursively render form.
            if (type === 'object') {
              const typeLiteral = findNode(prop.type, AST.isTypeLiteral);
              if (typeLiteral) {
                return (
                  <div key={name} role='none'>
                    <div className={padding}>{title ?? name}</div>
                    <Form<any> schema={S.make(typeLiteral)} values={values[name]} />
                  </div>
                );
              }
            }

            log.warn('no renderer for property', { name, type });
            return null;
          }

          return (
            <div key={name} role='none' className={padding}>
              <InputComponent
                type={type}
                format={format}
                property={name}
                disabled={readonly}
                label={title ?? name}
                placeholder={description}
                {...inputProps}
              />
            </div>
          );
        })
        .filter(isNotFalsy)}

      {/* {errors && <div className='overflow-hidden text-sm'>{JSON.stringify(errors)}</div>} */}

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
