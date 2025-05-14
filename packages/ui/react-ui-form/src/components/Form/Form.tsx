//
// Copyright 2024 DXOS.org
//

import { type Schema } from 'effect';
import React, { type ReactElement, useEffect, useMemo, useRef } from 'react';

import { type BaseObject, type PropertyKey } from '@dxos/echo-schema';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type SchemaProperty } from '@dxos/schema';

import { FormActions } from './FormActions';
import { FormFields } from './FormContent';
import { FormProvider } from './FormContext';
import { type InputProps, type InputComponent } from './Input';
import { type FormOptions, type QueryRefOptions } from '../../hooks';

export type PropsFilter<T extends BaseObject> = (props: SchemaProperty<T>[]) => SchemaProperty<T>[];

export type ComponentLookup = (args: {
  prop: string;
  schema: Schema.Schema<any>;
  inputProps: InputProps;
}) => ReactElement | undefined;

export type CustomInputMap = Partial<Record<string, InputComponent>>;

export type FormProps<T extends BaseObject> = ThemedClassName<
  {
    values: Partial<T>;

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
    onQueryRefOptions?: QueryRefOptions;
    lookupComponent?: ComponentLookup;
    /**
     * Map of custom renderers for specific properties.
     * Prefer lookupComponent for plugin specific input surfaces.
     */
    Custom?: CustomInputMap;
  } & Pick<FormOptions<T>, 'schema' | 'onValuesChanged' | 'onValidate' | 'onSave'>
>;

export const Form = <T extends BaseObject>({
  classNames,
  schema,
  values: initialValues,
  path = [],
  autoFocus,
  readonly,
  filter,
  sort,
  autoSave,
  testId,
  onValuesChanged,
  onValidate,
  onSave,
  onCancel,
  onQueryRefOptions,
  lookupComponent,
  Custom,
}: FormProps<T>) => {
  const formRef = useRef<HTMLDivElement>(null);
  const onValid = useMemo(() => (autoSave ? onSave : undefined), [autoSave, onSave]);

  // Focus the first input element within this form.
  useEffect(() => {
    if (autoFocus && formRef.current) {
      const input = formRef.current.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  }, [autoFocus]);

  return (
    <FormProvider
      formRef={formRef}
      schema={schema}
      autoSave={autoSave}
      initialValues={initialValues}
      onValuesChanged={onValuesChanged}
      onValidate={onValidate}
      onValid={onValid}
      onSave={onSave}
    >
      {/* TODO(burdon): Remove padding. */}
      <div ref={formRef} role='none' className={mx('p-2', classNames)} data-testid={testId}>
        <FormFields
          schema={schema}
          path={path}
          readonly={readonly}
          filter={filter}
          sort={sort}
          onQueryRefOptions={onQueryRefOptions}
          lookupComponent={lookupComponent}
          Custom={Custom}
        />
        {(onCancel || onSave) && !autoSave && <FormActions onCancel={onCancel} readonly={readonly} />}
      </div>
    </FormProvider>
  );
};
