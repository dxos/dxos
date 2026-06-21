//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';
import React, { Fragment, useMemo } from 'react';

import { Annotation } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { Input } from '@dxos/react-ui';

import { type FormPresentation } from '#types';

import { useFormContext, useFormFieldState } from '../../../hooks';
import { formTheme } from '../Form.theme';
import {
  FormFieldErrorBoundary,
  FormFieldLabel,
  FormField,
  type FormFieldProps,
  presentationFor,
} from '../FormField';
import { LayoutParseError, type LayoutNode, parseLayout } from './parser';

const FORM_LAYOUT_NAME = 'Form.Layout';

export type FormLayoutProps = {
  /**
   * Template string in the FormLayout DSL (`<grid cols=…><field name=…/></grid>`).
   * If omitted, the layout is read from the schema's `FormLayoutAnnotation` —
   * the entry named by `name` (default: `'default'`).
   */
  template?: string;
  /**
   * Picks a named layout out of `FormLayoutAnnotation`'s map when no
   * explicit `template` is supplied. Defaults to `'default'`.
   */
  name?: string;
} & Pick<FormFieldSetSubset, 'schema' | 'path' | 'readonly' | 'layout' | 'projection' | 'fieldMap' | 'fieldProvider'>;

type FormFieldSetSubset = Pick<
  FormFieldProps,
  'path' | 'readonly' | 'layout' | 'projection' | 'fieldMap' | 'fieldProvider'
> & {
  schema: Schema.Schema<AnyProperties>;
};

/**
 * Lays out schema fields according to a `FormLayout` DSL template. The template
 * is either passed via the `template` prop or read from the schema's
 * `FormLayoutAnnotation`. Fields not referenced in the template are hidden —
 * the template controls exactly what renders.
 *
 * A `<field name=…/>` resolves against the schema:
 * - A dotted name (`origin.code`) drills into a nested struct and renders the leaf field.
 * - A name that resolves to a nested struct carrying a `LabelAnnotation` auto-converts
 *   to the struct's computed label, rendered as a single read-only text (rather than
 *   expanding the struct's sub-fields).
 */
export const FormLayout = ({
  schema,
  template,
  name = Annotation.DEFAULT_LAYOUT_NAME,
  path,
  readonly,
  layout,
  projection,
  ...props
}: FormLayoutProps) => {
  const annotated = Option.getOrUndefined(Annotation.FormLayoutAnnotation.get(schema));
  const source = template ?? annotated?.[name];
  if (source === undefined) {
    throw new LayoutParseError(
      annotated
        ? `no layout named "${name}" on schema (available: ${Object.keys(annotated).join(', ') || '∅'})`
        : `no template provided and schema has no FormLayoutAnnotation`,
    );
  }

  const tree = useMemo(() => parseLayout(source), [source]);

  return (
    <RenderNode
      node={tree}
      schema={schema}
      basePath={path ?? []}
      readonly={readonly}
      layout={layout}
      projection={projection}
      {...props}
    />
  );
};

FormLayout.displayName = FORM_LAYOUT_NAME;

type RenderNodeProps = Omit<FormLayoutProps, 'template' | 'path'> & {
  node: LayoutNode;
  basePath: (string | number)[];
};

const RenderNode = ({ node, schema, basePath, ...props }: RenderNodeProps) => {
  if (node.kind === 'grid') {
    return (
      <div className='grid gap-x-form-gap' style={{ gridTemplateColumns: `repeat(${node.cols}, minmax(0, 1fr))` }}>
        {node.children.map((child, index) => (
          <Fragment key={index}>
            <RenderNode node={child} schema={schema} basePath={basePath} {...props} />
          </Fragment>
        ))}
      </div>
    );
  }

  const resolved = resolveLayoutField(schema, node.name);
  if (!resolved) {
    throw new LayoutParseError(`field "${node.name}" not found on schema`);
  }

  const { type, segments, leafName, title, labelType, required } = resolved;
  const path = [...basePath, ...segments];
  const span = node.span ? { gridColumn: `span ${node.span} / span ${node.span}` } : undefined;

  return (
    <div className='min-w-0' style={span}>
      <FormFieldErrorBoundary path={path}>
        {labelType ? (
          <LabelField
            schema={Schema.make(labelType)}
            label={title ?? String.capitalize(leafName)}
            path={path}
            layout={props.layout}
          />
        ) : (
          <FormField type={type} name={leafName} path={path} required={required} {...props} />
        )}
      </FormFieldErrorBoundary>
    </div>
  );
};

export type ResolvedLayoutField = {
  /** Resolved leaf AST node for the field. */
  type: SchemaAST.AST;
  /** Path segments (dotted names split on `.`). */
  segments: string[];
  /** Last path segment; used to derive the field label when there is no `title` annotation. */
  leafName: string;
  /** Resolved `title` annotation for the field, if any. */
  title?: string;
  /**
   * Set when the field resolves to a nested struct carrying a `LabelAnnotation` —
   * the type literal whose computed label should render in place of the struct's
   * sub-fields. Undefined for ordinary (non-auto-labelled) fields.
   */
  labelType?: SchemaAST.AST;
  /** Whether the resolved property is required (non-optional). */
  required: boolean;
};

/**
 * Walks a dotted path of property names through nested struct ASTs, returning the
 * leaf `PropertySignature` (or `undefined` if any segment is missing).
 */
const resolvePropertySignature = (ast: SchemaAST.AST, segments: string[]): SchemaAST.PropertySignature | undefined => {
  let node: SchemaAST.AST = ast;
  for (let index = 0; index < segments.length; index++) {
    const typeLiteral = SchemaEx.findNode(node, SchemaAST.isTypeLiteral);
    if (!typeLiteral) {
      return undefined;
    }
    const prop = SchemaAST.getPropertySignatures(typeLiteral).find(
      (p) => globalThis.String(p.name) === segments[index],
    );
    if (!prop) {
      return undefined;
    }
    if (index === segments.length - 1) {
      return prop;
    }
    node = prop.type;
  }

  return undefined;
};

/**
 * Resolves a (possibly dotted) layout field name against a schema.
 * - `origin.code` drills through nested structs to the leaf field.
 * - A name resolving to a nested struct with a `LabelAnnotation` is flagged via
 *   `labelType` so the layout can auto-convert it to a single read-only label.
 * Returns `undefined` when the name does not resolve to a property.
 */
export const resolveLayoutField = (schema: Schema.Schema<any>, name: string): ResolvedLayoutField | undefined => {
  const segments = name.split('.');
  const prop = resolvePropertySignature(schema.ast, segments);
  if (!prop) {
    return undefined;
  }

  // Normalized leaf type (optional unwrapped, refinements stripped, signature-level
  // annotations merged) — matches how `getProperties` feeds `FormField`.
  const { type: baseType } = SchemaEx.getBaseType(prop);
  const type =
    prop.annotations && Reflect.ownKeys(prop.annotations).length > 0
      ? ({ ...baseType, annotations: { ...baseType.annotations, ...prop.annotations } } as SchemaAST.AST)
      : baseType;

  const title = SchemaEx.getAnnotation<string>(SchemaAST.TitleAnnotationId)(type);

  // Label detection reads the *raw* property type: `SchemaEx.getBaseType`'s `encodedBoundAST`
  // strips annotations from non-keyword inner types (e.g. nested structs), which would
  // drop the `LabelAnnotation` we rely on here.
  const labelType = SchemaEx.findNode(prop.type, SchemaAST.isTypeLiteral);
  const labelled = labelType != null && Option.isSome(Annotation.LabelAnnotation.getFromAst(labelType));

  return {
    type,
    segments,
    leafName: segments[segments.length - 1],
    title,
    labelType: labelled ? labelType : undefined,
    required: !prop.isOptional,
  };
};

type LabelFieldProps = {
  schema: Schema.Schema<any>;
  label: string;
  path: (string | number)[];
  layout?: FormPresentation;
};

/**
 * Renders a nested struct value as its computed label (via `LabelAnnotation`),
 * as a single read-only text. Empty values are omitted, mirroring the static
 * presentation of regular fields.
 */
const LabelField = ({ schema, label, path, layout }: LabelFieldProps) => {
  const { variant = 'default' } = useFormContext(FORM_LAYOUT_NAME);
  const styles = formTheme.styles({ variant });
  const { getValue } = useFormFieldState(FORM_LAYOUT_NAME, path);
  const value = getValue();
  const text = value == null ? undefined : Annotation.getLabelWithSchema(schema, value);
  if (text == null || text.trim().length === 0) {
    return null;
  }

  const presentation = presentationFor(layout);
  return (
    <div className={styles.field()}>
      <Input.Root>
        {presentation.showLabel && <FormFieldLabel readonly label={label} path={SchemaEx.createJsonPath(path)} />}
        <p className='truncate min-w-0' title={text}>
          {text}
        </p>
      </Input.Root>
    </div>
  );
};
