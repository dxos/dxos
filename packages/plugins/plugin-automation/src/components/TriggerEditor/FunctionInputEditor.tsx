//
// Copyright 2025 DXOS.org
//

import type * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback, useMemo } from 'react';

import { Ref, Type } from '@dxos/echo';
import { type JsonPath } from '@dxos/echo/internal';
import { type Function } from '@dxos/functions';
import { useOnTransition, useTranslation } from '@dxos/react-ui';
import {
  Form,
  type FormFieldStateProps,
  type FormRootProps,
  type QueryRefOptions,
  useFormValues,
} from '@dxos/react-ui-form';

import { meta } from '../../meta';

export type FunctionInputEditorProps = {
  type: SchemaAST.AST;
  functions: Function.Function[];
  onQueryRefOptions: QueryRefOptions;
} & FormFieldStateProps;

export const FunctionInputEditor = ({
  type,
  functions,
  getValue,
  onValueChange,
  onQueryRefOptions,
}: FunctionInputEditorProps) => {
  const { t } = useTranslation(meta.id);
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
    () => onValueChange(type, {}),
  );

  const inputSchema = useMemo(() => selectedFunction?.inputSchema, [selectedFunction]);
  const effectSchema = useMemo(() => (inputSchema ? Type.toEffectSchema(inputSchema) : undefined), [inputSchema]);
  const propertyCount = inputSchema?.properties ? Object.keys(inputSchema.properties).length : 0;
  const values = useMemo(() => getValue() ?? {}, [getValue]);

  const handleValuesChanged = useCallback<NonNullable<FormRootProps['onValuesChanged']>>(
    (values) => {
      onValueChange(type, values);
    },
    [type, onValueChange],
  );

  if (selectedFunction === undefined || effectSchema === undefined || propertyCount === 0) {
    return null;
  }

  return (
    <>
      <Form.Label label={t('function parameters label')} asChild />
      <Form.Root
        schema={effectSchema}
        values={values}
        onValuesChanged={handleValuesChanged}
        onQueryRefOptions={onQueryRefOptions}
      >
        <Form.FieldSet />
      </Form.Root>
    </>
  );
};

FunctionInputEditor.displayName = 'AutomationTrigger.FunctionInputEditor';
