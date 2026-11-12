//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext } from 'react';

import { type LinkRegistry } from '@dxos/react-ui-canvas';
import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';
import { LINK_TYPES, LineLink, type LinkType } from '@dxos/scene';

/**
 * How a link is drawn between its ends, which is its stored `type`: `Straight` runs between them as they are,
 * `Orthogonal` turns at right angles, `Elbow` leaves each port along its normal and joins with one corner, and a
 * curve or spline bends. Named a variant in the panel because that is what it is to the person drawing: the same
 * line, drawn another way.
 */
export const LinkVariantsContext = createContext<LinkRegistry | undefined>(undefined);

export const VariantField: FormFieldRenderer = ({ jsonPath, label, readonly }) => {
  const registry = useContext(LinkVariantsContext);
  const field = useFormFieldState('VariantField', (jsonPath ?? 'type').split('.'));
  const value: unknown = field.getValue();
  const items = LINK_TYPES.flatMap((type) => {
    const def = registry?.[type];
    return def ? [{ value: type, label: def.name }] : [];
  });
  if (items.length === 0) {
    return null;
  }
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <SelectControl
        items={items}
        value={typeof value === 'string' ? value : ''}
        readonly={readonly}
        onValueChange={(next) => {
          const type = LINK_TYPES.find((candidate: LinkType) => candidate === next);
          if (type === undefined) {
            return;
          }
          // A pick never blurs, so it commits itself.
          field.onValueChange(LineLink.fields.type.ast, type);
          field.onBlur();
        }}
      />
    </Form.Field>
  );
};
