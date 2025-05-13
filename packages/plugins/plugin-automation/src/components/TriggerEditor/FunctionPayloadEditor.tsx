//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type JsonPath, RefImpl, toEffectSchema } from '@dxos/echo-schema';
import { type FunctionType } from '@dxos/functions';
import { useOnTransition } from '@dxos/react-ui';
import { Form, type FormInputStateProps, type QueryRefOptions, useFormValues } from '@dxos/react-ui-form';

export type FunctionMetaEditorProps = {
  functions: FunctionType[];
  onQueryRefOptions: QueryRefOptions;
} & FormInputStateProps;

/**
 * Editor component for function meta parameters.
 */
export const FunctionPayloadEditor = ({
  functions,
  getValue,
  onValueChange,
  onQueryRefOptions,
}: FunctionMetaEditorProps) => {
  const selectedFunctionValue = useFormValues(['function' as JsonPath]);
  const selectedFunctionName = useMemo(() => {
    if (selectedFunctionValue instanceof RefImpl) {
      return selectedFunctionValue.dxn.toString().split('dxn:worker:').at(1);
    }
  }, [selectedFunctionValue]);

  const selectedFunction = useMemo(
    () => functions.find((f) => f.name === selectedFunctionName),
    [functions, selectedFunctionName],
  );

  useOnTransition(
    // Clear function parameter meta when the function changes.
    selectedFunctionValue,
    (prevValue) => prevValue !== undefined && prevValue !== selectedFunctionValue,
    (currValue) => currValue !== undefined,
    () => onValueChange('object', {}),
  );

  const inputSchema = useMemo(() => selectedFunction?.inputSchema, [selectedFunction]);
  const effectSchema = useMemo(() => (inputSchema ? toEffectSchema(inputSchema) : undefined), [inputSchema]);
  const propertyCount = inputSchema?.properties ? Object.keys(inputSchema.properties).length : 0;

  const values = useMemo(() => getValue() ?? {}, [getValue]);

  const handleValuesChanged = useCallback(
    (values: any) => {
      onValueChange('object', values);
    },
    [onValueChange],
  );

  if (selectedFunction === undefined || effectSchema === undefined || propertyCount === 0) {
    return null;
  }

  return (
    <>
      <h3 className='text-md'>Function parameters</h3>
      {/* TODO(ZaymonFC): Try using <FormFields /> internal component for this nesting.
                          This would allow errors to flow up to the root context. */}
      <Form
        schema={effectSchema}
        values={values}
        classNames='p-0'
        onValuesChanged={handleValuesChanged}
        onQueryRefOptions={onQueryRefOptions}
      />
    </>
  );
};
