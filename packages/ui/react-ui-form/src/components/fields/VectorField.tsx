//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Fieldset from '@dxos/react-ui/Fieldset';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';
import { VECTOR_AXIS_LAYOUT } from '@dxos/ui-types';

import { type FormFieldRenderer, type FormPresentation } from '#types';

import { useFormFieldState } from '../../hooks/index.ts';
import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { toPathSegments } from '../property-walk.ts';
import { useNumberFieldInput } from './NumberField.tsx';
import { type VectorAxis, getVectorAxes } from './vector-axes.ts';

const VECTOR_FIELD_NAME = 'VectorField';

/** The axis labels' column, as wide as the widest label so every row's input starts on one line. */
const VECTOR_COLUMNS = 'max-content minmax(0, 1fr)';

/**
 * A vector (`x`/`y`/`z`, `width`/`height`) as one row per axis, stacked: the axis label, then its number input. A group
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
      {/* The panel is narrow and each row is short, so the label stays beside its input rather than stacking. */}
      <Layout.Container layout='row' gutter='inherit' columns={VECTOR_COLUMNS} gap='sm' fixed>
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

/** The label and input of one axis: two cells of the vector's grid, so every axis shares the label column. */
const VectorAxisRow = ({ axis, path, readonly, presentation }: VectorAxisRowProps) => {
  const state = useFormFieldState(VECTOR_FIELD_NAME, path);
  const { committed, inputProps } = useNumberFieldInput({ type: axis.type, readonly, ...state }, VECTOR_AXIS_LAYOUT);
  return (
    <>
      {/* The input carries the same name, so the visible label is not announced twice. */}
      <Typography.Text tone='subtle' aria-hidden>
        {axis.label}
      </Typography.Text>
      {presentationFor(presentation).isStatic ? (
        <FormStaticValue value={committed} />
      ) : (
        <Input.Number
          {...inputProps}
          invalid={state.getStatus().status === 'error'}
          aria-label={axis.label}
          data-testid={`vector.${path.join('.')}`}
        />
      )}
    </>
  );
};
