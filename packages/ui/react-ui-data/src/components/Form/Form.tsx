//
// Copyright 2024 DXOS.org
//

import { Option, pipe } from 'effect';
import React from 'react';

import { AST, type S, getProperty } from '@dxos/effect';
import { Input, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type ViewType, getFieldValue, setFieldValue } from '@dxos/schema';

import { TextInput } from '../TextInput';

export type FormProps<T extends {} = {}> = ThemedClassName<{
  view: ViewType;
  object: T;
  schema?: S.Schema<T>;
  readonly?: boolean;
}>;

/**
 * Schema-based object form.
 */
export const Form = <T extends {} = {}>({ classNames, view, object, schema, readonly }: FormProps<T>) => {
  return (
    <div role='none' className={mx('flex flex-col w-full gap-2 p-2', classNames)}>
      {view.fields.map((field) => {
        const prop = schema && getProperty(schema, field.property);
        const title = (prop && pipe(AST.getTitleAnnotation(prop), Option.getOrUndefined)) ?? '';
        const description = (prop && pipe(AST.getDescriptionAnnotation(prop), Option.getOrUndefined)) ?? title;
        // const format =
        //   (prop && (getPatternAnnotation(prop) ?? (AST.isNumberKeyword(prop) && RealNumberFormat))) || undefined;

        //
        // Boolean
        //

        if (prop && AST.isBooleanKeyword(prop)) {
          const value = object && getFieldValue(object, field);
          const onChange = (checked: boolean) => {
            setFieldValue(object, field, checked);
          };

          return (
            <div key={field.property} className='flex flex-col w-full gap-1'>
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
          <div key={field.property} className='flex flex-col w-full gap-1'>
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
