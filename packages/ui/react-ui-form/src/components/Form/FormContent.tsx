//
// Copyright 2025 DXOS.org
//

import { Schema, SchemaAST, pipe } from 'effect';
import { capitalize } from 'effect/String';
import React, { forwardRef, useMemo } from 'react';

import { createJsonPath, findNode, getDiscriminatedType, isDiscriminatedUnion } from '@dxos/effect';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type SchemaProperty } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { ArrayField } from './ArrayField';
import { SelectInput } from './Defaults';
import { type ComponentLookup } from './Form';
import { useInputProps, useFormValues } from './FormContext';
import { type InputComponent } from './Input';
import { RefField } from './RefField';
import { getInputComponent } from './factory';
import { type QueryRefOptions } from '../../hooks';
import { getRefProps } from '../../util';

export type FormFieldProps = {
  property: SchemaProperty<any>;
  path?: (string | number)[];
  readonly?: boolean;
  /** Used to indicate if input should be presented inline (e.g. for array items). */
  inline?: boolean;
  onQueryRefOptions?: QueryRefOptions;
  lookupComponent?: ComponentLookup;
  Custom?: Partial<Record<string, InputComponent>>;
};

export const FormField = ({
  property,
  path,
  readonly,
  inline,
  onQueryRefOptions,
  lookupComponent,
  Custom,
}: FormFieldProps) => {
  const { ast, name, type, format, title, description, options, examples, array } = property;
  const inputProps = useInputProps(path);

  const label = useMemo(() => title ?? pipe(name, capitalize), [title, name]);
  const placeholder = useMemo(
    () => (examples?.length ? `Example: "${examples[0]}"` : description),
    [examples, description],
  );

  //
  // Registry and Custom.
  //

  const FoundComponent = lookupComponent?.({
    prop: name,
    schema: Schema.make(ast),
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
    return FoundComponent;
  }

  const jsonPath = createJsonPath(path ?? []);
  const CustomComponent = Custom?.[jsonPath];
  if (CustomComponent) {
    return (
      <CustomComponent
        type={type}
        format={format}
        label={label}
        inputOnly={inline}
        placeholder={placeholder}
        disabled={readonly}
        {...inputProps}
      />
    );
  }

  //
  // Refs.
  //

  const refProps = getRefProps(property);
  if (refProps) {
    return (
      <RefField
        ast={refProps.ast}
        array={refProps.isArray}
        type={type}
        format={format}
        label={label}
        placeholder={placeholder}
        disabled={readonly}
        inputOnly={inline}
        onQueryRefOptions={onQueryRefOptions}
        {...inputProps}
      />
    );
  }

  //
  // Arrays.
  //

  if (array) {
    return <ArrayField property={property} path={path} inputProps={inputProps} readonly={readonly} Custom={Custom} />;
  }

  //
  // Standard Inputs.
  //

  const InputComponent = getInputComponent(type, format);
  if (InputComponent) {
    return (
      <InputComponent
        type={type}
        format={format}
        label={label}
        inputOnly={inline}
        placeholder={placeholder}
        disabled={readonly}
        {...inputProps}
      />
    );
  }

  //
  // Select.
  //

  if (options) {
    return (
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
    );
  }

  //
  // Nested Objects.
  //

  if (type === 'object') {
    const baseNode = findNode(ast, isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? getDiscriminatedType(baseNode, inputProps.getValue() as any)
      : findNode(ast, SchemaAST.isTypeLiteral);

    if (typeLiteral) {
      return (
        <>
          {!inline && <h3 className={mx('text-lg mlb-inputSpacingBlock first:mbs-0')}>{label}</h3>}
          <FormFields
            schema={Schema.make(typeLiteral)}
            path={path}
            readonly={readonly}
            onQueryRefOptions={onQueryRefOptions}
            Custom={Custom}
            lookupComponent={lookupComponent}
          />
        </>
      );
    }
  }

  return null;
};

export type FormFieldsProps = ThemedClassName<{
  testId?: string;
  readonly?: boolean;
  schema: Schema.Schema.All;
  /**
   * Path to the current object from the root. Used with nested forms.
   */
  path?: (string | number)[];
  filter?: (props: SchemaProperty<any>[]) => SchemaProperty<any>[];
  sort?: string[];
  lookupComponent?: ComponentLookup;
  /**
   * Map of custom renderers for specific properties.
   * Prefer lookupComponent for plugin specific input surfaces.
   */
  Custom?: Partial<Record<string, InputComponent>>;
  onQueryRefOptions?: QueryRefOptions;
}>;

export const FormFields = forwardRef<HTMLDivElement, FormFieldsProps>(
  (
    { classNames, testId, schema, path, filter, sort, readonly, lookupComponent, Custom, onQueryRefOptions },
    forwardRef,
  ) => {
    const values = useFormValues(path);
    const properties = useMemo(() => {
      const props = getSchemaProperties(schema.ast, values);
      const filtered = filter ? filter(props) : props;
      return sort ? filtered.sort((a, b) => sort.indexOf(a.name) - sort.indexOf(b.name)) : filtered;
    }, [schema, values, filter, sort]);

    return (
      <div role='form' className={mx('is-full', classNames)} ref={forwardRef}>
        {properties
          .map((property) => {
            return (
              <FormField
                key={property.name}
                property={property}
                path={[...(path ?? []), property.name]}
                readonly={readonly}
                onQueryRefOptions={onQueryRefOptions}
                lookupComponent={lookupComponent}
                Custom={Custom}
              />
            );
          })
          .filter(isNotFalsy)}
      </div>
    );
  },
);
