//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { type ComponentType } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { Form, type FormFieldMap, type FormFieldOverride } from '@dxos/react-ui-form';
import { type LayoutIntent, type Scene } from '@dxos/scene';

import { type PropertyFormProps } from './config.ts';

export type PropertyFormSpec<V extends AnyProperties> = {
  schema: Schema.Codec<V>;
  fields?: FormFieldMap;
  overrides?: Record<string, FormFieldOverride>;
  /** The form's values for an element. */
  values: (element: Scene.Element2D | Scene.Element3D) => V;
  /** The edits a save makes: only the fields that changed. */
  intents: (element: Scene.Element2D | Scene.Element3D, values: V) => LayoutIntent[];
};

/**
 * The Properties section's form over one element, laid out the same in both dimensions: it saves as a field blurs (not
 * on every keystroke), and each save is the intents for the fields that changed.
 */
export const createPropertyForm = <V extends AnyProperties>({
  schema,
  fields,
  overrides,
  values,
  intents,
}: PropertyFormSpec<V>): ComponentType<PropertyFormProps> => {
  const PropertyForm = ({ element, readonly, onIntents }: PropertyFormProps) => (
    <Form.Root
      schema={schema}
      values={values(element)}
      fieldMap={fields}
      fieldOverrides={overrides}
      readonly={readonly}
      autoSave
      commitOn='blur'
      onSave={(next: V) => onIntents(intents(element, next))}
    >
      <Form.Viewport scroll={false}>
        <Form.Content>
          <Form.Fields />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
  PropertyForm.displayName = 'PropertyForm';
  return PropertyForm;
};
