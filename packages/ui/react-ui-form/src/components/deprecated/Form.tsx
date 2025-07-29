//
// Copyright 2024 DXOS.org
//

import { SchemaAST, type Schema, Option, pipe } from 'effect';
import React, { useState } from 'react';

import { findProperty } from '@dxos/effect';
import { Input, type ThemedClassName, type TextInputProps as NativeTextInputProps } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getFieldValue, setFieldValue, type Projection } from '@dxos/schema';

export type DeprecatedFormProps<T extends {} = {}> = ThemedClassName<{
  projection: Projection;
  object: T;
  schema?: Schema.Schema<T>;
  readonly?: boolean;
}>;

/**
 * Schema-based object form.
 */
export const DeprecatedForm = <T extends {} = {}>({
  classNames,
  projection,
  object,
  schema,
  readonly,
}: DeprecatedFormProps<T>) => {
  return (
    <div role='none' className={mx('flex flex-col w-full gap-2 p-2', classNames)}>
      {projection.fields.map((field) => {
        const prop = schema && findProperty(schema, field.path);
        const title = (prop && pipe(SchemaAST.getTitleAnnotation(prop), Option.getOrUndefined)) ?? '';
        const description = (prop && pipe(SchemaAST.getDescriptionAnnotation(prop), Option.getOrUndefined)) ?? title;
        // const format =
        //   (prop && (getPatternAnnotation(prop) ?? (SchemaAST.isNumberKeyword(prop) && RealNumberFormat))) || undefined;

        //
        // Boolean
        //

        if (prop && SchemaAST.isBooleanKeyword(prop)) {
          const value = object && getFieldValue(object, field);
          const onChange = (checked: boolean) => {
            setFieldValue(object, field, checked);
          };

          return (
            <div key={field.path} className='flex flex-col w-full gap-1'>
              <Input.Root>
                <Input.Label classNames='px-1'>{title}</Input.Label>
                <Input.Switch disabled={readonly} checked={!!value} onCheckedChange={(checked) => onChange(checked)} />
              </Input.Root>
            </div>
          );
        }

        //
        // Strings
        // TODO(burdon): Other types:
        //  - RichText editor
        //  - Numbers (with formatting: commas, currency, etc.)
        //  - Date (https://ark-ui.com/react/docs/components/date-picker)
        //  - Enum (single/multi-select)
        //

        const value = object ? getFieldValue(object, field) : undefined;

        return (
          <div key={field.path} className='flex flex-col w-full gap-1'>
            <Input.Root>
              <Input.Label classNames='px-1'>{title}</Input.Label>
              <TextInput
                disabled={readonly}
                placeholder={description}
                // format={format}
                value={value ? String(value) : ''}
                onChange={(event) => setFieldValue(object, field, event.target.value)}
              />
            </Input.Root>
          </div>
        );
      })}
    </div>
  );
};

type TextInputProps = {
  // format?: PatternAnnotation;
} & Omit<NativeTextInputProps, 'style'>;

/**
 * @deprecated
 */
// TODO(burdon): Remove.
// TODO(burdon): Use schema validation directly.
const TextInput = ({ onChange, ...props }: TextInputProps) => {
  const [valid, _setValid] = useState(true);

  const handleChange: NativeTextInputProps['onChange'] = (ev) => {
    // const text = ev.target.value;
    // if (!format?.filter || text.match(format.filter)) {
    onChange?.(ev);
    //   if (format?.valid) {
    //     setValid(format.valid.test(text));
    //   }
    // }
  };

  return (
    <Input.TextInput
      {...props}
      // TODO(burdon): validationValence on Input.
      style={valid ? {} : ({ '--tw-ring-color': 'red' } as any)}
      onChange={handleChange}
    />
  );
};
