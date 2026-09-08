//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as String from 'effect/String';
import React, { type ReactNode, useMemo } from 'react';

import { Annotation, Format } from '@dxos/echo';
import { SchemaAST, SchemaEx } from '@dxos/effect';
import { IconButton, IconButtonProps, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';
import { type FieldContext, type FormFieldRenderer, type FormFieldRendererProps } from '#types';

import {
  type Autofill,
  AutofillAnnotation,
  HueAnnotation,
  type OptionsLookup,
  OptionsLookupAnnotation,
} from '../../../annotations';
import { useFormFieldState } from '../../../hooks';
import { getRefProps } from '../../../util';
import { FormFields } from '../FormFields';
import { FormFieldSet } from '../FormFieldSet';
import {
  ArrayField,
  AsyncSelectField,
  AutofillField,
  BooleanField,
  ComboboxField,
  DateField,
  GeoPointField,
  HueField,
  InlineRefField,
  MarkdownField,
  NumberField,
  PasswordField,
  RefField,
  SelectField,
  TextAreaField,
  TextField,
} from './fields';
import { FormFieldRow } from './FormField';
import { type FormFieldBinding } from './FormFieldContext';

export type FormFieldDispatchProps = {
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

/**
 * Decides which renderer a schema property gets, in priority order: a custom renderer from the form,
 * an annotation that names one (options lookup, autofill, hue), then the shape of the type (array,
 * scalar by format or tag, literal options, reference, nested object). Pure, so the decision can be
 * tested without rendering; {@link FormFieldDispatch} turns the result into an element.
 */
export const resolveFieldRenderer = ({
  type,
  name,
  jsonPath,
  value,
  fieldMap,
  fieldProvider,
  fieldProps,
  refInline,
}: ResolveFieldRendererOptions): FieldRendererResolution | undefined => {
  const custom = fieldMap?.[jsonPath];
  if (custom) {
    return { kind: 'custom', component: custom };
  }

  if (fieldProvider) {
    const element = fieldProvider({ schema: Schema.make<Schema.Codec<any, any>>(type), prop: name ?? '', fieldProps });
    if (element) {
      return { kind: 'provided', element };
    }
  }

  const lookup = Option.getOrUndefined(OptionsLookupAnnotation.getFromAst(type));
  if (lookup) {
    return { kind: 'lookup', lookup, combobox: !!lookup.combobox };
  }

  const autofill = Option.getOrUndefined(AutofillAnnotation.getFromAst(type));
  if (autofill) {
    return { kind: 'autofill', autofill };
  }

  if (Option.getOrUndefined(HueAnnotation.getFromAst(type))) {
    return { kind: 'hue' };
  }

  if (SchemaEx.isArrayType(type)) {
    return { kind: 'array' };
  }

  const scalar = getScalarRenderer({ type, format: fieldProps.format });
  if (scalar) {
    return { kind: 'scalar', component: scalar };
  }

  const options = getSelectOptions(type);
  if (options) {
    return { kind: 'select', options };
  }

  const refProps = getRefProps(type);
  if (refProps) {
    const inline =
      refInline || Annotation.FormInlineAnnotation.getFromAst(refProps.ast).pipe(Option.getOrElse(() => false));
    return { kind: 'ref', refProps, inline: inline && !refProps.isArray };
  }

  if (SchemaEx.isNestedType(type)) {
    const baseNode = SchemaEx.findNode(type, SchemaEx.isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? SchemaEx.getDiscriminatedType(baseNode, value as any)
      : SchemaEx.findNode(type, SchemaAST.isObjects);
    if (typeLiteral) {
      return { kind: 'object', schema: Schema.make<Schema.Codec<any, any>>(typeLiteral) };
    }
  }

  return undefined;
};

export type ResolveFieldRendererOptions = {
  type: SchemaAST.AST;
  name: string | null;
  jsonPath: string;
  /** The property's current value; a discriminated union picks its member by it. */
  value: unknown;
  fieldProps: FormFieldRendererProps;
  refInline?: boolean;
} & Pick<FieldContext, 'fieldMap' | 'fieldProvider'>;

type RefProps = NonNullable<ReturnType<typeof getRefProps>>;

export type FieldRendererResolution =
  | { kind: 'custom'; component: FormFieldRenderer }
  | { kind: 'provided'; element: ReactNode }
  | { kind: 'lookup'; lookup: OptionsLookup; combobox: boolean }
  | { kind: 'autofill'; autofill: Autofill }
  | { kind: 'hue' }
  | { kind: 'array' }
  | { kind: 'scalar'; component: FormFieldRenderer }
  | { kind: 'select'; options: Format.Options[] }
  | { kind: 'ref'; refProps: RefProps; inline: boolean }
  | { kind: 'object'; schema: Schema.Codec<any, any> };

/**
 * One schema property, rendered by whichever field {@link resolveFieldRenderer} picks for it. The
 * component itself only derives the label and placeholder, hides an empty read-only value, and hands
 * the resolution its props.
 */
export const FormFieldDispatch = (props: FormFieldDispatchProps) => {
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
    hideEmpty = true,
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
  const fieldState = useFormFieldState(FormFieldDispatch.displayName, path);
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
    // The asterisk marks what is still outstanding, so it clears once the field holds a value —
    // otherwise a fully-filled form reads as though every required field were still unanswered.
    required,
    db,
    ...fieldState,
  };

  // Omit empty fields entirely in read-only mode -- an empty value has nothing
  // to display, so a labelled row with a blank input is just noise. Container fields
  // (`ArrayField`, nested-struct -> `Form.Fields`) keep their own empty-value checks.
  if (readonly && hideEmpty && fieldState.getValue() == null) {
    return null;
  }

  const resolution = resolveFieldRenderer({
    type,
    name,
    jsonPath,
    value: fieldState.getValue(),
    fieldMap,
    fieldProvider,
    fieldProps,
    refInline,
  });
  if (!resolution) {
    return null;
  }

  // A renderer the form supplied owns its row (its label, description and `labelEnd` are its own);
  // everything the dispatcher picks is a control, and the row is rendered here, once, around it.
  if (resolution.kind === 'custom') {
    const CustomField = resolution.component;
    return <CustomField {...fieldProps} />;
  }
  if (resolution.kind === 'provided') {
    return resolution.element;
  }

  // A list and a nested object are groups with their own header, not rows.
  if (resolution.kind === 'array') {
    return <ArrayField fieldProps={fieldState} label={label} {...props} />;
  }
  if (resolution.kind === 'object') {
    return (
      <FormFieldSet label={label} collapsible>
        <FormFields
          schema={resolution.schema}
          path={path}
          readonly={readonly}
          layout={layout}
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
      </FormFieldSet>
    );
  }
  if (resolution.kind === 'ref' && resolution.inline) {
    const { refProps } = resolution;
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

  const { status, error } = fieldState.getStatus();
  const binding: FormFieldBinding = {
    path: jsonPath,
    type,
    value: fieldState.getValue(),
    setValue: (next) => fieldState.onValueChange(type, next),
    onBlur: fieldState.onBlur,
    status,
    error,
    required: fieldProps.required,
    readonly,
    presentation: layout,
  };

  const standalone = resolution.kind === 'scalar' && resolution.component.standalone;
  return (
    <FormFieldRow
      label={label}
      description={description}
      format={fieldProps.format}
      binding={binding}
      standalone={standalone}
      renderStatic={resolution.kind === 'select' ? renderSelectStatic(resolution.options, projection, name) : undefined}
    >
      {renderControl(resolution)}
    </FormFieldRow>
  );

  function renderControl(resolution: FieldRendererResolution): ReactNode {
    switch (resolution.kind) {
      case 'lookup':
        return resolution.combobox ? (
          <ComboboxField {...fieldProps} lookup={resolution.lookup} />
        ) : (
          <AsyncSelectField {...fieldProps} lookup={resolution.lookup} />
        );
      case 'autofill':
        return <AutofillField {...fieldProps} autofill={resolution.autofill} />;
      case 'hue':
        return <HueField {...fieldProps} />;
      case 'scalar': {
        const ScalarField = resolution.component;
        return <ScalarField {...fieldProps} />;
      }
      case 'select':
        return <SelectField {...fieldProps} options={selectOptions(resolution.options, projection, name)} />;
      case 'ref': {
        const { refProps } = resolution;
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
      default:
        return null;
    }
  }
};

FormFieldDispatch.displayName = 'Form.FieldDispatch';

//
/** The literal options with the projection's titles, when it has any. */
const selectOptions = (
  options: Format.Options[],
  projection: FormFieldDispatchProps['projection'],
  name: string | null,
) => {
  const fieldProjection = projection?.getFieldProjections().find((candidate) => candidate.field.path === name);
  const titles = fieldProjection?.props.options;
  return options.map((option) => ({
    value: option,
    label: titles?.find((candidate) => candidate.id === globalThis.String(option))?.title ?? option.toString(),
  }));
};

const renderSelectStatic =
  (options: Format.Options[], projection: FormFieldDispatchProps['projection'], name: string | null) =>
  (value: unknown): ReactNode => {
    const option = selectOptions(options, projection, name).find((candidate) => candidate.value === value);
    return <p className='truncate min-w-0'>{option?.label ?? globalThis.String(value ?? '')}</p>;
  };

// Layout components
//

// End-of-row form buttons occupy a consistent 32px block (matching the standard `h-8` label row) with
// the button inset so its hover fill never touches the row's top/bottom/right edges.
export const CompactIconButton = (props: IconButtonProps) => {
  return (
    <span className='grid size-8 shrink-0 place-items-center'>
      <IconButton variant='ghost' iconOnly density='sm' {...props} />
    </span>
  );
};

/** The renderer for a scalar: by its format first, then by the type's tag. */
const getScalarRenderer = ({
  type,
  format,
}: Pick<FormFieldRendererProps, 'type' | 'format'>): FormFieldRenderer | undefined => {
  // v4 has no `Refinement` node: `Schema.Number.pipe(Schema.check(...))` IS a `Number` node
  // carrying checks, so the base-type cases below already match it.

  //
  // Standard formats.
  //

  const formatField = Match.value(format).pipe(
    Match.withReturnType<FormFieldRenderer | undefined>(),
    Match.when(Format.TypeFormat.Date, () => DateField),
    Match.when(Format.TypeFormat.DateTime, () => DateField),
    Match.when(Format.TypeFormat.GeoPoint, () => GeoPointField),
    Match.when(Format.TypeFormat.Markdown, () => MarkdownField),
    Match.when(Format.TypeFormat.Password, () => PasswordField),
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
    case 'Any':
    case 'String':
      return TextField;
    case 'Number':
      return NumberField;
    case 'Boolean':
      return BooleanField;
  }

  return undefined;
};

const getSelectOptions = (ast: SchemaAST.AST): Format.Options[] | undefined => {
  if (SchemaEx.isLiteralUnion(ast)) {
    return ast.types.map((type) => type.literal).filter((v): v is string | number => v !== null);
  }

  return Format.OptionsAnnotation.getFromAst(ast).pipe((annotation) => Option.getOrUndefined(annotation));
};
