//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as String from 'effect/String';
import React, { Fragment, useMemo } from 'react';

import { Annotation } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { Input } from '@dxos/react-ui';

import { type FormPresentation } from '#types';

import { useFormContext, useFormFieldState } from '../../../hooks/index.ts';
import { formTheme } from '../Form.theme.ts';
import {
  FormField,
  FormFieldErrorBoundary,
  FormFieldLabel,
  type FormFieldProps,
  presentationFor,
} from '../FormField/index.ts';
import { type LayoutNode, LayoutParseError, parseLayout } from './parser.ts';
import { resolveLayoutField } from './resolve-layout-field.ts';

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
    <Input.Root>
      <div className={styles.field()}>
        {presentation.showLabel && (
          <FormFieldLabel variant={variant} readonly label={label} path={SchemaEx.createJsonPath(path)} />
        )}
        <div className={styles.fieldControl()}>
          <p className='truncate min-w-0' title={text}>
            {text}
          </p>
        </div>
      </div>
    </Input.Root>
  );
};
