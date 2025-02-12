//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import { capitalize } from 'effect/String';
import React, { useMemo } from 'react';

import { AST, S } from '@dxos/echo-schema';
import { createJsonPath, findNode, getDiscriminatedType, isDiscriminatedUnion } from '@dxos/effect';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type SchemaProperty } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { ArrayField } from './ArrayField';
import { SelectInput } from './Defaults';
import { type ComponentLookup } from './Form';
import { useInputProps, useFormValues } from './FormContext';
import { type InputComponent } from './Input';
import { getInputComponent } from './factory';

export type FormContentProps = {
  schema: S.Schema.All;
  path?: (string | number)[];
  filter?: (props: SchemaProperty<any>[]) => SchemaProperty<any>[];
  sort?: string[];
  readonly?: boolean;
  lookupComponent?: ComponentLookup;
  Custom?: Partial<Record<string, InputComponent>>;
};

export type FormFieldProps = {
  property: SchemaProperty<any>;
  path?: (string | number)[];
  readonly?: boolean;
  /** Used to indicate if input should be presented inline (e.g. for array items). */
  inline?: boolean;
  lookupComponent?: ComponentLookup;
  Custom?: Partial<Record<string, InputComponent>>;
};

export const FormField = ({ property, path, readonly, inline, lookupComponent, Custom }: FormFieldProps) => {
  const inputProps = useInputProps(path);
  const { ast, name, type, format, title, description, options, examples, array } = property;

  const label = useMemo(() => title ?? pipe(name, capitalize), [title, name]);
  const placeholder = useMemo(
    () => (examples?.length ? `Example: "${examples[0]}"` : description),
    [examples, description],
  );

  if (array) {
    return <ArrayField property={property} path={path} inputProps={inputProps} readonly={readonly} Custom={Custom} />;
  }

  const FoundComponent = lookupComponent?.({
    prop: name,
    schema: S.make(ast),
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
    return <div>{FoundComponent}</div>;
  }

  const jsonPath = createJsonPath(path ?? []);
  const InputComponent = Custom?.[jsonPath] || getInputComponent(type, format);
  if (InputComponent) {
    return (
      <div>
        <InputComponent
          type={type}
          format={format}
          label={label}
          inputOnly={inline}
          placeholder={placeholder}
          disabled={readonly}
          {...inputProps}
        />
      </div>
    );
  }

  if (options) {
    return (
      <div role='none'>
        <SelectInput
          type={type}
          format={format}
          disabled={readonly}
          inputOnly={inline}
          label={label}
          options={options.map((option) => ({ value: option, label: String(option) }))}
          placeholder={placeholder}
          {...inputProps}
        />
      </div>
    );
  }

  if (type === 'object') {
    const baseNode = findNode(ast, isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? getDiscriminatedType(baseNode, inputProps.getValue() as any)
      : findNode(ast, AST.isTypeLiteral);

    if (typeLiteral) {
      return (
        <div>
          {!inline && <div>{label}</div>}
          <FormFields schema={S.make(typeLiteral)} path={path} readonly={readonly} Custom={Custom} />
        </div>
      );
    }
  }

  return null;
};

export const FormFields = ({ schema, path, filter, sort, readonly, lookupComponent, Custom }: FormContentProps) => {
  const values = useFormValues(path);

  const properties = useMemo(() => {
    const props = getSchemaProperties(schema.ast, values);
    const filtered = filter ? filter(props) : props;

    return sort ? filtered.sort((a, b) => sort.indexOf(a.name) - sort.indexOf(b.name)) : filtered;
  }, [schema, values, filter, sort]);

  return (
    <div role='form' className={mx('flex flex-col w-full gap-2 py-2')}>
      {properties
        .map((property) => {
          return (
            <FormField
              key={property.name}
              property={property}
              path={[...(path ?? []), property.name]}
              readonly={readonly}
              lookupComponent={lookupComponent}
              Custom={Custom}
            />
          );
        })
        .filter(isNotFalsy)}
    </div>
  );
};
