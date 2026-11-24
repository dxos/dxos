//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as String from 'effect/String';
import React from 'react';

import { Annotation } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import type * as SchemaAST from '@dxos/effect/SchemaAST';
import * as Field from '@dxos/react-ui/Field';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';

import { type LayoutGrid, parseLayout } from './parser.ts';
import { resolveLayoutField } from './resolve-layout-field.ts';

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
