//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';
import { POLYGON_FITS, type PolygonFit, PolygonParams } from '@dxos/scene';

const FIT_LABELS: Record<PolygonFit, string> = { frame: 'Frame', circle: 'Circle' };

const FIT_ITEMS = POLYGON_FITS.map((value) => ({ value, label: FIT_LABELS[value] }));

/** How a polygon sits in its frame; unset shows `Frame`, the fit it draws with, and picking it stores no value. */
export const PolygonFitField: FormFieldRenderer = ({ jsonPath, label, readonly }) => {
  const field = useFormFieldState('PolygonFitField', (jsonPath ?? 'params.fit').split('.'));
  const value: unknown = field.getValue();
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <SelectControl
        items={FIT_ITEMS}
        value={typeof value === 'string' ? value : 'frame'}
        readonly={readonly}
        onValueChange={(next) => {
          const fit = POLYGON_FITS.find((fit) => fit === next);
          // A pick never blurs, so it commits itself.
          field.onValueChange(PolygonParams.fields.fit.ast, fit === 'frame' ? undefined : fit);
          field.onBlur();
        }}
      />
    </Form.Field>
  );
};
