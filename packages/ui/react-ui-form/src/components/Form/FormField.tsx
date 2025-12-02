//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';
import React, { useMemo } from 'react';

import { Format } from '@dxos/echo';
import {
  createJsonPath,
  findNode,
  getAnnotation,
  getDiscriminatedType,
  isArrayType,
  isDiscriminatedUnion,
  isLiteralUnion,
  isNestedType,
} from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';
import { type ProjectionModel } from '@dxos/schema';

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
import { useFormFieldState } from './Form';
import {
  type FormFieldComponent,
  type FormFieldComponentProps,
  type FormFieldMap,
  type FormFieldProvider,
} from './FormFieldComponent';
import { FormFieldSet } from './FormFieldSet';

export type FormFieldProps = {
  /**
   * AST of the property to render.
   */
  ast: SchemaAST.AST;

  /**
   * Name of the property.
   */
  name: string;

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
  fieldMap?: FormFieldMap;

  /**
   * Function to lookup custom renderers for specific properties.
   */
  fieldProvider?: FormFieldProvider;
} & Pick<
  RefFieldProps,
  | 'autoFocus'
  | 'readonly'
  | 'layout'
  | 'createSchema'
  | 'createOptionLabel'
  | 'createOptionIcon'
  | 'createInitialValuePath'
  | 'onCreate'
  | 'onQueryRefOptions'
>;

export const FormField = ({
  ast,
  name,
  path,
  projection,
  fieldMap,
  fieldProvider,
  readonly,
  layout,
  createSchema,
  createOptionLabel,
  createOptionIcon,
  createInitialValuePath,
  onCreate,
  onQueryRefOptions,
}: FormFieldProps) => {
  const { t } = useTranslation(translationKey);
  const title = getAnnotation<string>(SchemaAST.TitleAnnotationId)(ast);
  const description = getAnnotation<string>(SchemaAST.DescriptionAnnotationId)(ast);
  const examples = getAnnotation<string[]>(SchemaAST.ExamplesAnnotationId)(ast);

  const label = useMemo(() => title ?? String.capitalize(name), [title, name]);
  const placeholder = useMemo(
    () => (examples?.length ? `${t('example placeholder')}: ${examples[0]}` : (description ?? label)),
    [examples, description, label],
  );

  const fieldState = useFormFieldState(FormField.displayName, path);
  const fieldProps: FormFieldComponentProps = {
    ast,
    format: Format.FormatAnnotation.getFromAst(ast).pipe((annotation) => Option.getOrUndefined(annotation)),
    readonly,
    label,
    placeholder,
    layout,
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

  if (isArrayType(ast)) {
    return (
      <ArrayField
        fieldProps={fieldState}
        ast={ast}
        name={name}
        path={path}
        label={label}
        readonly={readonly}
        layout={layout}
        fieldMap={fieldMap}
        fieldProvider={fieldProvider}
      />
    );
  }

  //
  // Regular field.
  //

  const Field = getFormField(fieldProps);
  if (Field) {
    return <Field {...fieldProps} />;
  }

  //
  // Select field.
  //

  const options = getOptions(ast);
  if (options) {
    return (
      <SelectField
        {...fieldProps}
        options={options.map((option) => ({
          value: option,
          label: option.toString(),
        }))}
      />
    );
  }

  //
  // Ref field.
  //

  const refProps = getRefProps(ast);
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

  if (isNestedType(ast)) {
    const baseNode = findNode(ast, isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? getDiscriminatedType(baseNode, fieldState.getValue() as any)
      : findNode(ast, SchemaAST.isTypeLiteral);

    if (typeLiteral) {
      const schema = Schema.make(typeLiteral);
      return (
        <FormFieldSet
          schema={schema}
          path={path}
          readonly={readonly}
          layout={layout}
          label={label}
          projection={projection}
          fieldMap={fieldMap}
          fieldProvider={fieldProvider}
          createOptionLabel={createOptionLabel}
          createOptionIcon={createOptionIcon}
          onCreate={onCreate}
          onQueryRefOptions={onQueryRefOptions}
        />
      );
    }
  }

  return null;
};

FormField.displayName = 'Form.FormField';

/**
 * Get property input component.
 */
const getFormField = ({ ast, format }: FormFieldComponentProps): FormFieldComponent | undefined => {
  //
  // Standard formats.
  //

  const formatField = Match.value(format).pipe(
    Match.withReturnType<FormFieldComponent | undefined>(),
    Match.when(Format.TypeFormat.GeoPoint, () => GeoPointField),
    Match.when(Format.TypeFormat.Markdown, () => MarkdownField),
    Match.when(Format.TypeFormat.Text, () => TextAreaField),
    Match.orElse(() => undefined),
  );
  if (formatField) {
    return formatField;
  }

  //
  // Standard types.
  //

  switch (ast._tag) {
    // TODO(wittjosiah): Schema.Any is currently used to represent template inputs.
    case 'AnyKeyword':
    case 'StringKeyword':
      return TextField;
    case 'NumberKeyword':
      return NumberField;
    case 'BooleanKeyword':
      return BooleanField;
  }
};

const getOptions = (ast: SchemaAST.AST): Format.Options[] | undefined => {
  if (isLiteralUnion(ast)) {
    return ast.types.map((type) => type.literal).filter((v): v is string | number => v !== null);
  }

  return Format.OptionsAnnotation.getFromAst(ast).pipe((annotation) => Option.getOrUndefined(annotation));
};
