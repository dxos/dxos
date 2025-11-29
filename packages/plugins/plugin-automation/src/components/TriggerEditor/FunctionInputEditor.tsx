//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Ref, Type } from '@dxos/echo';
import { type JsonPath } from '@dxos/echo/internal';
import { type Function } from '@dxos/functions';
import { Input, type ThemedClassName, useOnTransition } from '@dxos/react-ui';
import {
  type FormFieldStateProps,
  NewForm,
  type NewFormRootProps,
  type QueryRefOptions,
  useFormValues,
} from '@dxos/react-ui-form';

export type FunctionInputEditorProps = ThemedClassName<
  {
    functions: Function.Function[];
    onQueryRefOptions: QueryRefOptions;
  } & FormFieldStateProps
>;

/**
 * Editor component for function input parameters.
 */
export const FunctionInputEditor = ({
  classNames,
  functions,
  getValue,
  onValueChange,
  onQueryRefOptions,
}: FunctionInputEditorProps) => {
  const selectedFunctionValue = useFormValues(FunctionInputEditor.displayName, ['function' as JsonPath]);
  const selectedFunctionId = useMemo(() => {
    if (Ref.isRef(selectedFunctionValue)) {
      return selectedFunctionValue.dxn.toString().split('dxn:echo:@:').at(1);
    }
  }, [selectedFunctionValue]);

  const selectedFunction = useMemo(
    () => functions.find((fn) => fn.id === selectedFunctionId),
    [functions, selectedFunctionId],
  );

  useOnTransition(
    // Clear function parameter input when the function changes.
    selectedFunctionValue,
    (prevValue) => {
      if (!Ref.isRef(prevValue) || !Ref.isRef(selectedFunctionValue)) {
        return false;
      }

      return prevValue.dxn.toString() !== selectedFunctionValue.dxn.toString();
    },
    (currValue) => currValue !== undefined,
    () => onValueChange('object', {}),
  );

  const inputSchema = useMemo(() => selectedFunction?.inputSchema, [selectedFunction]);
  const effectSchema = useMemo(() => (inputSchema ? Type.toEffectSchema(inputSchema) : undefined), [inputSchema]);
  const propertyCount = inputSchema?.properties ? Object.keys(inputSchema.properties).length : 0;

  const values = useMemo(() => getValue() ?? {}, [getValue]);

  const handleValuesChanged = useCallback<NonNullable<NewFormRootProps['onValuesChanged']>>(
    (values) => {
      onValueChange('object', values);
    },
    [onValueChange],
  );

  if (selectedFunction === undefined || effectSchema === undefined || propertyCount === 0) {
    return null;
  }

  return (
    <>
      <Input.Root>
        <Input.Label>Function parameters</Input.Label>
      </Input.Root>
      <NewForm.Root
        schema={effectSchema}
        values={values}
        onValuesChanged={handleValuesChanged}
        onQueryRefOptions={onQueryRefOptions}
      >
        <NewForm.FieldSet />
      </NewForm.Root>
    </>
  );
};

FunctionInputEditor.displayName = 'AutomationTrigger.FunctionInputEditor';
