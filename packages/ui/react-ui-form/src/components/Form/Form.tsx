//
// Copyright 2024 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import React, { useCallback, useEffect, useRef } from 'react';

import { type AnyProperties, type PropertyKey } from '@dxos/echo/internal';
import { type ThemedClassName } from '@dxos/react-ui';
import { cardDialogOverflow, cardSpacing } from '@dxos/react-ui-stack';
import { type ProjectionModel, type SchemaProperty } from '@dxos/schema';

import { type FormHandler, type FormOptions } from '../../hooks';

import { FormActions, type FormOuterSpacing } from './FormActions';
import { FormFieldSet, type FormFieldSetProps } from './FormFieldSet';
import { FormProvider } from './FormRoot';

export type PropertyFilter<T extends AnyProperties> = (props: SchemaProperty<T>[]) => SchemaProperty<T>[];

export type FormProps<T extends AnyProperties> = ThemedClassName<{
  id?: string;
  values: Partial<T>;
  sort?: PropertyKey<T>[];
  exclude?: PropertyFilter<T>;
  projection?: ProjectionModel;
  autoFocus?: boolean;
  autoSave?: boolean;
  outerSpacing?: FormOuterSpacing;
  onCancel?: () => void;
}> &
  Pick<FormOptions<T>, 'schema' | 'onValuesChanged' | 'onValidate' | 'onSave'> &
  // TODO(wittjosiah): This needs to support different ref field options per field.
  FormFieldSetProps;

export const Form = <T extends AnyProperties>({
  classNames,
  id,
  testId,
  values: initialValues,
  readonly,
  autoFocus,
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
      <div role='none' className='contents' {...(id && { 'data-object-id': id })} data-testid={testId}>
        <FormFieldSet
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
