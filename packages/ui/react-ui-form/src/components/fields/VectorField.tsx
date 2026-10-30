//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Fieldset from '@dxos/react-ui/Fieldset';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import { VECTOR_AXIS_LAYOUT } from '@dxos/ui-types';

import { type FormFieldRenderer, type FormPresentation } from '#types';

import { useFormFieldState } from '../../hooks/index.ts';
import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { toPathSegments } from '../property-walk.ts';
import { useNumberFieldInput } from './NumberField.tsx';
import { type VectorAxis, getVectorAxes } from './vector-axes.ts';

const VECTOR_FIELD_NAME = 'VectorField';

/**
 * A vector (`x`/`y`/`z`, or a size's width and height read as `x`/`y`) as one input per axis, stacked, each axis's letter
 * a start adornment inside its input. A group
 * named by the property's label rather than a `Form.Field` row, since a field's label would name all its inputs at once.
 * Each axis binds its own path, so an edit across a selection writes only the axis edited. Selected by the schema's
 * `VectorAnnotation`, or by a `fieldMap` entry.
 */
export const VectorField: FormFieldRenderer = ({ type, jsonPath, label, readonly, presentation }) => {
  const axes = useMemo(() => getVectorAxes(type), [type]);
  const path = useMemo(() => toPathSegments(jsonPath), [jsonPath]);
  const { showLabel } = presentationFor(presentation);
  return (
    <Fieldset.Root data-testid={jsonPath === undefined ? undefined : `vector.${jsonPath}`}>
      {showLabel && label && <Fieldset.Legend>{label}</Fieldset.Legend>}
      <Layout.Container layout='stack' gutter='inherit' gap='sm'>
        {axes.map((axis) => (
          <VectorAxisRow
            key={axis.name}
            axis={axis}
            path={[...path, axis.name]}
            readonly={readonly}
            presentation={presentation}
          />
        ))}
      </Layout.Container>
    </Fieldset.Root>
  );
};

type VectorAxisRowProps = {
  axis: VectorAxis;
  path: (string | number)[];
  readonly?: boolean;
  presentation?: FormPresentation;
};

/** One axis's input, its letter inside the input's start. */
const VectorAxisRow = ({ axis, path, readonly, presentation }: VectorAxisRowProps) => {
  const state = useFormFieldState(VECTOR_FIELD_NAME, path);
  const { committed, inputProps } = useNumberFieldInput({ type: axis.type, readonly, ...state }, VECTOR_AXIS_LAYOUT);
  return presentationFor(presentation).isStatic ? (
    <FormStaticValue value={`${axis.label} ${committed ?? ''}`} />
  ) : (
    <Input.Number
      {...inputProps}
      prefix={axis.label}
      invalid={state.getStatus().status === 'error'}
      aria-label={axis.label}
      data-testid={`vector.${path.join('.')}`}
    />
  );
};
