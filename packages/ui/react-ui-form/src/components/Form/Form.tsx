//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import { capitalize } from 'effect/String';
import React, { Fragment, useEffect, useMemo } from 'react';

import { AST, type BaseObject, S, type PropertyKey } from '@dxos/echo-schema';
import { findNode, getDiscriminatedType, isDiscriminatedUnion, SimpleType } from '@dxos/effect';
import { log } from '@dxos/log';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type SchemaProperty } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { SelectInput } from './Defaults';
import { InputHeader, type InputComponent } from './Input';
import { getInputComponent } from './factory';
import { type FormOptions, useForm } from '../../hooks';
import { translationKey } from '../../translations';

// TODO(burdon): Rename package react-ui-form; delete react-ui-card.

const padding = 'px-2';

export type PropsFilter<T extends BaseObject> = (props: SchemaProperty<T>[]) => SchemaProperty<T>[];

export type FormProps<T extends BaseObject> = ThemedClassName<
  {
    // TODO(burdon): Partial<T>?
    values: T;

    /** Path to the current object from the root. Used with nested forms. */
    path?: string[];

    // TODO(burdon): Autofocus first input.
    autoFocus?: boolean;
    readonly?: boolean;
    // TODO(burdon): Change to JsonPath includes/excludes.
    filter?: PropsFilter<T>;
    sort?: PropertyKey<T>[];
    autoSave?: boolean;
    testId?: string;
    onCancel?: () => void;

    /**
     * Map of custom renderers for specific properties.
     */
    Custom?: Partial<Record<string, InputComponent<T>>>;
  } & Pick<FormOptions<T>, 'schema' | 'onValuesChanged' | 'onValidate' | 'onSave'>
>;

/**
 * General purpose form component that displays field controls based on the given schema.
 */
// TODO(burdon): Area to show general validation errors.
export const Form = <T extends BaseObject>({
  classNames,
  schema,
  values: initialValues,
  path = [],
  readonly,
  filter,
  sort,
  autoSave,
  testId,
  onValuesChanged,
  onValidate,
  onSave,
  onCancel,
  Custom,
}: FormProps<T>) => {
  const { t } = useTranslation(translationKey);
  const onValid = useMemo(() => (autoSave ? onSave : undefined), [autoSave, onSave]);
  const { canSave, values, errors, handleSave, ...inputProps } = useForm<T>({
    schema,
    initialValues,
    onValuesChanged,
    onValidate,
    onValid,
    onSave,
  });

  // Filter and sort props.
  // TODO(burdon): Move into useForm?
  const properties = useMemo(() => {
    const props = getSchemaProperties<T>(schema.ast, values);
    const filtered = filter ? filter(props) : props;
    const findIndex = (props: PropertyKey<T>[], prop: PropertyKey<T>) => {
      const idx = props.findIndex((p) => p === prop);
      return idx === -1 ? Infinity : idx;
    };

    return sort ? filtered.sort(({ name: a }, { name: b }) => findIndex(sort, a) - findIndex(sort, b)) : filtered;
  }, [schema, filter, values]);

  // TODO(burdon): Highlight in UX.
  useEffect(() => {
    if (errors && Object.keys(errors).length) {
      log.warn('validation', { errors });
    }
  }, [errors]);

  return (
    <div role='form' className={mx('flex flex-col w-full gap-2 py-2', classNames)} data-testid={testId}>
      {properties
        .map((property) => {
          const { ast, name, type, format, title, description, examples, options, array } = property;
          const key = [...path, name];
          const label = title ?? pipe(name, capitalize);
          const placeholder = examples?.length ? `Example: "${examples[0]}"` : description;

          // Get generic input.
          // TODO(ZaymonFC): We might need to switch this to using globs since we're now indexing into arrays.
          let InputComponent = Custom?.[key.join('.')];
          if (!InputComponent) {
            // Select.
            if (options) {
              return (
                <div key={name} role='none' className={padding}>
                  <SelectInput
                    type={type}
                    format={format}
                    property={name}
                    disabled={readonly}
                    label={label}
                    options={options.map((option) => ({ value: option, label: String(option) }))}
                    placeholder={placeholder}
                    {...inputProps}
                  />
                </div>
              );
            }

            InputComponent = getInputComponent<T>(type, format);

            if (array) {
              const arrayValues = (values[name] ?? []) as any[];

              // TODO(ZaymonFC): Should this unwrapping happen at a lower level?
              const tupleType = findNode(ast, AST.isTupleType);
              const elementType = (tupleType as AST.TupleType | undefined)?.rest[0]?.type;

              if (type === 'object' && elementType) {
                const baseNode = findNode(elementType, isDiscriminatedUnion);
                const typeLiteral = baseNode
                  ? getDiscriminatedType(baseNode, values[name] as any)
                  : findNode(elementType, AST.isTypeLiteral);

                if (typeLiteral) {
                  const schema = S.make(typeLiteral);

                  return (
                    <div key={name} role='none' className={mx(padding)}>
                      <InputHeader>{label}</InputHeader>
                      <div role='none' className='flex flex-col gap-1'>
                        {arrayValues.map((value, index) => {
                          return (
                            <div key={index} role='none' className='flex items-center gap-1'>
                              <div role='none' className='flex-1'>
                                <Form<any>
                                  schema={schema}
                                  path={[...key, index.toString()]}
                                  values={value}
                                  onValuesChanged={(childValues) => {
                                    const newValues = [...arrayValues];
                                    newValues[index] = childValues;
                                    inputProps.onValueChange(name, 'object', newValues);
                                  }}
                                  Custom={Custom as any}
                                />
                              </div>
                              <IconButton
                                icon='ph--trash--regular'
                                iconOnly
                                label={t('button remove')}
                                onClick={() => {
                                  const newValues = arrayValues.filter((_, i) => i !== index);
                                  inputProps.onValueChange(name, type, newValues);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div role='none' className='flex justify-between items-center plb-1'>
                        <IconButton
                          icon='ph--plus--regular'
                          iconOnly
                          label={t('button add')}
                          onClick={() => {
                            const newValues = [...arrayValues, {}];
                            inputProps.onValueChange(name, type, newValues);
                          }}
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={name} role='none'>
                    Nested form not supported in arrays, yet.
                  </div>
                );
              }

              // TODO(ZaymonFC): Work with thure to build out this compound input?
              return (
                <div role='none' key='meta-input' className={mx(padding)}>
                  <InputHeader>{label}</InputHeader>
                  <div role='none' className='flex flex-col gap-1'>
                    {arrayValues.map((_, index) => (
                      <div key={index} role='none' className='flex items-center gap-1'>
                        {InputComponent && (
                          <>
                            <div role='none' className='flex-1'>
                              <InputComponent
                                type={type}
                                format={format}
                                label={label}
                                inputOnly
                                property={`${name}.${index}`}
                                disabled={readonly}
                                placeholder={placeholder}
                                {...inputProps}
                              />
                            </div>
                            <IconButton
                              icon='ph--trash--regular'
                              iconOnly
                              label={t('button remove')}
                              onClick={() => {
                                const newValues = arrayValues.filter((_, i) => i !== index);
                                inputProps.onValueChange(name, type, newValues);
                              }}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div role='none' className='flex justify-between items-center plb-1'>
                    <IconButton
                      icon='ph--plus--regular'
                      iconOnly
                      label={t('button add')}
                      onClick={() => {
                        const newValues = [...arrayValues, SimpleType.getDefaultValue(type)];
                        inputProps.onValueChange(name, type, newValues);
                      }}
                    />
                  </div>
                </div>
              );
            }
          }

          if (!InputComponent) {
            // Recursively render form.
            if (type === 'object') {
              const baseNode = findNode(ast, isDiscriminatedUnion);
              const typeLiteral = baseNode
                ? getDiscriminatedType(baseNode, values[name] as any)
                : findNode(ast, AST.isTypeLiteral);

              if (typeLiteral) {
                const schema = S.make(typeLiteral);
                return (
                  <div key={name} role='none'>
                    <div className={padding}>{label}</div>
                    <Form<any>
                      schema={schema}
                      path={key}
                      values={values[name] ?? {}}
                      onValuesChanged={(childValues) => {
                        inputProps.onValueChange(name, 'object', childValues);
                      }}
                      Custom={Custom as any}
                    />
                  </div>
                );
              }
            }

            log('no renderer for property', { name, type });
            return null;
          }

          return (
            <div key={name} role='none' className={padding}>
              <InputComponent
                type={type}
                format={format}
                property={name}
                disabled={readonly}
                label={label}
                placeholder={placeholder}
                {...inputProps}
              />
            </div>
          );
        })
        .filter(isNotFalsy)}
      {(onCancel || onSave) && !autoSave && (
        <FormActions onCancel={onCancel} onSubmit={handleSave} canSubmit={canSave} readonly={readonly} />
      )}
    </div>
  );
};

type FormActionsProps = {
  readonly?: boolean;
  canSubmit: boolean;
  onCancel?: () => void;
  onSubmit: () => void;
};

export const FormActions = ({ onCancel, onSubmit, canSubmit, readonly }: FormActionsProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <div role='none' className='flex justify-center'>
      <div role='none' className={mx(onCancel && !readonly && 'grid grid-cols-2 gap-2')}>
        {onCancel && !readonly && (
          <IconButton data-testid='cancel-button' icon='ph--x--regular' label={t('button cancel')} onClick={onCancel} />
        )}
        {onSubmit && (
          <IconButton
            type='submit'
            data-testid='save-button'
            disabled={!canSubmit}
            icon='ph--check--regular'
            label={t('button save')}
            onClick={onSubmit}
          />
        )}
      </div>
    </div>
  );
};
