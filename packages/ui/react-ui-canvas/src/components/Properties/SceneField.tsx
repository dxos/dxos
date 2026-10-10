//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext } from 'react';

import { Form, type FormFieldRenderer, SelectField } from '@dxos/react-ui-form';

import { type SceneOption } from '../../utils/scenes.ts';

/** The scenes a selected scene shape may open, as the panel's host lists them (`sceneOptions`). */
export const SceneOptionsContext = createContext<readonly SceneOption[]>([]);

/** A scene shape's `scene`: which scene of this drawing it opens, so several shapes may open one scene. */
export const SceneField: FormFieldRenderer = (props) => {
  const options = useContext(SceneOptionsContext);
  return (
    <Form.Field path={props.jsonPath} label={props.label} readonly={props.readonly}>
      <SelectField {...props} options={[...options]} />
    </Form.Field>
  );
};
