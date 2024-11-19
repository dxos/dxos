//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { AST, S } from '@dxos/echo-schema';
import { findNode } from '@dxos/effect';
import { log } from '@dxos/log';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type PropertyKey, type SchemaProperty } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { type InputComponent } from './Input';
import { getInputComponent } from './factory';
import { type FormOptions, useForm } from '../../hooks';
import { translationKey } from '../../translations';

// TODO(burdon): Rename package react-ui-form; delete react-ui-card.

const padding = 'px-2';

export type PropsFilter<T extends Object> = (props: SchemaProperty<T>[]) => SchemaProperty<T>[];

export type FormProps<T extends object> = ThemedClassName<
  {
    values: T;

    // TODO(burdon): Autofocus first input.
    autoFocus?: boolean;
    readonly?: boolean;
    // TODO(burdon): Change to JsonPath includes/excludes.
    filter?: PropsFilter<T>;
    sort?: PropertyKey<T>[];
    autosave?: boolean;
    onCancel?: () => void;

    /**
     * Map of custom renderers for specific properties.
     */
    Custom?: Partial<Record<PropertyKey<T>, InputComponent<T>>>;
  } & Pick<FormOptions<T>, 'schema' | 'onValuesChanged' | 'onValidate' | 'onSubmit'>
>;

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
  autosave,
  onValuesChanged,
  onValidate,
  onSubmit,
  onCancel,
  Custom,
}: FormProps<T>) => {
  const { t } = useTranslation(translationKey);
  const onValid = useMemo(() => (autosave ? onSubmit : undefined), [autosave, onSubmit]);
  const { canSubmit, errors, handleSubmit, ...inputProps } = useForm<T>({
    schema,
    initialValues: values,
    onValuesChanged,
    onValidate,
    onValid,
    onSubmit,
  });

  // Filter and sort props.
  // TODO(burdon): Move into useForm?
  const props = useMemo(() => {
    const props = getSchemaProperties<T>(schema.ast);
    const filtered = filter ? filter(props) : props;
    const findIndex = (props: PropertyKey<T>[], prop: PropertyKey<T>) => {
      const idx = props.findIndex((p) => p === prop);
      return idx === -1 ? Infinity : idx;
    };

    return sort ? filtered.sort(({ name: a }, { name: b }) => findIndex(sort, a) - findIndex(sort, b)) : filtered;
  }, [schema, filter]);

  // TODO(burdon): Highlight in UX.
  useEffect(() => {
    if (errors && Object.keys(errors).length) {
      log.warn('validation', { errors });
    }
  }, [errors]);

  return (
    <div className={mx('flex flex-col w-full gap-1', classNames)}>
      {props
        .map(({ prop, name, type, format, title, description }) => {
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
                    <Form<any>
                      schema={S.make(typeLiteral)}
                      values={values[name]}
                      autosave={true}
                      onSubmit={(childValues) => {
                        inputProps.onValueChange(name, 'object', childValues);
                      }}
                    />
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

      {(onCancel || onSubmit) && !autosave && (
        <div role='none' className='flex justify-center'>
          <div role='none' className={mx(onCancel && !readonly && 'grid grid-cols-2 gap-2')}>
            {onCancel && !readonly && (
              <IconButton icon='ph--x--regular' label={t('button cancel')} onClick={onCancel} />
            )}
            {onSubmit && (
              <IconButton
                type='submit'
                icon='ph--check--regular'
                label={t('button save')}
                onClick={handleSubmit}
                disabled={!canSubmit}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
