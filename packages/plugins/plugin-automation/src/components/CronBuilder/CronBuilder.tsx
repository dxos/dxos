//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';
import type * as SchemaAST from 'effect/SchemaAST';

import {
  Form,
  type FormFieldComponentProps,
  type FormFieldMap,
  type FormRootProps,
  SelectField,
  useFormFieldState,
} from '@dxos/react-ui-form';

import { toCron } from './cron';
import {
  CronBuilderSchema,
  type CronBuilderSchemaType,
  type CronSpecType,
  FrequencyDefaults,
  FrequencyLabels,
  Frequencies,
} from './schema';

export type CronBuilderProps = {
  value?: CronSpecType;
  onChange?: (value: CronSpecType, cron: string) => void;
} & Pick<FormRootProps, 'readonly'>;

export const CronBuilder = ({ value, onChange, readonly }: CronBuilderProps) => {
  const fieldMap = useFrequencyFieldMap();

  const defaultValues = useMemo<CronBuilderSchemaType>(
    () => ({ spec: value ?? FrequencyDefaults.daily }),
    [],
  );

  const handleValuesChanged = useCallback(
    (values: Partial<CronBuilderSchemaType>) => {
      if (values.spec) {
        onChange?.(values.spec, toCron(values.spec));
      }
    },
    [onChange],
  );

  return (
    <Form.Root<CronBuilderSchemaType>
      schema={CronBuilderSchema}
      defaultValues={defaultValues}
      readonly={readonly}
      fieldMap={fieldMap}
      onValuesChanged={handleValuesChanged}
    >
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

CronBuilder.displayName = 'CronBuilder';

const useFrequencyFieldMap = (): FormFieldMap => {
  return useMemo(
    (): FormFieldMap => ({
      'spec.frequency': (props) => <FrequencySelector {...props} />,
    }),
    [],
  );
};

const FrequencySelector = (props: FormFieldComponentProps) => {
  // Access the parent `spec` field so switching frequency replaces the entire variant object.
  const specState = useFormFieldState(FrequencySelector.displayName, ['spec']);

  const handleChange = useCallback(
    (_type: SchemaAST.AST, newFrequency: string) => {
      const freq = Frequencies.find((f) => f === newFrequency);
      if (!freq) {
        return;
      }
      specState.onValueChange(props.type, FrequencyDefaults[freq]);
    },
    [props.type, specState],
  );

  const options = useMemo(
    () => Frequencies.map((freq) => ({ value: freq, label: FrequencyLabels[freq] })),
    [],
  );

  return <SelectField {...props} options={options} onValueChange={handleChange} />;
};

FrequencySelector.displayName = 'Form.FrequencySelector';
