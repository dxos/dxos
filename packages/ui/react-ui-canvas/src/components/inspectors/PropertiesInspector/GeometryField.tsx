//
// Copyright 2026 DXOS.org
//

import type * as SchemaAST from 'effect/SchemaAST';
import React from 'react';

import { type FormFieldRenderer, VectorField } from '@dxos/react-ui-form';
import * as Layout from '@dxos/react-ui/Layout';
import { NodeBase } from '@dxos/scene';

/** The vector drawn beside the centre: 2D's size, 3D's scale. */
export type GeometryCompanion = { name: string; label: string; type: SchemaAST.AST };

/**
 * Centre and a companion vector, rendered at `center`: the two stacked vector fields side by side, centre first (the
 * companion's own field is hidden). Shared by 2D (size) and 3D (scale). A form layout annotation cannot do this, since
 * a schema layout renders only the fields it names.
 */
export const makeGeometryField =
  (companion: GeometryCompanion): FormFieldRenderer =>
  (props) => {
    const base = (props.jsonPath ?? 'center').split('.').slice(0, -1);
    return (
      <Layout.Container
        layout='row'
        gutter='inherit'
        align='start'
        gap='md'
        columns='repeat(2, minmax(0, 1fr))'
        // The properties panel is narrow, and the two vectors fit side by side there, so the row never stacks.
        fixed
      >
        <VectorField {...props} label='Center' />
        <VectorField
          {...props}
          type={companion.type}
          jsonPath={[...base, companion.name].join('.')}
          label={companion.label}
        />
      </Layout.Container>
    );
  };

/** 2D: centre and size side by side. */
export const GeometryField = makeGeometryField({ name: 'size', label: 'Size', type: NodeBase.fields.size.ast });
