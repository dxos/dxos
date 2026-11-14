//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as String from 'effect/String';
import React, { Fragment, useMemo } from 'react';

import { Annotation } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import type * as SchemaAST from '@dxos/effect/SchemaAST';
import * as Field from '@dxos/react-ui/Field';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';

import { type FormPresentation } from '#types';

import { useFormContext, useFormFieldState } from '../hooks/index.ts';
import { FormFieldErrorBoundary } from './field-binding.tsx';
import { FormFieldRow } from './FormField.tsx';
import { FormFieldDispatch } from './FormFieldDispatch.tsx';
import { type LayoutGrid, type LayoutNode, LayoutParseError, gridTracks, parseLayout } from './layout/parser.ts';
import { resolveLayoutField } from './layout/resolve-layout-field.ts';
import { type FormFieldDispatchProps } from './resolve-field.ts';

const FORM_LAYOUT_NAME = 'Form.Layout';

export type FormLayoutProps = {
  /** Template in the FormLayout DSL (`<grid cols=…><field name=… span=…/></grid>`); else the schema's annotation. */
  template?: string;
  /** The named layout in `FormLayoutAnnotation` when there is no `template`; `'default'` by default. */
  name?: string;
  schema: Schema.Codec<AnyProperties, any>;
} & Pick<FormFieldDispatchProps, 'path' | 'readonly' | 'layout' | 'projection' | 'fieldMap' | 'fieldProvider'>;

/**
 * Lays out schema fields by a FormLayout DSL template: a `<grid cols=N>` is a row Container of N tracks, and a
 * `<field span=N>` a cell spanning N of them (Container `span`). Only the fields the template names render; a dotted
 * name drills into a nested struct, and a struct with a `LabelAnnotation` renders as its label, read-only.
 */
export const FormLayout = ({
  schema,
  template,
  name = Annotation.DEFAULT_LAYOUT_NAME,
  path,
  ...props
}: FormLayoutProps) => {
  const annotated = Option.getOrUndefined(Annotation.FormLayoutAnnotation.get(schema));
  const source = template ?? annotated?.[name];
  if (source === undefined) {
    throw new LayoutParseError(
      annotated
        ? `no layout named "${name}" on schema (available: ${Object.keys(annotated).join(', ') || '∅'})`
        : 'no template provided and schema has no FormLayoutAnnotation',
    );
  }

  const tree = useMemo(() => parseLayout(source), [source]);
  return <LayoutNodeView node={tree} schema={schema} basePath={path ?? []} {...props} />;
};

FormLayout.displayName = FORM_LAYOUT_NAME;

type LayoutNodeViewProps = Omit<FormLayoutProps, 'template' | 'name' | 'path'> & {
  node: LayoutNode;
  basePath: (string | number)[];
};

const LayoutNodeView = ({ node, schema, basePath, ...props }: LayoutNodeViewProps) => {
  if (node.kind === 'grid') {
    return (
      <Layout.Container
        layout='row'
        gutter='inherit'
        align={node.header ? undefined : 'start'}
        gap='md'
        columns={gridTracks(node)}
        fixed={node.fixed}
      >
        {node.header && <LayoutHeader grid={node} schema={schema} />}
        {node.children.map((child, index) => (
          <Fragment key={index}>
            <LayoutNodeView
              node={child}
              schema={schema}
              basePath={basePath}
              {...props}
              layout={node.header ? 'inline' : props.layout}
            />
          </Fragment>
        ))}
      </Layout.Container>
    );
  }

  const resolved = resolveLayoutField(schema, node.name);
  if (!resolved) {
    throw new LayoutParseError(`field "${node.name}" not found on schema`);
  }

  const { type, segments, leafName, title, labelType, required } = resolved;
  const path = [...basePath, ...segments];
  return (
    // A cell is its own template root, so a group inside it (a nested object) finds the `content` lines.
    <Layout.Container gutter='none' span={node.span}>
      <FormFieldErrorBoundary path={path}>
        {labelType ? (
          <LabelField
            schema={Schema.make(labelType)}
            label={title ?? String.capitalize(leafName)}
            path={path}
            layout={props.layout}
          />
        ) : (
          <FormFieldDispatch type={type} name={leafName} label={title} path={path} required={required} {...props} />
        )}
      </FormFieldErrorBoundary>
    </Layout.Container>
  );
};

/** A table cell's own track: without it a cell takes the list's tracks, which `--dx-columns` passes down. */
export const CELL = 'minmax(0, 1fr)';

/** The title of each field a header grid names, a cell per field, in the grid's order. */
export const LayoutHeader = ({ grid, schema }: { grid: LayoutGrid; schema: Schema.Codec<AnyProperties, any> }) =>
  grid.children.map((child, index) => {
    const resolved = child.kind === 'field' ? resolveLayoutField(schema, child.name) : undefined;
    return (
      <Layout.Container key={index} gutter='none' columns={CELL} span={child.kind === 'field' ? child.span : undefined}>
        <Field.Header>
          <Typography.Text truncate>
            {resolved ? (resolved.title ?? String.capitalize(resolved.leafName)) : ''}
          </Typography.Text>
        </Field.Header>
      </Layout.Container>
    );
  });

/**
 * The grid of fields an array's item type lays out by, which makes each item a row of cells in the list's tracks; a
 * header grid names the columns once above the rows.
 */
export const rowLayout = (type: SchemaAST.AST, name = Annotation.DEFAULT_LAYOUT_NAME): LayoutGrid | undefined => {
  const source = Option.getOrUndefined(Annotation.FormLayoutAnnotation.getFromAst(type))?.[name];
  const grid = source === undefined ? undefined : parseLayout(source);
  return grid?.children.every((child) => child.kind === 'field') ? grid : undefined;
};

type LabelFieldProps = {
  schema: Schema.Schema<any>;
  label: string;
  path: (string | number)[];
  layout?: FormPresentation;
};

/** A nested struct value as its computed label (`LabelAnnotation`), read-only; an empty value renders nothing. */
const LabelField = ({ schema, label, path, layout }: LabelFieldProps) => {
  const { getValue } = useFormFieldState(FORM_LAYOUT_NAME, path);
  const value = getValue();
  const text = value == null ? undefined : Annotation.getLabelWithSchema(schema, value);
  if (text == null || text.trim().length === 0) {
    return null;
  }

  return (
    <FormFieldRow label={label} readonly standalone presentation={layout}>
      <Typography.Text truncate>{text}</Typography.Text>
    </FormFieldRow>
  );
};

/** `Form.Layout`: the form's own schema laid out by a template (or the schema's annotation). */
export const FormLayoutController = ({
  schema,
  ...props
}: Omit<FormLayoutProps, 'schema'> & Partial<Pick<FormLayoutProps, 'schema'>>) => {
  const { form, variant: _variant, testId: _testId, ...context } = useFormContext(FORM_LAYOUT_NAME);
  const resolved = schema ?? form.schema;
  return resolved ? <FormLayout schema={resolved} {...context} {...props} /> : null;
};

FormLayoutController.displayName = FORM_LAYOUT_NAME;
