//
// Copyright 2024 DXOS.org
//

import { Option, pipe } from 'effect';
import React from 'react';

import { AST, type S } from '@dxos/effect';
import { Button, Icon, Input, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { getColumnValue, getProperty, setColumnValue, type FieldType } from './types';

export type FormProps<T = {}> = ThemedClassName<{
  data?: T;
  schema?: S.Schema<T>;
  fields: readonly FieldType[];
  readonly?: boolean;
}>;

/**
 * Schema-based object form.
 */
export const Form = <T = {},>({ classNames, data, schema, fields, readonly }: FormProps<T>) => {
  return (
    <div role='none' className={mx('flex flex-col w-full gap-2', classNames)}>
      {fields.map((field) => {
        const prop = schema && getProperty(schema, field);
        const label = field.label ?? (prop && pipe(AST.getTitleAnnotation(prop), Option.getOrUndefined));
        const description = (prop && pipe(AST.getDescriptionAnnotation(prop), Option.getOrUndefined)) ?? label;

        const value = data ? getColumnValue(data, field) : undefined;

        if (prop && AST.isBooleanKeyword(prop)) {
          return (
            <Input.Root key={field.path}>
              <Input.Label classNames='px-1'>{label}</Input.Label>
              <Input.Switch
                disabled={readonly}
                checked={!!value}
                onCheckedChange={(checked) => setColumnValue(data, field, checked)}
              />
            </Input.Root>
          );
        }

        // TODO(burdon): Format number.
        if (prop && AST.isNumberKeyword(prop)) {
          return null;
        }

        return (
          <Input.Root key={field.path}>
            <Input.Label classNames='px-1'>{label}</Input.Label>
            <Input.TextInput
              disabled={readonly}
              placeholder={description}
              value={value ? String(value) : ''}
              onChange={(event) => setColumnValue(data, field, event.target.value)}
            />
          </Input.Root>
        );
      })}

      {/* TODO(burdon): Move to SchemeEditor. */}
      {!readonly && (
        <div className='flex justify-center'>
          <Button>
            <Icon icon='ph--plus--regular' size={4} />
          </Button>
        </div>
      )}
    </div>
  );
};
