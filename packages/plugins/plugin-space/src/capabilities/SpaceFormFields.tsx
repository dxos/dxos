//
// Copyright 2025 DXOS.org
//

// Form-input surfaces. Each consumes the whole surface envelope — the form renderer's own props ride
// alongside `data` — so they are registered without a `props` mapper.

import * as Option from 'effect/Option';
import React, { useCallback } from 'react';

import type * as Surface from '@dxos/app-framework/Surface';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { Database, Obj } from '@dxos/echo';
import { type FormFieldRendererProps, SelectField } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';
import * as Field from '@dxos/react-ui/Field';

import { type TypeInputOptions, getTypeInputOptions } from '../types/SpaceForm.ts';

/** The form renderer's own props ride alongside `data`; `type` comes from the field AST. */
export type SpaceFormFieldProps = Surface.Root.ComponentProps<AppSurface.FormInputData> &
  Omit<FormFieldRendererProps, 'type'>;

export const HueField = ({ data, label, readonly, getValue, onValueChange }: SpaceFormFieldProps) => {
  const ast = data.fieldPropertyAst;
  const handleChange = useCallback((nextHue: string) => ast && onValueChange(ast, nextHue), [ast, onValueChange]);
  const handleReset = useCallback(() => ast && onValueChange(ast, undefined), [ast, onValueChange]);

  if (!ast) {
    return null;
  }

  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <HuePicker disabled={!!readonly} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
    </Field.Root>
  );
};

export const IconField = ({ data, label, readonly, getValue, onValueChange }: SpaceFormFieldProps) => {
  const ast = data.fieldPropertyAst;
  const handleChange = useCallback((nextIcon: string) => ast && onValueChange(ast, nextIcon), [ast, onValueChange]);
  const handleReset = useCallback(() => ast && onValueChange(ast, undefined), [ast, onValueChange]);

  if (!ast) {
    return null;
  }

  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <IconPicker disabled={!!readonly} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
    </Field.Root>
  );
};

export const TypenameField = ({ data, ...inputProps }: SpaceFormFieldProps) => {
  const ast = data.fieldPropertyAst;
  const target = data.target;
  const db = Database.isDatabase(target) ? target : Obj.isObject(target) ? Obj.getDatabase(target) : undefined;
  // The surface filter only matches a field that declares the options, so a miss reads as none.
  const annotation = Option.getOrElse(getTypeInputOptions(data.schema.ast), (): TypeInputOptions => ({
    location: [],
    kind: [],
  }));
  const options = Hooks.useTypeOptions({ db, annotation });

  if (!ast) {
    return null;
  }

  const props: FormFieldRendererProps = { ...inputProps, type: ast };

  // A provided field owns its row, so it carries its own label as the other fields here do.
  return (
    <Field.Root>
      <Field.Label>{inputProps.label}</Field.Label>
      <SelectField {...props} options={options} />
    </Field.Root>
  );
};
