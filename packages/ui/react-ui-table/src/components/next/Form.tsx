//
// Copyright 2024 DXOS.org
//

import { Option, pipe } from 'effect';
import React, { useEffect, useState } from 'react';

import { AST, type S } from '@dxos/effect';
import { Input, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { getFormat, RealNumberFormat } from './annotations';
import { getColumnValue, getProperty, setColumnValue, type FormType } from './types';

export type FormProps<T = {}> = ThemedClassName<{
  data?: T;
  schema?: S.Schema<T>;
  form: FormType;
  readonly?: boolean;
}>;

/**
 * Schema-based object form.
 */
export const Form = <T = {},>({ classNames, data, schema, form, readonly }: FormProps<T>) => {
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  useEffect(() => {}, []);

  return (
    <div role='none' className={mx('flex flex-col w-full gap-2', classNames)}>
      {form.fields.map((field) => {
        const prop = schema && getProperty(schema, field);
        const label = field.label ?? (prop && pipe(AST.getTitleAnnotation(prop), Option.getOrUndefined));
        const description = (prop && pipe(AST.getDescriptionAnnotation(prop), Option.getOrUndefined)) ?? label;
        const format = (prop && (getFormat(prop) ?? (AST.isNumberKeyword(prop) && RealNumberFormat))) || undefined;

        //
        // Boolean
        //

        if (prop && AST.isBooleanKeyword(prop)) {
          const value = data && getColumnValue(data, field);
          const onChange = (checked: boolean) => {
            setColumnValue(data, field, checked);
          };

          return (
            <div key={field.path} className='flex flex-col w-full gap-1'>
              <Input.Root>
                <Input.Label classNames='px-1'>{label}</Input.Label>
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

        // TODO(burdon): Factor out with hook.
        const value = data ? getColumnValue(data, field) : undefined;
        const onChange = (text: string) => {
          if (!format?.filter || text.match(format.filter)) {
            setColumnValue(data, field, text);
            if (format?.valid) {
              setInvalid((map) => ({ ...map, [field.path]: !format.valid!.test(text) }));
            }
          }
        };

        return (
          <div key={field.path} className='flex flex-col w-full gap-1'>
            <Input.Root>
              <Input.Label classNames='px-1'>{label}</Input.Label>
              <Input.TextInput
                // TODO(burdon): Correct approach? Push down to component.
                style={invalid[field.path] ? ({ '--tw-ring-color': 'red' } as any) : {}}
                disabled={readonly}
                placeholder={description}
                value={value ? String(value) : ''}
                onChange={(event) => onChange(event.target.value)}
              />
            </Input.Root>
          </div>
        );
      })}
    </div>
  );
};
