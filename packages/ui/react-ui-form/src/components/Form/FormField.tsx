//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as StringEffect from 'effect/String';
import React, { useMemo } from 'react';

import { Format } from '@dxos/echo';
import { createJsonPath, findNode, getDiscriminatedType, isDiscriminatedUnion } from '@dxos/effect';
import { mx } from '@dxos/react-ui-theme';
import { type ProjectionModel, type SchemaProperty } from '@dxos/schema';

import { getRefProps } from '../../util';

import {
  ArrayField,
  BooleanField,
  GeoPointField,
  MarkdownField,
  NumberField,
  RefField,
  type RefFieldProps,
  SelectField,
  TextField,
} from './fields';
import { type FormFieldComponent, type FormFieldLookup, type FormFieldMap } from './FormFieldComponent';
import { FormFieldSet } from './FormFieldSet';
import { useFormFieldState } from './FormRoot';

export type FormFieldProps = {
  /**
   * Property to render.
   */
  property: SchemaProperty<any>;
  /**
   * Path to the current object from the root. Used with nested forms.
   */
  path?: (string | number)[];
  /**
   * Optional projection for projection-based field management.
   */
  projection?: ProjectionModel;
  /**
   * Map of custom renderers for specific properties.
   * Prefer lookupComponent for plugin specific input surfaces.
   */
  fieldMap?: FormFieldMap;
  // TODO(burdon): Combine with fieldMap (i.e., Map | Funciton).
  lookupComponent?: FormFieldLookup;
  /**
   * Indicates if input should be presented inline (e.g., for array items).
   */
  inline?: boolean;
} & Pick<
  RefFieldProps,
  | 'readonly'
  | 'createSchema'
  | 'createOptionLabel'
  | 'createOptionIcon'
  | 'createInitialValuePath'
  | 'onCreate'
  | 'onQueryRefOptions'
>;

export const FormField = ({
  property,
  path,
  readonly,
  inline,
  projection,
  fieldMap,
  lookupComponent,
  createOptionLabel,
  createOptionIcon,
  createSchema,
  createInitialValuePath,
  onCreate,
  onQueryRefOptions,
}: FormFieldProps) => {
  const { ast, name, type, format, title, description, options, examples, array } = property;
  const inputProps = useFormFieldState(FormField.displayName, path);

  const label = useMemo(() => title ?? Function.pipe(name, StringEffect.capitalize), [title, name]);
  const placeholder = useMemo(
    () => (examples?.length ? `Example: "${examples[0]}"` : description),
    [examples, description],
  );

  //
  // Registry and Custom.
  //

  const Component = lookupComponent?.({
    prop: name,
    schema: Schema.make(ast),
    inputProps: {
      type,
      format,
      label,
      readonly,
      placeholder,
      ...inputProps,
    },
  });
  if (Component) {
    return Component;
  }

  const jsonPath = createJsonPath(path ?? []);
  const CustomComponent = fieldMap?.[jsonPath];
  if (CustomComponent) {
    return (
      <CustomComponent
        type={type}
        format={format}
        label={label}
        inputOnly={inline}
        placeholder={placeholder}
        readonly={readonly}
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
        type={type}
        format={format}
        readonly={readonly}
        inputOnly={inline}
        label={label}
        placeholder={placeholder}
        ast={refProps.ast}
        array={refProps.isArray}
        onQueryRefOptions={onQueryRefOptions}
        createOptionLabel={createOptionLabel}
        createOptionIcon={createOptionIcon}
        onCreate={onCreate}
        createSchema={createSchema}
        createInitialValuePath={createInitialValuePath}
        {...inputProps}
      />
    );
  }

  //
  // Select.
  //

  if (options) {
    return (
      <SelectField
        type={type}
        format={format}
        readonly={readonly}
        inputOnly={inline}
        label={label}
        placeholder={placeholder}
        options={options.map((option) => ({ value: option, label: String(option) }))}
        {...inputProps}
      />
    );
  }

  //
  // Standard Inputs.
  //

  const Field = getFormFieldComponent({ property });
  if (Field) {
    return (
      <Field
        type={type}
        format={format}
        readonly={readonly}
        inputOnly={inline}
        label={label}
        placeholder={placeholder}
        {...inputProps}
      />
    );
  }

  //
  // Array.
  //

  if (array) {
    return (
      <ArrayField property={property} path={path} inputProps={inputProps} readonly={readonly} fieldMap={fieldMap} />
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
          <FormFieldSet
            schema={Schema.make(typeLiteral)}
            path={path}
            readonly={readonly}
            projection={projection}
            createOptionLabel={createOptionLabel}
            createOptionIcon={createOptionIcon}
            fieldMap={fieldMap}
            lookupComponent={lookupComponent}
            onCreate={onCreate}
            onQueryRefOptions={onQueryRefOptions}
          />
        </>
      );
    }
  }

  return null;
};

FormField.displayName = 'Form.FormField';

/**
 * Get property input component.
 */
const getFormFieldComponent = ({ property }: Pick<FormFieldProps, 'property'>): FormFieldComponent | undefined => {
  const { type, format } = property;

  //
  // Standard types.
  //

  switch (type) {
    case 'string':
      return TextField;
    case 'number':
      return NumberField;
    case 'boolean':
      return BooleanField;
  }

  //
  // Standard formats.
  //

  switch (format) {
    case Format.TypeFormat.GeoPoint:
      return GeoPointField;
    case Format.TypeFormat.Markdown:
      return MarkdownField;
  }
};
