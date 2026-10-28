//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';

import { Marker } from '../../../model/index.ts';

/** Unset: the link draws no marker at that end, stored as no value. */
const NONE_VALUE = 'none';

const MARKER_ITEMS = [
  { value: NONE_VALUE, label: 'None' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'circle', label: 'Circle' },
  { value: 'triangle', label: 'Triangle' },
];

const isMarker = Schema.is(Marker);

/** A link end's marker, with `None` (unset) as an option, since the generic select cannot clear a value. */
export const MarkerField: FormFieldRenderer = ({ jsonPath, label, readonly }) => {
  const field = useFormFieldState('MarkerField', (jsonPath ?? 'ends.end').split('.'));
  const value: unknown = field.getValue();
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <SelectControl
        items={MARKER_ITEMS}
        value={isMarker(value) ? value : NONE_VALUE}
        readonly={readonly}
        onValueChange={(next) => {
          // A pick never blurs, so it commits itself.
          field.onValueChange(Marker.ast, isMarker(next) ? next : undefined);
          field.onBlur();
        }}
      />
    </Form.Field>
  );
};
