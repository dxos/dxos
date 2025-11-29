//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as StringEffect from 'effect/String';
import React, { useMemo } from 'react';

import { Format } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { createJsonPath, findNode, getDiscriminatedType, isDiscriminatedUnion } from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type ProjectionModel, type SchemaProperty } from '@dxos/schema';

import { translationKey } from '../../translations';
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
  TextAreaField,
  TextField,
} from './fields';
import {
  type FormFieldComponent,
  type FormFieldComponentProps,
  type FormFieldMap,
  type FormFieldProvider,
} from './FormFieldComponent';
import { FormFieldSet } from './FormFieldSet';
import { useFormFieldState } from './FormRoot';

export type FormFieldProps<T extends AnyProperties> = {
  /**
   * Property to render.
   */
  property: SchemaProperty<T>;

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
   * Prefer fieldProvider for plugin specific input surfaces.
   */
  // TODO(burdon): Remove (convert to fieldProvider).
  fieldMap?: FormFieldMap;

  /**
   * Function to lookup custom renderers for specific properties.
   */
  fieldProvider?: FormFieldProvider;
} & Pick<
  RefFieldProps,
  | 'inline'
  | 'readonly'
  | 'createSchema'
  | 'createOptionLabel'
  | 'createOptionIcon'
  | 'createInitialValuePath'
  | 'onCreate'
  | 'onQueryRefOptions'
>;

export const FormField = <T extends AnyProperties>({
  property,
  path,
  projection,
  fieldMap,
  fieldProvider,
  inline,
  readonly,
  createSchema,
  createOptionLabel,
  createOptionIcon,
  createInitialValuePath,
  onCreate,
  onQueryRefOptions,
}: FormFieldProps<T>) => {
  const { t } = useTranslation(translationKey);
  const { ast, name, type, format, array, options, title, description, examples } = property;

  const label = useMemo(() => title ?? Function.pipe(name, StringEffect.capitalize), [title, name]);
  const placeholder = useMemo(
    () => (examples?.length ? `${t('example placeholder')}: ${examples[0]}` : description),
    [examples, description],
  );

  const fieldState = useFormFieldState(FormField.displayName, path);
  const fieldProps: FormFieldComponentProps = {
    ast,
    type,
    format,
    label,
    placeholder,
    inline,
    readonly,
    ...fieldState,
  };

  //
  // Custom field.
  //

  const jsonPath = createJsonPath(path ?? []);
  const CustomField = fieldMap?.[jsonPath];
  if (CustomField) {
    return <CustomField {...fieldProps} />;
  }

  // TODO(burdon): Expensive to create schema each time; pass AST?
  const component = fieldProvider?.({ schema: Schema.make(ast), prop: name, fieldProps });
  if (component) {
    return component;
  }

  //
  // Array field.
  //

  if (array) {
    return (
      <ArrayField<T>
        fieldProps={fieldState}
        property={property}
        path={path}
        readonly={readonly}
        fieldMap={fieldMap}
        fieldProvider={fieldProvider}
      />
    );
  }

  //
  // Regular field.
  //

  const Field = getFormField(property);
  if (Field) {
    return <Field {...fieldProps} />;
  }

  //
  // Select field.
  //

  if (options) {
    return (
      <SelectField
        {...fieldProps}
        options={options.map((option) => ({
          value: option,
          label: String(option),
        }))}
      />
    );
  }

  //
  // Ref field.
  //

  const refProps = getRefProps(property);
  if (refProps) {
    return (
      <RefField
        {...fieldProps}
        {...refProps}
        createSchema={createSchema}
        createOptionLabel={createOptionLabel}
        createOptionIcon={createOptionIcon}
        createInitialValuePath={createInitialValuePath}
        onCreate={onCreate}
        onQueryRefOptions={onQueryRefOptions}
      />
    );
  }

  //
  // Nested Object field.
  //

  if (type === 'object') {
    const baseNode = findNode(ast, isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? getDiscriminatedType(baseNode, fieldState.getValue() as any)
      : findNode(ast, SchemaAST.isTypeLiteral);

    if (typeLiteral) {
      const schema = Schema.make(typeLiteral);
      return (
        <>
          {!inline && <h3 className={mx('text-lg mlb-inputSpacingBlock first:mbs-0')}>{label}</h3>}
          <FormFieldSet
            schema={schema}
            path={path}
            readonly={readonly}
            projection={projection}
            fieldMap={fieldMap}
            fieldProvider={fieldProvider}
            createOptionLabel={createOptionLabel}
            createOptionIcon={createOptionIcon}
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
const getFormField = (property: SchemaProperty<any>): FormFieldComponent | undefined => {
  const { type, format } = property;

  //
  // Standard formats.
  //

  switch (format) {
    case Format.TypeFormat.GeoPoint:
      return GeoPointField;
    case Format.TypeFormat.Markdown:
      return MarkdownField;
    case Format.TypeFormat.Text:
      return TextAreaField;
  }

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
};
