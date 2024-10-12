//
// Copyright 2024 DXOS.org
//

import { Option, pipe } from 'effect';
import React from 'react';

import * as effect from '@dxos/effect';
import { Input, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { getColumnValue, getProperty, type FieldType } from './types';

export type FormProps<T = {}> = ThemedClassName<{
  data?: T;
  schema?: effect.S.Schema<T>;
  fields: readonly FieldType[];
  readonly?: boolean;
}>;

export const Form = <T = {},>({ classNames, data, schema, fields, readonly }: FormProps<T>) => {
  return (
    <div role='none' className={mx('flex flex-col w-full gap-2', classNames)}>
      {fields.map((field) => {
        const prop = schema && getProperty(schema, field);
        const label = field.label ?? (prop && pipe(effect.AST.getTitleAnnotation(prop), Option.getOrUndefined));
        const description = (prop && pipe(effect.AST.getDescriptionAnnotation(prop), Option.getOrUndefined)) ?? label;

        // TODO(burdon): Render Input control by type.
        const value = data ? getColumnValue(data, field) : '';
        return (
          <Input.Root key={field.path}>
            <Input.Label>{label}</Input.Label>
            <Input.TextInput
              placeholder={description}
              disabled={readonly}
              value={String(value)}
              onChange={(event) => {}}
            />
          </Input.Root>
        );
      })}
    </div>
  );
};
