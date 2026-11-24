//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import React from 'react';

import { BooleanField, Form, type FormFieldRenderer, useFormFieldState } from '@dxos/react-ui-form';
import { Corners, Stroke } from '@dxos/scene';

export type StyleSwitchProps<T extends string> = {
  /** Where the style value is in the form (`overrides.fill`). */
  path: readonly string[];
  /** The schema of the value a press writes. */
  type: SchemaAST.AST;
  label: string;
  readonly?: boolean;
  /** Whether a value draws; an unset one draws in one dimension and not in the other, so the caller says. */
  isOn: (value: unknown) => boolean;
  /** What a press writes; none clears the field, where unset is what draws. */
  valueFor: (on: boolean) => T | undefined;
  /** Called with the value a press replaces, before it is written. */
  onToggle?: (previous: unknown, on: boolean) => void;
};

/**
 * A switch over a style value that is one of several words (`fill`, `stroke`, `corners`): on while the value draws,
 * and a press writes the word for the other state. The form's own switch, so it reads as any other toggle of the panel.
 */
export const StyleSwitch = <T extends string>({
  path,
  type,
  label,
  readonly,
  isOn,
  valueFor,
  onToggle,
}: StyleSwitchProps<T>) => {
  const field = useFormFieldState('StyleSwitch', [...path]);
  const jsonPath = path.join('.');
  const { indeterminate } = field.getStatus();
  return (
    <Form.Field path={jsonPath} label={label} labelPlacement='beside' readonly={readonly}>
      <BooleanField
        {...field}
        type={Schema.Boolean.ast}
        label={label}
        jsonPath={jsonPath}
        readonly={readonly}
        indeterminate={indeterminate}
        // Elements that disagree show no state, so the first press turns every one of them on.
        getValue={() => !indeterminate && isOn(field.getValue())}
        onValueChange={(_, on) => {
          onToggle?.(field.getValue(), on);
          field.onValueChange(type, valueFor(on));
        }}
      />
    </Form.Field>
  );
};

/** Whether a 3D body draws a value: one it states, other than `none`, since a body draws no edges or rounding unset. */
const stated = (value: unknown) => value !== undefined && value !== 'none';

/** A 3D body's edges, rendered at `overrides.stroke` as a switch: a body draws its edges or none, whatever the stroke. */
export const BorderField3D: FormFieldRenderer = ({ jsonPath, readonly }) => (
  <StyleSwitch<Stroke>
    path={(jsonPath ?? 'overrides.stroke').split('.')}
    type={Stroke.ast}
    label='Border'
    readonly={readonly}
    isOn={stated}
    valueFor={(on) => (on ? 'solid' : 'none')}
  />
);

/** A 3D body's rounded corners, rendered at `overrides.corners` as a switch: a body rounds every corner or none. */
export const RoundedField3D: FormFieldRenderer = ({ jsonPath, readonly }) => (
  <StyleSwitch<Corners>
    path={(jsonPath ?? 'overrides.corners').split('.')}
    type={Corners.ast}
    label='Rounded'
    readonly={readonly}
    isOn={stated}
    valueFor={(on) => (on ? 'all' : 'none')}
  />
);
