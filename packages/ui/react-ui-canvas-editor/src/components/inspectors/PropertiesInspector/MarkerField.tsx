//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { createContext, useContext } from 'react';

import { MARKER_ITEMS, NO_MARKER } from '@dxos/react-ui-canvas';
import { Form, type FormFieldRenderer, SelectControl, useFormContext, useFormFieldState } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import { Marker } from '@dxos/scene';

const isMarker = Schema.is(Marker);

/** Reverses the selected links; set by the inspector only while the selection is links it may edit. */
export const FlipLinksContext = createContext<(() => void) | undefined>(undefined);

type MarkerControlProps = { path: 'tail' | 'head'; label: string; readonly?: boolean };

/** A link end's marker, with `None` (unset) as an option, since the generic select cannot clear a value. */
const MarkerControl = ({ path, label, readonly }: MarkerControlProps) => {
  const field = useFormFieldState('MarkerField', [path]);
  const value: unknown = field.getValue();
  const onFlip = useContext(FlipLinksContext);
  // Flipping swaps which end is which, so it sits by the end the arrow usually marks.
  const flip = path === 'head' && onFlip && (
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
    <Form.Field path={path} label={label} labelEnd={flip} readonly={readonly}>
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

/**
 * A link's end markers, rendered at `tail` (`head` is hidden): one group of the two side by side, the source's first,
 * as the two ends of the line.
 */
export const EndsField: FormFieldRenderer = ({ jsonPath = 'tail', readonly }) => {
  const { form } = useFormContext('EndsField');
  // The group's open state is the host's, kept where the form keeps every group's.
  const group = form.getOverride([jsonPath]);
  return (
    <Form.FieldSet
      label='Ends'
      collapsible
      nested
      open={group?.open}
      onOpenChange={group?.onOpenChange}
      data-testid='group.ends'
    >
      <Layout.Container
        layout='row'
        gutter='inherit'
        align='start'
        gap='md'
        columns='repeat(2, minmax(0, 1fr))'
        // The properties panel is narrow, and the two selects fit side by side there, so the row never stacks.
        fixed
      >
        <MarkerControl path='tail' label='Start' readonly={readonly} />
        <MarkerControl path='head' label='End' readonly={readonly} />
      </Layout.Container>
    </Form.FieldSet>
  );
};
