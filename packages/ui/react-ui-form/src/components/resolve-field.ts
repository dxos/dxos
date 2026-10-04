//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { type ReactNode } from 'react';

import { Annotation, Format } from '@dxos/echo';
import { SchemaAST, SchemaEx } from '@dxos/effect';

import { type FieldContext, type FormFieldRenderer, type FormFieldRendererProps } from '#types';

import {
  type Autofill,
  AutofillAnnotation,
  HueAnnotation,
  type OptionsLookup,
  OptionsLookupAnnotation,
} from '../annotations.ts';
import { getRefProps } from '../util/index.ts';

/** The built-in control a scalar property gets. */
export type ScalarKind = 'text' | 'number' | 'boolean' | 'date' | 'geo-point' | 'markdown' | 'password' | 'text-area';

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

  const scalar = getScalarKind({ type, format: fieldProps.format });
  if (scalar) {
    return { kind: 'scalar', scalar };
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
  | { kind: 'scalar'; scalar: ScalarKind }
  | { kind: 'select'; options: Format.Options[] }
  | { kind: 'ref'; refProps: RefProps; inline: boolean }
  | { kind: 'object'; schema: Schema.Codec<any, any> };

/** The kind of control for a scalar: by its format first, then by the type's tag. */
const getScalarKind = ({ type, format }: Pick<FormFieldRendererProps, 'type' | 'format'>): ScalarKind | undefined => {
  // v4 has no `Refinement` node: `Schema.Number.pipe(Schema.check(...))` IS a `Number` node
  // carrying checks, so the base-type cases below already match it.

  //
  // Standard formats.
  //

  const formatField = Match.value(format).pipe(
    Match.withReturnType<ScalarKind | undefined>(),
    Match.when(Format.TypeFormat.Date, () => 'date'),
    Match.when(Format.TypeFormat.DateTime, () => 'date'),
    Match.when(Format.TypeFormat.GeoPoint, () => 'geo-point'),
    Match.when(Format.TypeFormat.Markdown, () => 'markdown'),
    Match.when(Format.TypeFormat.Password, () => 'password'),
    Match.when(Format.TypeFormat.Text, () => 'text-area'),
    Match.when(Format.TypeFormat.Time, () => 'date'),
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
      return 'text';
    case 'Number':
      return 'number';
    case 'Boolean':
      return 'boolean';
  }

  return undefined;
};

const getSelectOptions = (ast: SchemaAST.AST): Format.Options[] | undefined => {
  if (SchemaEx.isLiteralUnion(ast)) {
    return ast.types.map((type) => type.literal).filter((v): v is string | number => v !== null);
  }

  return Format.OptionsAnnotation.getFromAst(ast).pipe((annotation) => Option.getOrUndefined(annotation));
};
