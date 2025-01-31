//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import { capitalize } from 'effect/String';
import React, { useMemo } from 'react';

import { AST, S } from '@dxos/echo-schema';
import { findNode, getDiscriminatedType, isDiscriminatedUnion } from '@dxos/effect';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type SchemaProperty } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { ArrayField } from './ArrayField';
import { SelectInput } from './Defaults';
import { type ComponentLookup } from './Form';
import { useScopedForm } from './FormContext';
import { type InputComponent } from './Input';
import { getInputComponent } from './factory';

export type FormContentProps = {
  schema: S.Schema.All;
  path?: string[];
  filter?: (props: SchemaProperty<any>[]) => SchemaProperty<any>[];
  sort?: string[];
  readonly?: boolean;
  lookupComponent?: ComponentLookup;
  Custom?: Partial<Record<string, InputComponent>>;
};

type FormFieldProps = {
  property: SchemaProperty<any>;
  path?: string[];
  readonly?: boolean;
  /** Used to indicate if input should be presented inline (e.g. for array items). */
  inline?: boolean;
  lookupComponent?: ComponentLookup;
  Custom?: Partial<Record<string, InputComponent>>;
};

export const FormField = ({ property, path = [], readonly, inline, lookupComponent, Custom }: FormFieldProps) => {
  const { getInputProps } = useScopedForm(path);
  const { ast, name, type, format, title, description, options, examples, array } = property;

  // TODO(ZaymonFC): Build JSONPath.
  const currentPath = [...path, name];

  const scopedPath = currentPath.join('.');
  const label = title ?? pipe(name, capitalize);
  const placeholder = examples?.length ? `Example: "${examples[0]}"` : description;
  const inputProps = getInputProps(name);

  if (array) {
    return (
      <ArrayField
        property={property}
        path={currentPath}
        values={inputProps.getValue() as any}
        inputProps={inputProps}
        readonly={readonly}
        Custom={Custom}
      />
    );
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

  const InputComponent = Custom?.[scopedPath] || getInputComponent(type, format);
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
          <FormContent schema={S.make(typeLiteral)} path={currentPath} readonly={readonly} Custom={Custom} />
        </div>
      );
    }
  }

  return null;
};

export const FormContent = ({ schema, path, filter, sort, readonly, lookupComponent, Custom }: FormContentProps) => {
  const { values } = useScopedForm(path);

  const properties = useMemo(() => {
    const props = getSchemaProperties(schema.ast, values);
    const filtered = filter ? filter(props) : props;

    return sort ? filtered.sort((a, b) => sort.indexOf(a.name) - sort.indexOf(b.name)) : filtered;
  }, [schema, values, filter, sort]);

  return (
    <div role='form' className={mx('flex flex-col w-full gap-2 py-2')}>
      {properties
        .map((property) => (
          <FormField
            key={property.name}
            property={property}
            // TODO(ZaymonFC): Build JSONPath.
            path={path}
            readonly={readonly}
            lookupComponent={lookupComponent}
            Custom={Custom}
          />
        ))
        .filter(isNotFalsy)}
    </div>
  );
};
