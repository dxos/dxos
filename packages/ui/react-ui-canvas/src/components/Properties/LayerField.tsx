//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { createContext, useContext, useMemo } from 'react';

import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';
import * as Layout from '@dxos/react-ui/Layout';

import { type Layer } from '../../model/types.ts';
import { ClassField, StyleClassesContext } from './ClassField.tsx';

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

/**
 * The layer and the style class side by side in one row, rendered at `layer` (`class` is hidden); the class select
 * only while the host offers classes.
 */
export const LayerClassField: FormFieldRenderer = (props) => {
  const styles = useContext(StyleClassesContext);
  const classField = useFormFieldState('LayerClassField', ['class']);
  return (
    <Layout.Container
      layout='row'
      gutter='inherit'
      align='start'
      gap='md'
      columns='repeat(2, minmax(0, 1fr))'
      // The properties panel is narrow, and the two selects fit side by side there, so the row never stacks.
      fixed
    >
      <LayerField {...props} />
      {styles && (
        <ClassField {...classField} type={Schema.String.ast} label='Class' jsonPath='class' readonly={props.readonly} />
      )}
    </Layout.Container>
  );
};
