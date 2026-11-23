//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext } from 'react';

import { type ViewOption } from '@dxos/react-ui-canvas';
import { Form, type FormFieldRenderer, SelectField } from '@dxos/react-ui-form';

/** The scenes a selected scene shape may open, as the panel's host lists them (`viewOptions`). */
export const ViewOptionsContext = createContext<readonly ViewOption[]>([]);

/** A scene shape's `scene`: which scene of this drawing it opens, so several shapes may open one scene. */
export const ViewField: FormFieldRenderer = (props) => {
  const options = useContext(ViewOptionsContext);
  return (
    <Form.Field path={props.jsonPath} label={props.label} readonly={props.readonly}>
      <SelectField {...props} options={[...options]} />
    </Form.Field>
  );
};
