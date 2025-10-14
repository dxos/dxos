//
// Copyright 2024 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import { type Schema } from 'effect';
import React, { type ReactElement, useCallback, useEffect, useRef } from 'react';

import { type BaseObject, type PropertyKey } from '@dxos/echo/internal';
import { type ThemedClassName } from '@dxos/react-ui';
import { cardDialogOverflow, cardSpacing } from '@dxos/react-ui-stack';
import { type ProjectionModel, type SchemaProperty } from '@dxos/schema';

import { type FormHandler, type FormOptions } from '../../hooks';

import { FormActions, type FormOuterSpacing } from './FormActions';
import { FormFields, type FormFieldsProps } from './FormContent';
import { FormProvider } from './FormContext';
import { type InputComponent, type InputProps } from './Input';

export type PropsFilter<T extends BaseObject> = (props: SchemaProperty<T>[]) => SchemaProperty<T>[];

export type ComponentLookup = (args: {
  prop: string;
  schema: Schema.Schema<any>;
  inputProps: InputProps;
}) => ReactElement | undefined;

export type CustomInputMap = Partial<Record<string, InputComponent>>;

export type FormProps<T extends BaseObject> = ThemedClassName<{
  values: Partial<T>;
  // TODO(burdon): Autofocus first input.
  autoFocus?: boolean;
  // TODO(burdon): Change to JsonPath includes/excludes.
  filter?: PropsFilter<T>;
  sort?: PropertyKey<T>[];
  projection?: ProjectionModel;
  autoSave?: boolean;
  outerSpacing?: FormOuterSpacing;
  onCancel?: () => void;
}> &
  Pick<FormOptions<T>, 'schema' | 'onValuesChanged' | 'onValidate' | 'onSave'> &
  FormFieldsProps;

export const Form = <T extends BaseObject>({
  classNames,
  testId,
  values: initialValues,
  autoFocus,
  readonly,
  autoSave,
  outerSpacing = true,
  schema,
  onCancel,
  onValuesChanged,
  onValidate,
  onSave,
  ...props
}: FormProps<T>) => {
  const formRef = useRef<HTMLDivElement>(null);

  // Focus the first focusable element within this form.
  const { findFirstFocusable } = useFocusFinders();
  useEffect(() => {
    if (autoFocus && formRef.current) {
      const firstFocusable = findFirstFocusable(formRef.current);
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [autoFocus]);

  // TODO(burdon): Name?
  const handleValid = useCallback(
    async (values: any, meta: { changed: FormHandler<T>['changed'] }) => {
      if (autoSave) {
        await onSave?.(values, meta);
      }
    },
    [autoSave, onSave],
  );

  return (
    <FormProvider
      formRef={formRef}
      schema={schema}
      autoSave={autoSave}
      initialValues={initialValues}
      onValuesChanged={onValuesChanged}
      onValidate={onValidate}
      onValid={handleValid}
      onSave={onSave}
    >
      <div role='none' className='contents' data-testid={testId}>
        <FormFields
          {...props}
          ref={formRef}
          classNames={[
            outerSpacing === 'blockStart-0'
              ? 'pli-cardSpacingInline mbe-cardSpacingBlock [&>.mbs-inputSpacingBlock:first-child]:!mbs-0'
              : outerSpacing === 'scroll-fields'
                ? 'pli-cardSpacingInline pbe-cardSpacingBlock'
                : outerSpacing
                  ? cardSpacing
                  : false,
            outerSpacing === 'scroll-fields' && cardDialogOverflow,
            classNames,
          ]}
          readonly={readonly}
          schema={schema}
        />
        {(onCancel || onSave) && !autoSave && !readonly && (
          <FormActions readonly={readonly} onCancel={onCancel} outerSpacing={outerSpacing} />
        )}
      </div>
    </FormProvider>
  );
};
