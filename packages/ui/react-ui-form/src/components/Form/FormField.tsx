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

import { translationKey } from '#translations';

import { getRefProps } from '../../util';
import {
  ArrayField,
  BooleanField,
  DateField,
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
  type: SchemaAST.AST;

  /**
   * Name of the property. Used to derive a default label
   * (`title ?? capitalize(name)`) and as the projection lookup key. Pass
   * `null` to suppress the header label entirely -- the form still renders
   * the field/struct, but `FormFieldSet`'s top-level `<FormFieldLabel>` is
   * skipped. Used by `ArrayField` for object-array items, where every item
   * would otherwise repeat the array's parent name.
   */
  name: string | null;

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

  /**
   * Typename of the ref type that the create props apply to.
   * When set, createOptionLabel/createOptionIcon/createInitialValuePath/createFieldMap/onCreate
   * are only passed to ref fields whose typename matches.
   */
  createTypename?: string;
} & Pick<FormFieldComponentProps, 'autoFocus' | 'readonly' | 'layout'> &
  Pick<
    RefFieldProps,
    | 'createOptionLabel'
    | 'createOptionIcon'
    | 'createInitialValuePath'
    | 'createFieldMap'
    | 'db'
    | 'useType'
    | 'getOptions'
    | 'onCreate'
  >;

export const FormField = (props: FormFieldProps) => {
  const {
    type,
    name,
    path,
    projection,
    fieldMap,
    fieldProvider,
    readonly,
    layout,

    // RefFieldProps
    createTypename,
    createOptionLabel,
    createOptionIcon,
    createInitialValuePath,
    createFieldMap,
    db,
    useType: schemaHook,
    getOptions,
    onCreate,
  } = props;
  const { t } = useTranslation(translationKey);
  const title = getAnnotation<string>(SchemaAST.TitleAnnotationId)(type);
  const description = getAnnotation<string>(SchemaAST.DescriptionAnnotationId)(type);
  const examples = getAnnotation<string[]>(SchemaAST.ExamplesAnnotationId)(type);

  // `name === null` means "no header" -- collapse to an empty string so
  // downstream consumers keep their `label: string` types, and the falsy
  // value lets `FormFieldSet`'s `label && <FormFieldLabel ...>` guard skip
  // the header.
  const label = useMemo(() => title ?? (name == null ? '' : String.capitalize(name)), [title, name]);
  const placeholder = useMemo(
    () => (examples?.length ? `${t('example.placeholder')}: ${examples[0]}` : (description ?? label)),
    [examples, description, label],
  );

  const fieldState = useFormFieldState(FormField.displayName, path);
  const jsonPath = createJsonPath(path ?? []);
  const fieldProps: FormFieldComponentProps = {
    type,
    format: Format.FormatAnnotation.getFromAst(type).pipe((annotation) => Option.getOrUndefined(annotation)),
    readonly,
    label,
    jsonPath,
    placeholder,
    layout,
    db,
    ...fieldState,
  };

  // Omit empty fields entirely in read-only mode -- an empty value has nothing
  // to display, so a labelled row with a blank input is just noise. This
  // mirrors what `FormFieldWrapper` already does for `layout === 'static'`, but
  // covers every field type (including those that bypass the wrapper:
  // RefField, SelectField, MarkdownField, ...). Container fields
  // (`ArrayField`, nested-struct -> `FormFieldSet`) keep their own
  // empty-value checks, but those branches only apply when the value is
  // actually a non-null array/object, so this check doesn't interfere.
  if (readonly && fieldState.getValue() == null) {
    return null;
  }

  //
  // Custom field.
  //

  const CustomField = fieldMap?.[jsonPath];
  if (CustomField) {
    return <CustomField {...fieldProps} />;
  }

  // TODO(burdon): Expensive to create schema each time; pass AST?
  const component = fieldProvider?.({ schema: Schema.make(type), prop: name ?? '', fieldProps });
  if (component) {
    return component;
  }

  //
  // Array field.
  //

  if (isArrayType(type)) {
    return <ArrayField fieldProps={fieldState} label={label} {...props} />;
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

  const options = getSelectOptions(type);
  if (options) {
    // Resolve labels from projection metadata when available.
    const fieldProjections = projection?.getFieldProjections();
    const fieldProjection = fieldProjections?.find((fp) => fp.field.path === name);
    const selectOptions = fieldProjection?.props.options;

    return (
      <SelectField
        {...fieldProps}
        options={options.map((option) => {
          const selectOption = selectOptions?.find((so) => so.id === globalThis.String(option));
          return {
            value: option,
            label: selectOption?.title ?? option.toString(),
          };
        })}
      />
    );
  }

  //
  // Ref field.
  //

  const refProps = getRefProps(type);
  if (refProps) {
    const isCreateTarget = !createTypename || refProps.typename === createTypename;
    return (
      <RefField
        {...fieldProps}
        {...refProps}
        createOptionLabel={isCreateTarget ? createOptionLabel : undefined}
        createOptionIcon={isCreateTarget ? createOptionIcon : undefined}
        createInitialValuePath={isCreateTarget ? createInitialValuePath : undefined}
        createFieldMap={isCreateTarget ? createFieldMap : undefined}
        db={db}
        useType={schemaHook}
        getOptions={getOptions}
        onCreate={onCreate}
      />
    );
  }

  //
  // Nested Object field.
  //

  if (isNestedType(type)) {
    const baseNode = findNode(type, isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? getDiscriminatedType(baseNode, fieldState.getValue() as any)
      : findNode(type, SchemaAST.isTypeLiteral);

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
          createInitialValuePath={createInitialValuePath}
          db={db}
          useType={schemaHook}
          getOptions={getOptions}
          onCreate={onCreate}
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
const getFormField = ({ type, format }: FormFieldComponentProps): FormFieldComponent | undefined => {
  //
  // Standard formats.
  //

  const formatField = Match.value(format).pipe(
    Match.withReturnType<FormFieldComponent | undefined>(),
    Match.when(Format.TypeFormat.Date, () => DateField),
    Match.when(Format.TypeFormat.DateTime, () => DateField),
    Match.when(Format.TypeFormat.GeoPoint, () => GeoPointField),
    Match.when(Format.TypeFormat.Markdown, () => MarkdownField),
    Match.when(Format.TypeFormat.Text, () => TextAreaField),
    Match.when(Format.TypeFormat.Time, () => DateField),
    Match.orElse(() => undefined),
  );
  if (formatField) {
    return formatField;
  }

  //
  // Standard types.
  //

  switch (type._tag) {
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

const getSelectOptions = (ast: SchemaAST.AST): Format.Options[] | undefined => {
  if (isLiteralUnion(ast)) {
    return ast.types.map((type) => type.literal).filter((v): v is string | number => v !== null);
  }

  return Format.OptionsAnnotation.getFromAst(ast).pipe((annotation) => Option.getOrUndefined(annotation));
};
