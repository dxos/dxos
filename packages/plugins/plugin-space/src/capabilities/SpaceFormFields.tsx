//
// Copyright 2025 DXOS.org
//

// Form-input surfaces. Each consumes the whole surface envelope — the form renderer's own props ride
// alongside `data` — so they are registered without a `props` mapper.

import * as Option from 'effect/Option';
import React, { useCallback } from 'react';

import { type Surface } from '@dxos/app-framework/ui';
import { type AppSurface, useTypeOptions } from '@dxos/app-toolkit/ui';
import { Database, Obj } from '@dxos/echo';
import { Next } from '@dxos/react-ui';
import { type FormFieldRendererProps, SelectField } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';

import { type TypeInputOptions, getTypeInputOptions } from '../types/SpaceForm.ts';

/** The form renderer's own props ride alongside `data`; `type` comes from the field AST. */
export type SpaceFormFieldProps = Surface.ComponentProps<AppSurface.FormInputData> &
  Omit<FormFieldRendererProps, 'type'>;

export const HueField = ({ data, label, readonly, getValue, onValueChange }: SpaceFormFieldProps) => {
  const ast = data.fieldPropertyAst;
  const handleChange = useCallback((nextHue: string) => ast && onValueChange(ast, nextHue), [ast, onValueChange]);
  const handleReset = useCallback(() => ast && onValueChange(ast, undefined), [ast, onValueChange]);

  if (!ast) {
    return null;
  }

  return (
    <Next.Field.Root>
      <Next.Field.Label>{label}</Next.Field.Label>
      <HuePicker disabled={!!readonly} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
    </Next.Field.Root>
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
    <Next.Field.Root>
      <Next.Field.Label>{label}</Next.Field.Label>
      <IconPicker disabled={!!readonly} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
    </Next.Field.Root>
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
  const options = useTypeOptions({ db, annotation });

  if (!ast) {
    return null;
  }

  const props: FormFieldRendererProps = { ...inputProps, type: ast };

  // A provided field owns its row, so it carries its own label as the other fields here do.
  return (
    <Next.Field.Root>
      <Next.Field.Label>{inputProps.label}</Next.Field.Label>
      <SelectField {...props} options={options} />
    </Next.Field.Root>
  );
};
