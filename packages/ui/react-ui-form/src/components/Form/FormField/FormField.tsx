//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';
import React, { useMemo } from 'react';

import { Annotation, Format } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { IconButton, IconButtonProps, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';
import { type FieldContext, type FormFieldRenderer, type FormFieldRendererProps } from '#types';

import { useFormFieldState } from '../../../hooks';
import { getRefProps } from '../../../util';
import { FormFieldSet } from '../FormFieldSet';
import {
  ArrayField,
  BooleanField,
  DateField,
  GeoPointField,
  InlineRefField,
  MarkdownField,
  NumberField,
  RefField,
  SelectField,
  TextAreaField,
  TextField,
} from './fields';

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
   * Explicit label, overriding the `title ?? capitalize(name)` derivation. Used by `ArrayField` to
   * give scalar/ref items the array's resolved title (e.g. `Tags`) rather than re-capitalizing the
   * raw array property name (e.g. `_tags`), since the element type carries no title of its own.
   */
  label?: string;

  /**
   * Path to the current object from the root. Used with nested forms.
   */
  path?: (string | number)[];
  autoFocus?: boolean;
  /** Whether the field is required (non-optional in the schema). Drives the label asterisk. */
  required?: boolean;
  /**
   * Force a `Ref` field to render its target inline (a nested form) instead of the picker.
   * Set by `ArrayField` for owned-ref arrays (`FormCreateAnnotation`); equivalent to
   * `FormInlineAnnotation` but driven by the parent array rather than the element's own AST.
   */
  refInline?: boolean;
} & FieldContext;

export const FormField = (props: FormFieldProps) => {
  const {
    type,
    name,
    label: labelProp,
    path,
    required,
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
    useType,
    getOptions,
    onCreate,
    resolveCreateEntry,
    refInline,
  } = props;
  const { t } = useTranslation(translationKey);
  const title = SchemaEx.getAnnotation<string>(SchemaAST.TitleAnnotationId)(type);
  const description = SchemaEx.getAnnotation<string>(SchemaAST.DescriptionAnnotationId)(type);
  const examples = SchemaEx.getAnnotation<string[]>(SchemaAST.ExamplesAnnotationId)(type);

  const label = useMemo(
    () => labelProp ?? title ?? (name == null ? '' : String.capitalize(name)),
    [labelProp, title, name],
  );
  const placeholder = useMemo(
    () => (examples?.length ? `${t('example.placeholder')}: ${examples[0]}` : (description ?? label)),
    [examples, description, label, t],
  );

  // Build the schema for `fieldProvider` only when one is registered, memoized by `type` (the AST) so
  // we don't reconstruct it on every render.
  const providerSchema = useMemo(() => (fieldProvider ? Schema.make(type) : undefined), [fieldProvider, type]);

  const fieldState = useFormFieldState(FormField.displayName, path);
  const jsonPath = SchemaEx.createJsonPath(path ?? []);
  const fieldProps: FormFieldRendererProps = {
    type,
    format: Format.FormatAnnotation.getFromAst(type).pipe((annotation) => Option.getOrUndefined(annotation)),
    readonly,
    label,
    description,
    jsonPath,
    placeholder,
    presentation: layout,
    required,
    db,
    ...fieldState,
  };

  // Omit empty fields entirely in read-only mode -- an empty value has nothing
  // to display, so a labelled row with a blank input is just noise. This
  // mirrors what `FormRow` already does for `presentation === 'static'`, but
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

  if (fieldProvider && providerSchema) {
    const component = fieldProvider({ schema: providerSchema, prop: name ?? '', fieldProps });
    if (component) {
      return component;
    }
  }

  //
  // Array field.
  //

  if (SchemaEx.isArrayType(type)) {
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
    // Inline a single referenced object's own fields (nested form) instead of a picker. `refInline` lets a
    // parent (e.g. an owned-ref `ArrayField`) force this for elements whose own AST carries no annotation.
    const inline =
      refInline || Annotation.FormInlineAnnotation.getFromAst(refProps.ast).pipe(Option.getOrElse(() => false));
    if (inline && !refProps.isArray) {
      return (
        <InlineRefField
          {...fieldProps}
          {...refProps}
          db={db}
          useType={useType}
          onCreate={onCreate}
          resolveCreateEntry={resolveCreateEntry}
        />
      );
    }

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
        useType={useType}
        getOptions={getOptions}
        onCreate={onCreate}
        resolveCreateEntry={resolveCreateEntry}
      />
    );
  }

  //
  // Nested Object field.
  //

  if (SchemaEx.isNestedType(type)) {
    const baseNode = SchemaEx.findNode(type, SchemaEx.isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? SchemaEx.getDiscriminatedType(baseNode, fieldState.getValue() as any)
      : SchemaEx.findNode(type, SchemaAST.isTypeLiteral);

    if (typeLiteral) {
      const schema = Schema.make(typeLiteral);
      return (
        <FormFieldSet
          schema={schema}
          path={path}
          readonly={readonly}
          layout={layout}
          label={label}
          collapsible
          projection={projection}
          fieldMap={fieldMap}
          fieldProvider={fieldProvider}
          createOptionLabel={createOptionLabel}
          createOptionIcon={createOptionIcon}
          createInitialValuePath={createInitialValuePath}
          db={db}
          useType={useType}
          getOptions={getOptions}
          onCreate={onCreate}
          resolveCreateEntry={resolveCreateEntry}
        />
      );
    }
  }

  return null;
};

FormField.displayName = 'Form.FormField';

//
// Layout components
//

export const CompactIconButton = (props: IconButtonProps) => {
  return <IconButton variant='ghost' iconOnly {...props} />;
};

/**
 * Get property input component.
 */
const getFormField = ({
  type,
  format,
}: Pick<FormFieldRendererProps, 'type' | 'format'>): FormFieldRenderer | undefined => {
  // Unwrap refinements (e.g. Schema.Number.pipe(Schema.between(...))) to their base type.
  if (SchemaAST.isRefinement(type)) {
    return getFormField({ type: type.from, format });
  }

  //
  // Standard formats.
  //

  const formatField = Match.value(format).pipe(
    Match.withReturnType<FormFieldRenderer | undefined>(),
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
  if (SchemaEx.isLiteralUnion(ast)) {
    return ast.types.map((type) => type.literal).filter((v): v is string | number => v !== null);
  }

  return Format.OptionsAnnotation.getFromAst(ast).pipe((annotation) => Option.getOrUndefined(annotation));
};
