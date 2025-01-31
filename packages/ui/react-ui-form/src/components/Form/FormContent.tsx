//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import { capitalize } from 'effect/String';
import React, { useMemo } from 'react';

import { AST, S } from '@dxos/echo-schema';
import { findNode, getDiscriminatedType, isDiscriminatedUnion } from '@dxos/effect';
import { log } from '@dxos/log';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type SchemaProperty } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { ArrayField } from './ArrayField';
import { type ComponentLookup } from './Form';
import { useScopedForm } from './FormContext';
import { type InputComponent } from './Input';
import { getInputComponent } from './factory';
import { SelectInput } from './Defaults';

export type FormContentProps = {
  schema: S.Schema.All;
  path?: string[];
  filter?: (props: SchemaProperty<any>[]) => SchemaProperty<any>[];
  sort?: string[];
  readonly?: boolean;
  lookupComponent?: ComponentLookup;
  Custom?: Partial<Record<string, InputComponent>>;
};

export const FormContent = ({ schema, path, filter, sort, readonly, lookupComponent, Custom }: FormContentProps) => {
  const { values, getValue, getInputProps } = useScopedForm(path);

  // Filter and sort props using schema metadata
  const properties = useMemo(() => {
    const props = getSchemaProperties(schema.ast, values);
    const filtered = filter ? filter(props) : props;

    return sort ? filtered.sort((a, b) => sort.indexOf(a.name) - sort.indexOf(b.name)) : filtered;
  }, [schema, values, filter, sort]);

  console.log('Rendering properties', { properties });

  return (
    <div role='form' className={mx('flex flex-col w-full gap-2 py-2')}>
      {properties
        .map((property) => {
          const { ast, name, type, format, title, description, options, examples, array } = property;
          const currentPath = [...(path ?? ''), name];
          // TODO(ZaymonFC: Use JsonPath builder.
          const scopedPath = currentPath.join('.');
          const label = title ?? pipe(name, capitalize);
          const placeholder = examples?.length ? `Example: "${examples[0]}"` : description;
          const inputProps = getInputProps(name);

          // Custom component lookup
          const FoundComponent = lookupComponent?.({
            prop: name,
            schema: S.make(schema.ast),
            inputProps: {
              type,
              format,
              label,
              disabled: readonly,
              placeholder,
              ...inputProps,
            },
          });

          if (FoundComponent) {
            return <div key={scopedPath}>{FoundComponent}</div>;
          }

          // Default input components
          const InputComponent = Custom?.[scopedPath] || getInputComponent(type, format);
          if (InputComponent) {
            return (
              <div key={name}>
                <InputComponent
                  type={type}
                  format={format}
                  label={label}
                  placeholder={placeholder}
                  disabled={readonly}
                  {...inputProps}
                />
              </div>
            );
          }

          if (options) {
            return (
              <div key={name} role='none'>
                <SelectInput
                  type={type}
                  format={format}
                  disabled={readonly}
                  label={label}
                  options={options.map((option) => ({ value: option, label: String(option) }))}
                  placeholder={placeholder}
                  {...inputProps}
                />
              </div>
            );
          }

          // Handle array fields
          if (array) {
            return (
              <ArrayField
                ast={ast}
                key={name}
                name={name}
                values={values}
                type={type}
                array={true}
                label={label}
                inputProps={inputProps}
                readonly={readonly}
                Custom={Custom}
              />
            );
          }

          console.log('YO', { name, type, values });

          // Handle nested objects
          if (type === 'object') {
            const baseNode = findNode(schema.ast, isDiscriminatedUnion);
            const typeLiteral = baseNode
              ? getDiscriminatedType(baseNode, values[name] as any)
              : findNode(schema.ast, AST.isTypeLiteral);

            if (typeLiteral) {
              return (
                <div key={name}>
                  <div>{label}</div>
                  <FormContent
                    schema={S.make(typeLiteral)}
                    path={[...(path ?? ''), name]}
                    readonly={readonly}
                    Custom={Custom}
                  />
                </div>
              );
            }
          }

          return null;
        })
        .filter(isNotFalsy)}
    </div>
  );
};
