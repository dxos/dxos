//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext, useMemo } from 'react';

import { Form, type FormFieldRenderer, SelectControl } from '@dxos/react-ui-form';

import { type Layer } from '../../model/types.ts';

/** The scene's layers, bottom first, for the layer field. */
export const LayersContext = createContext<readonly Layer[]>([]);

/** The layer an element is on: one of the scene's, listed top first as they stack. */
export const LayerField: FormFieldRenderer = ({ type, label, jsonPath, readonly, getValue, onValueChange, onBlur }) => {
  const layers = useContext(LayersContext);
  const items = useMemo(() => [...layers].reverse().map((layer) => ({ value: layer.id, label: layer.name })), [layers]);
  const value: unknown = getValue();
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <SelectControl
        items={items}
        value={typeof value === 'string' ? value : undefined}
        readonly={readonly}
        onValueChange={(next) => {
          // A choice is a commit: the select never blurs, so it commits itself.
          onValueChange(type, next);
          onBlur();
        }}
      />
    </Form.Field>
  );
};
