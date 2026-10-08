//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext, useMemo } from 'react';

import { Form, type FormFieldRenderer, SelectControl } from '@dxos/react-ui-form';

import { type StyleMap } from '../../model/types.ts';

/** The drawing's style classes, for the class field. */
export const StyleClassesContext = createContext<StyleMap>({});

/** The select's value for no class: a select item needs a non-empty value. */
const NO_CLASS = '-';

/** An element's style class: one of the drawing's, or none, leaving only its own style. */
export const ClassField: FormFieldRenderer = ({ type, label, jsonPath, readonly, getValue, onValueChange, onBlur }) => {
  const styles = useContext(StyleClassesContext);
  const items = useMemo(
    () => [
      { value: NO_CLASS, label: 'None' },
      ...Object.values(styles)
        .map((styleClass) => ({ value: styleClass.id, label: styleClass.name }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    ],
    [styles],
  );
  const value: unknown = getValue();
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <SelectControl
        items={items}
        value={typeof value === 'string' ? value : NO_CLASS}
        readonly={readonly}
        onValueChange={(next) => {
          // A choice is a commit: the select never blurs, so it commits itself.
          onValueChange(type, next === NO_CLASS ? undefined : next);
          onBlur();
        }}
      />
    </Form.Field>
  );
};
