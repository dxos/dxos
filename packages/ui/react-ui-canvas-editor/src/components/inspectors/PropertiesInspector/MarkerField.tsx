//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { createContext, useContext } from 'react';

import { MARKER_ITEMS, NO_MARKER } from '@dxos/react-ui-canvas';
import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import { Marker } from '@dxos/scene';

const isMarker = Schema.is(Marker);

/** Reverses the selected links; set by the inspector only while the selection is links it may edit. */
export const FlipLinksContext = createContext<(() => void) | undefined>(undefined);

/** A link end's marker, with `None` (unset) as an option, since the generic select cannot clear a value. */
export const MarkerField: FormFieldRenderer = ({ jsonPath, label, readonly }) => {
  const field = useFormFieldState('MarkerField', (jsonPath ?? 'ends.end').split('.'));
  const value: unknown = field.getValue();
  const onFlip = useContext(FlipLinksContext);
  // Flipping swaps which end is which, so it sits by the end the arrow usually marks.
  const flip = jsonPath === 'ends.end' && onFlip && (
    <Button.Root
      variant='ghost'
      iconOnly
      icon='ph--arrows-left-right--regular'
      label='Flip direction'
      disabled={readonly}
      data-testid='properties-flip'
      onClick={onFlip}
    />
  );
  return (
    <Form.Field path={jsonPath} label={label} labelEnd={flip} readonly={readonly}>
      <SelectControl
        items={[...MARKER_ITEMS]}
        value={isMarker(value) ? value : NO_MARKER}
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
