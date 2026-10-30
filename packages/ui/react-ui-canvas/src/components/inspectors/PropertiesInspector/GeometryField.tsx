//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type FormFieldRenderer, VectorField } from '@dxos/react-ui-form';
import * as Layout from '@dxos/react-ui/Layout';
import { NodeBase } from '@dxos/scene';

/**
 * Centre and size, rendered at `center`: the two stacked vector fields side by side, centre first (`size` is hidden).
 * A form layout annotation on the node schema cannot do this, since a schema layout renders only the fields it names.
 */
export const GeometryField: FormFieldRenderer = (props) => {
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
      <VectorField {...props} type={NodeBase.fields.size.ast} jsonPath={[...base, 'size'].join('.')} label='Size' />
    </Layout.Container>
  );
};
