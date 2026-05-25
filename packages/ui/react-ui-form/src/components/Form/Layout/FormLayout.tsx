//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import React, { Fragment, useMemo } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { type SchemaProperty } from '@dxos/effect';

import { getFormProperties } from '../../../util';
import { FormField, type FormFieldProps } from '../FormField';
import { FormFieldErrorBoundary } from '../FormFieldComponent';
import { FormLayoutAnnotation } from './annotation';
import { LayoutParseError, type LayoutNode, parseLayout } from './parser';

const FORM_LAYOUT_NAME = 'Form.Layout';

export type FormLayoutProps = {
  /**
   * Template string in the FormLayout DSL (`<grid cols=…><field name=…/></grid>`).
   * If omitted, the layout is read from the schema's `FormLayoutAnnotation`.
   */
  template?: string;
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
 */
export const FormLayout = ({ schema, template, path, readonly, layout, projection, ...props }: FormLayoutProps) => {
  const annotated = Option.getOrUndefined(FormLayoutAnnotation.get(schema));
  const source = template ?? annotated;
  if (source === undefined) {
    throw new LayoutParseError(`no template provided and schema has no FormLayoutAnnotation`);
  }

  const tree = useMemo(() => parseLayout(source), [source]);
  const properties = useMemo(() => {
    const map = new Map<string, SchemaProperty>();
    for (const property of getFormProperties(schema.ast)) {
      map.set(String(property.name), property);
    }
    return map;
  }, [schema]);

  return (
    <RenderNode
      node={tree}
      properties={properties}
      basePath={path ?? []}
      readonly={readonly}
      layout={layout}
      projection={projection}
      {...props}
    />
  );
};

FormLayout.displayName = FORM_LAYOUT_NAME;

type RenderNodeProps = Omit<FormLayoutProps, 'schema' | 'template' | 'path'> & {
  node: LayoutNode;
  properties: Map<string, SchemaProperty>;
  basePath: (string | number)[];
};

const RenderNode = ({ node, properties, basePath, ...props }: RenderNodeProps) => {
  if (node.kind === 'grid') {
    return (
      <div className='grid gap-form-gap' style={{ gridTemplateColumns: `repeat(${node.cols}, minmax(0, 1fr))` }}>
        {node.children.map((child, index) => (
          <Fragment key={index}>
            <RenderNode node={child} properties={properties} basePath={basePath} {...props} />
          </Fragment>
        ))}
      </div>
    );
  }

  const property = properties.get(node.name);
  if (!property) {
    throw new LayoutParseError(`field "${node.name}" not found on schema`);
  }
  const path = [...basePath, node.name];
  const span = node.span ? { gridColumn: `span ${node.span} / span ${node.span}` } : undefined;
  return (
    <div style={span}>
      <FormFieldErrorBoundary path={path}>
        <FormField type={property.type} name={node.name} path={path} {...props} />
      </FormFieldErrorBoundary>
    </div>
  );
};
